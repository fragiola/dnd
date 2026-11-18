// The draggable hook (D6): the lower layer `Draggable` is built on. It registers the element its
// `props.ref` receives in that element's drag space (no provider, D4), follows option changes
// with `update` (never a re-register; inline callbacks are read when called), unregisters when
// the element goes, and re-renders only when the draggable's own state changes (D8): the shared
// `usePart` does it all.

import { connectSource, draggableBinding } from "@fragiola/dnd/adapter";
import {
    type DraggableOptions,
    type DraggableState,
    registerDraggable,
} from "@fragiola/dnd/draggable";
import type * as React from "react";
import { type PartBinding, usePart } from "../utils/use-part";

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

/** How the hook drives the core's draggable. */
const BINDING: PartBinding<UseDraggableOptions, DraggableState> = {
    ...draggableBinding,
    connect: (element, options, slot) =>
        connectSource(element, registerDraggable, options, slot),
};

/**
 * Makes the element its `props` go on draggable, by pointer and keyboard, with no provider:
 * spread `props` onto one element.
 */
export function useDraggable(options: UseDraggableOptions): UseDraggableResult {
    const { state, ref } = usePart(BINDING, options);
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
