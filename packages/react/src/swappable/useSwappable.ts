// The swappable item hook (S3, D6): the lower layer `Swappable` is built on, over the shared
// `usePart`. It re-renders at a swap's start and end only: the preview (the target's shift and
// `data-dnd-swap-target`) is written by the core, never rendered (D8).

import { connectSource, swappableBinding } from "@fragiola/dnd/adapter";
import {
    registerSwappable,
    type SwappableOptions,
    type SwappableState,
} from "@fragiola/dnd/swappable";
import type * as React from "react";
import { type PartBinding, usePart } from "../utils/use-part";

/** Options of {@link useSwappable}: the core's, without `handle` (a `DragHandle` sets it). */
export interface UseSwappableOptions extends Omit<SwappableOptions, "handle"> {
    /** the id of the element describing how to swap it (`aria-describedby`): the app's text */
    readonly describedBy?: string | undefined;
}

/** The props {@link useSwappable} puts on the item's element. */
export interface SwappableHookProps {
    readonly ref: React.RefCallback<HTMLElement>;
    readonly "data-dnd-part": "swappable";
    readonly "data-dnd-id": string;
    readonly "data-dnd-dragging"?: "" | undefined;
    readonly "data-dnd-disabled"?: "" | undefined;
    readonly "aria-disabled"?: true | undefined;
    readonly "aria-describedby"?: string | undefined;
}

/** What {@link useSwappable} returns: the state, and the props to spread onto the element. */
export interface UseSwappableResult {
    readonly state: SwappableState;
    readonly props: SwappableHookProps;
}

/** How the hook drives the core's swappable. */
const BINDING: PartBinding<UseSwappableOptions, SwappableState> = {
    ...swappableBinding,
    connect: (element, options, slot) =>
        connectSource(element, registerSwappable, options, slot),
};

/**
 * Makes the element its `props` go on an item that swaps with the items of its `group` (and of
 * the groups it accepts), by pointer and keyboard, with no provider: spread `props` onto one
 * element.
 */
export function useSwappable(options: UseSwappableOptions): UseSwappableResult {
    const { state, ref } = usePart(BINDING, options);
    return {
        state,
        props: {
            ref,
            "data-dnd-part": "swappable",
            "data-dnd-id": String(options.id),
            "data-dnd-dragging": state.dragging ? "" : undefined,
            "data-dnd-disabled": state.disabled ? "" : undefined,
            "aria-disabled": state.disabled ? true : undefined,
            "aria-describedby": options.describedBy,
        },
    };
}
