// The lower half of every drag source's hook (`useDraggable`, `useSortable`, `useSwappable`): it
// registers the element its `ref` receives in that element's drag space (no provider, D4), with
// the `DragHandle` found inside it (through the DOM), follows option changes with `update` (never
// a re-register; inline callbacks are read when called), unregisters when the element goes, and
// re-renders only when the source's own state changes (D8).
import type { DraggableState, Registration } from "@fragiola/dnd";
import * as React from "react";
import { addOwner, type HandleOwner, handleIn } from "./handles";
import { createSlot, optionsChanged, useSlotState } from "./useCoreState";

/** The handle a source's core options carry. */
interface Handled {
    readonly handle?: HTMLElement | null;
}

/** How {@link useSource} drives one capability's core registration. */
export interface SourceBinding<Options, State> {
    readonly register: (
        element: HTMLElement,
        options: Options & Handled,
    ) => Registration<Options & Handled, State>;
    /** the options compared on each render: a change is an `update` */
    readonly compared: readonly (keyof Options)[];
    /** the callbacks, read from the latest render when the core calls them */
    readonly callbacks: readonly (keyof Options)[];
    /** the state before mount and on the server */
    readonly rest: (options: Options) => State;
}

/** A source's state and the ref that registers its element. */
export function useSource<Options extends object, State extends DraggableState>(
    binding: SourceBinding<Options, State>,
    options: Options,
): { readonly state: State; readonly ref: React.RefCallback<HTMLElement> } {
    const latest = React.useRef(options);
    latest.current = options;
    const [live] = React.useState(() => ({
        slot: createSlot<State>(() => binding.rest(latest.current)),
        registration: undefined as
            | Registration<Options & Handled, State>
            | undefined,
        applied: options,
        handle: null as HTMLElement | null,
    }));
    /** the core's options: the latest values, the latest callbacks, and the handle */
    const core = React.useCallback(
        (values: Options, handle: HTMLElement | null): Options & Handled => {
            const next: Record<string, unknown> = { ...values, handle };
            for (const name of binding.callbacks)
                next[name as string] = (event: unknown) =>
                    (
                        latest.current[name] as
                            | ((event: unknown) => void)
                            | undefined
                    )?.(event);
            return next as Options & Handled;
        },
        [binding],
    );

    const ref = React.useCallback(
        (element: HTMLElement | null) => {
            if (!element) return;
            live.handle = handleIn(element);
            live.applied = latest.current;
            const registration = binding.register(
                element,
                core(latest.current, live.handle),
            );
            live.registration = registration;
            const detach = live.slot.attach(registration);
            const owner: HandleOwner = {
                setHandle(handle) {
                    if (live.handle === handle) return;
                    live.handle = handle;
                    registration.update(core(live.applied, handle));
                },
                source: registration,
            };
            const removeOwner = addOwner(element, owner);
            return () => {
                removeOwner();
                registration.unregister();
                detach();
                if (live.registration === registration)
                    live.registration = undefined;
            };
        },
        [live, binding, core],
    );

    // an option change is an update, applied before the browser paints or handles an event
    React.useLayoutEffect(() => {
        const next = latest.current;
        if (!optionsChanged(live.applied, next, binding.compared)) return;
        live.applied = next;
        live.registration?.update(core(next, live.handle));
    });

    return { state: useSlotState(live.slot), ref };
}
