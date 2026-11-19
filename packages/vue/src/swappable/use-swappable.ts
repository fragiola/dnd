// The swappable item composable (S3, D6): the lower layer `Swappable` is built on, over the
// shared `usePart`. It triggers its readers at a swap's start and end only: the preview (the
// target's shift and `data-dnd-swap-target`) is written by the core, never rendered (D8).

import { connectSource, swappableBinding } from "@fragiola/dnd/adapter";
import {
    registerSwappable,
    type SwappableOptions,
    type SwappableState,
} from "@fragiola/dnd/swappable";
import {
    type ComputedRef,
    computed,
    type MaybeRefOrGetter,
    toValue,
} from "vue";
import type { ElementRef } from "../utils/element-ref";
import { type PartBinding, usePart } from "../utils/use-part";

/** Options of {@link useSwappable}: the core's, without `handle` (a `DragHandle` sets it). */
export interface UseSwappableOptions extends Omit<SwappableOptions, "handle"> {
    /** the id of the element describing how to swap it (`aria-describedby`): the app's text */
    readonly describedBy?: string | undefined;
}

/** What {@link useSwappable} puts on the item's element (`v-bind="props"`). */
export interface SwappableBindings {
    readonly ref: ElementRef;
    readonly "data-dnd-part": "swappable";
    readonly "data-dnd-id": string;
    readonly "data-dnd-dragging"?: "" | undefined;
    readonly "data-dnd-disabled"?: "" | undefined;
    readonly "aria-disabled"?: true | undefined;
    readonly "aria-describedby"?: string | undefined;
}

/** What {@link useSwappable} returns: the state, and the props to bind on the element. */
export interface UseSwappableResult {
    readonly state: ComputedRef<SwappableState>;
    readonly props: ComputedRef<SwappableBindings>;
}

/** How the composable drives the core's swappable. */
const BINDING: PartBinding<UseSwappableOptions, SwappableState> = {
    ...swappableBinding,
    connect: (element, options, slot) =>
        connectSource(element, registerSwappable, options, slot),
};

/**
 * Makes the element its `props` go on an item that swaps with the items of its `group` (and of
 * the groups it accepts), by pointer and keyboard, with no provider: bind `props` on one element.
 */
export function useSwappable(
    options: MaybeRefOrGetter<UseSwappableOptions>,
): UseSwappableResult {
    const read = () => toValue(options);
    const { state, ref } = usePart(BINDING, read);
    return {
        state,
        props: computed(() => ({
            ref,
            "data-dnd-part": "swappable",
            "data-dnd-id": String(read().id),
            "data-dnd-dragging": state.value.dragging ? "" : undefined,
            "data-dnd-disabled": state.value.disabled ? "" : undefined,
            "aria-disabled": state.value.disabled ? true : undefined,
            "aria-describedby": read().describedBy,
        })),
    };
}
