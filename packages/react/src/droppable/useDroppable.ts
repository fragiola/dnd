// The droppable hook (D6): the lower layer `Droppable` is built on. It registers the element its
// `props.ref` receives in that element's drag space (no provider, D4), follows option changes
// with `update` (never a re-register; inline callbacks are read when called), unregisters when
// the element goes, and re-renders only when the droppable's own state changes: on enter, leave
// and drop, never while a drag moves inside it (D8). The shared `usePart` does it all.

import { connectPart, droppableBinding } from "@fragiola/dnd/adapter";
import {
    type DroppableOptions,
    type DroppableState,
    registerDroppable,
} from "@fragiola/dnd/droppable";
import type * as React from "react";
import { type PartBinding, usePart } from "../utils/use-part";

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

/** How the hook drives the core's droppable. */
const BINDING: PartBinding<UseDroppableOptions, DroppableState> = {
    ...droppableBinding,
    connect: (element, options, slot) =>
        connectPart(element, registerDroppable, options, slot),
};

/**
 * Makes the element its `props` go on a drop target, with no provider: spread `props` onto one
 * element.
 */
export function useDroppable(options: UseDroppableOptions): UseDroppableResult {
    const { state, ref } = usePart(BINDING, options);
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
