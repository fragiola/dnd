// The droppable hook (D6): the lower layer `Droppable` is built on. It registers the element its
// `props.ref` receives in that element's drag space (no provider, D4), follows option changes
// with `update` (never a re-register; inline callbacks are read when called), unregisters when
// the element goes, and re-renders only when the droppable's own state changes: on enter, leave
// and drop, never while a drag moves inside it (D8).
import {
    type DroppableOptions,
    type DroppableState,
    registerDroppable,
} from "@fragiola/dnd/droppable";
import * as React from "react";
import {
    createSlot,
    optionsChanged,
    useSlotState,
} from "../utils/useCoreState";

/** Options of {@link useDroppable}: the core's. */
export interface UseDroppableOptions extends DroppableOptions {}

/** The props {@link useDroppable} puts on the droppable's element. */
export interface DroppableHookProps {
    readonly ref: React.RefCallback<HTMLElement>;
    readonly "data-dnd-part": "droppable";
    readonly "data-dnd-id": string;
    readonly "data-dnd-over"?: "" | undefined;
    readonly "data-dnd-refused"?: "" | undefined;
    readonly "data-dnd-active"?: "" | undefined;
    readonly "data-dnd-disabled"?: "" | undefined;
    readonly "aria-disabled"?: true | undefined;
}

/** What {@link useDroppable} returns: the state, and the props to spread onto the element. */
export interface UseDroppableResult {
    readonly state: DroppableState;
    readonly props: DroppableHookProps;
}

/** The options compared on each render: a change is an `update`. */
const COMPARED = [
    "id",
    "data",
    "scope",
    "space",
    "accepts",
    "disabled",
] as const satisfies readonly (keyof UseDroppableOptions)[];

/** The core's options: the latest values and the latest callbacks. */
function coreOptions(
    options: UseDroppableOptions,
    latest: { readonly current: UseDroppableOptions },
): DroppableOptions {
    return {
        id: options.id,
        data: options.data,
        scope: options.scope,
        space: options.space,
        accepts: options.accepts,
        disabled: options.disabled,
        onDragEnter: (event) => latest.current.onDragEnter?.(event),
        onDragOver: (event) => latest.current.onDragOver?.(event),
        onDragLeave: (event) => latest.current.onDragLeave?.(event),
        onDrop: (event) => latest.current.onDrop?.(event),
    };
}

/**
 * Makes the element its `props` go on a drop target, with no provider: spread `props` onto one
 * element.
 */
export function useDroppable(options: UseDroppableOptions): UseDroppableResult {
    const latest = React.useRef(options);
    latest.current = options;
    const [live] = React.useState(() => ({
        slot: createSlot<DroppableState>(() => ({
            over: false,
            active: false,
            refused: false,
            disabled: !!latest.current.disabled,
        })),
        registration: undefined as
            | ReturnType<typeof registerDroppable>
            | undefined,
        applied: options,
    }));

    const ref = React.useCallback(
        (element: HTMLElement | null) => {
            if (!element) return;
            live.applied = latest.current;
            const registration = registerDroppable(
                element,
                coreOptions(latest.current, latest),
            );
            live.registration = registration;
            const detach = live.slot.attach(registration);
            return () => {
                registration.unregister();
                detach();
                if (live.registration === registration)
                    live.registration = undefined;
            };
        },
        [live],
    );

    // an option change is an update, applied before the browser paints or handles an event
    React.useLayoutEffect(() => {
        const next = latest.current;
        if (!optionsChanged(live.applied, next, COMPARED)) return;
        live.applied = next;
        live.registration?.update(coreOptions(next, latest));
    });

    const state = useSlotState(live.slot);
    return {
        state,
        props: {
            ref,
            "data-dnd-part": "droppable",
            "data-dnd-id": String(options.id),
            "data-dnd-over": state.over ? "" : undefined,
            "data-dnd-refused": state.refused ? "" : undefined,
            "data-dnd-active": state.active ? "" : undefined,
            "data-dnd-disabled": state.disabled ? "" : undefined,
            "aria-disabled": state.disabled ? true : undefined,
        },
    };
}
