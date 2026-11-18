// The lower half of every registered part's hook (`useDraggable`, `useDroppable`, `useSortable`,
// `useSortableGroup`, `useSwappable`): it connects the element its `ref` receives to the core
// (`connectPart`, or `connectSource` with its `DragHandle`, from `@fragiola/dnd/adapter`: the
// registration in that element's drag space, no provider, D4), follows option changes with
// `update` (never a re-register; inline callbacks are read when called), disconnects when the
// element goes, and re-renders only when the part's own state changes (D8). What is compared,
// which callbacks and the state before mount are the core's bindings.
import {
    type Connection,
    createSlot,
    optionsChanged,
    type StateSlot,
    withLatestCallbacks,
} from "@fragiola/dnd/adapter";
import * as React from "react";
import { useSlotState } from "./useCoreState";

/** How {@link usePart} drives one capability's core registration. */
export interface PartBinding<Options extends object, State extends object> {
    /** connects the element: `connectPart` or `connectSource` over the capability's `register*` */
    readonly connect: (
        element: HTMLElement,
        options: () => Options,
        slot: StateSlot<State>,
    ) => Connection;
    /** the options compared on each render: a change is an `update` */
    readonly compared: readonly (keyof Options)[];
    /** the callbacks, read from the latest render when the core calls them */
    readonly callbacks: readonly (keyof Options)[];
    /** the state before mount and on the server */
    readonly rest: (options: Options) => State;
}

/** A part's state and the ref that registers its element. */
export function usePart<Options extends object, State extends object>(
    binding: PartBinding<Options, State>,
    options: Options,
): { readonly state: State; readonly ref: React.RefCallback<HTMLElement> } {
    const latest = React.useRef(options);
    latest.current = options;
    const [live] = React.useState(() => ({
        slot: createSlot<State>(() => binding.rest(latest.current)),
        connection: undefined as Connection | undefined,
        applied: options,
    }));

    const ref = React.useCallback(
        (element: HTMLElement | null) => {
            if (!element) return;
            live.applied = latest.current;
            const connection = binding.connect(
                element,
                () =>
                    withLatestCallbacks(
                        live.applied,
                        binding.callbacks,
                        () => latest.current,
                    ),
                live.slot,
            );
            live.connection = connection;
            return () => {
                connection.disconnect();
                if (live.connection === connection) live.connection = undefined;
            };
        },
        [live, binding],
    );

    // an option change is an update, applied before the browser paints or handles an event
    React.useLayoutEffect(() => {
        const next = latest.current;
        if (!optionsChanged(live.applied, next, binding.compared)) return;
        live.applied = next;
        live.connection?.update();
    });

    return { state: useSlotState(live.slot), ref };
}
