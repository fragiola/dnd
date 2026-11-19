// The sortable item composable (S2, D6): the lower layer `Sortable` is built on, over the shared
// `usePart`. It triggers its readers at a sort's start and end only: the preview's shifts are
// written by the core, never rendered (D8).

import { connectSource, sortableBinding } from "@fragiola/dnd/adapter";
import {
    registerSortable,
    type SortableOptions,
    type SortableState,
} from "@fragiola/dnd/sortable";
import {
    type ComputedRef,
    computed,
    type MaybeRefOrGetter,
    toValue,
} from "vue";
import type { ElementRef } from "../utils/element-ref";
import { type PartBinding, usePart } from "../utils/use-part";

/** Options of {@link useSortable}: the core's, without `handle` (a `DragHandle` sets it). */
export interface UseSortableOptions extends Omit<SortableOptions, "handle"> {
    /** the id of the element describing how to sort it (`aria-describedby`): the app's text */
    readonly describedBy?: string | undefined;
}

/** What {@link useSortable} puts on the item's element (`v-bind="props"`). */
export interface SortableBindings {
    readonly ref: ElementRef;
    readonly "data-dnd-part": "sortable";
    readonly "data-dnd-id": string;
    readonly "data-dnd-dragging"?: "" | undefined;
    readonly "data-dnd-sorting"?: "" | undefined;
    readonly "data-dnd-disabled"?: "" | undefined;
    readonly "aria-disabled"?: true | undefined;
    readonly "aria-describedby"?: string | undefined;
}

/** What {@link useSortable} returns: the state, and the props to bind on the element. */
export interface UseSortableResult {
    readonly state: ComputedRef<SortableState>;
    readonly props: ComputedRef<SortableBindings>;
}

/** How the composable drives the core's sortable. */
const BINDING: PartBinding<UseSortableOptions, SortableState> = {
    ...sortableBinding,
    connect: (element, options, slot) =>
        connectSource(element, registerSortable, options, slot),
};

/**
 * Makes the element its `props` go on an item of its `group`'s list, sorted by pointer and
 * keyboard, with no provider and no wrapper around the list: bind `props` on one element. Pass a
 * getter or a ref for options that change (an item's `index` does).
 */
export function useSortable(
    options: MaybeRefOrGetter<UseSortableOptions>,
): UseSortableResult {
    const read = () => toValue(options);
    const { state, ref } = usePart(BINDING, read);
    return {
        state,
        props: computed(() => ({
            ref,
            "data-dnd-part": "sortable",
            "data-dnd-id": String(read().id),
            "data-dnd-dragging": state.value.dragging ? "" : undefined,
            "data-dnd-sorting": state.value.sorting ? "" : undefined,
            "data-dnd-disabled": state.value.disabled ? "" : undefined,
            "aria-disabled": state.value.disabled ? true : undefined,
            "aria-describedby": read().describedBy,
        })),
    };
}
