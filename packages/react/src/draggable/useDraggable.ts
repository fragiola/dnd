// The draggable hook (D6): the lower layer `Draggable` is built on. It registers the element its
// `props.ref` receives in that element's drag space (no provider, D4), follows option changes
// with `update` (never a re-register; inline callbacks are read when called), unregisters when
// the element goes, and re-renders only when the draggable's own state changes (D8).
import {
    type DraggableOptions,
    type DraggableState,
    registerDraggable,
} from "@fragiola/dnd/draggable";
import * as React from "react";
import {
    createSlot,
    optionsChanged,
    useSlotState,
} from "../utils/useCoreState";
import { addOwner, type HandleOwner, handleIn } from "./handles";

/** Options of {@link useDraggable}: the core's, without `handle` (a `DragHandle` sets it). */
export interface UseDraggableOptions extends Omit<DraggableOptions, "handle"> {
    /** the id of the element describing how to drag it (`aria-describedby`): the app's text */
    readonly describedBy?: string | undefined;
}

/** The props {@link useDraggable} puts on the draggable's element. */
export interface DraggableHookProps {
    readonly ref: React.RefCallback<HTMLElement>;
    readonly "data-dnd-part": "draggable";
    readonly "data-dnd-id": string;
    readonly "data-dnd-dragging"?: "" | undefined;
    readonly "data-dnd-disabled"?: "" | undefined;
    readonly "aria-disabled"?: true | undefined;
    readonly "aria-describedby"?: string | undefined;
}

/** What {@link useDraggable} returns: the state, and the props to spread onto the element. */
export interface UseDraggableResult {
    readonly state: DraggableState;
    readonly props: DraggableHookProps;
}

/** The options compared on each render: a change is an `update`. */
const COMPARED = [
    "id",
    "type",
    "data",
    "scope",
    "space",
    "disabled",
    "activation",
    "keyboard",
    "autoScroll",
    "collision",
    "translate",
] as const satisfies readonly (keyof UseDraggableOptions)[];

/** The core's options: the latest values, the latest callbacks, and the handle. */
function coreOptions(
    options: UseDraggableOptions,
    latest: { readonly current: UseDraggableOptions },
    handle: HTMLElement | null,
): DraggableOptions {
    return {
        ...options,
        handle,
        onDragStart: (event) => latest.current.onDragStart?.(event),
        onDragMove: (event) => latest.current.onDragMove?.(event),
        onDragEnd: (event) => latest.current.onDragEnd?.(event),
        onDragCancel: (event) => latest.current.onDragCancel?.(event),
    };
}

/**
 * Makes the element its `props` go on draggable, by pointer and keyboard, with no provider:
 * spread `props` onto one element.
 */
export function useDraggable(options: UseDraggableOptions): UseDraggableResult {
    const latest = React.useRef(options);
    latest.current = options;
    const [live] = React.useState(() => ({
        slot: createSlot<DraggableState>(() => ({
            dragging: false,
            disabled: !!latest.current.disabled,
        })),
        registration: undefined as
            | ReturnType<typeof registerDraggable>
            | undefined,
        applied: options,
        handle: null as HTMLElement | null,
    }));

    const ref = React.useCallback(
        (element: HTMLElement | null) => {
            if (!element) return;
            live.handle = handleIn(element);
            live.applied = latest.current;
            const registration = registerDraggable(
                element,
                coreOptions(latest.current, latest, live.handle),
            );
            live.registration = registration;
            const detach = live.slot.attach(registration);
            const owner: HandleOwner = {
                setHandle(handle) {
                    if (live.handle === handle) return;
                    live.handle = handle;
                    registration.update(
                        coreOptions(live.applied, latest, handle),
                    );
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
        [live],
    );

    // an option change is an update, applied before the browser paints or handles an event
    React.useLayoutEffect(() => {
        const next = latest.current;
        if (!optionsChanged(live.applied, next, COMPARED)) return;
        live.applied = next;
        live.registration?.update(coreOptions(next, latest, live.handle));
    });

    const state = useSlotState(live.slot);
    return {
        state,
        props: {
            ref,
            "data-dnd-part": "draggable",
            "data-dnd-id": String(options.id),
            "data-dnd-dragging": state.dragging ? "" : undefined,
            "data-dnd-disabled": state.disabled ? "" : undefined,
            "aria-disabled": state.disabled ? true : undefined,
            "aria-describedby": options.describedBy,
        },
    };
}
