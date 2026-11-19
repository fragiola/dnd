// The sortable group composable (S2): the lower layer `SortableGroup` is built on. It registers
// the element its `props.ref` receives as its group's container (only needed for an empty group,
// or to sort to the container's end), follows option changes with `update`, and triggers its
// readers at a sort's start and end only.

import { connectPart, sortableGroupBinding } from "@fragiola/dnd/adapter";
import {
    registerSortableGroup,
    type SortableGroupOptions,
    type SortableGroupState,
} from "@fragiola/dnd/sortable";
import {
    type ComputedRef,
    computed,
    type MaybeRefOrGetter,
    toValue,
} from "vue";
import type { ElementRef } from "../utils/element-ref";
import { type PartBinding, usePart } from "../utils/use-part";

/** Options of {@link useSortableGroup}: the core's. */
export interface UseSortableGroupOptions extends SortableGroupOptions {}

/** What {@link useSortableGroup} puts on the container's element (`v-bind="props"`). */
export interface SortableGroupBindings {
    readonly ref: ElementRef;
    readonly "data-dnd-part": "sortable-group";
    readonly "data-dnd-id": string;
    readonly "data-dnd-sorting"?: "" | undefined;
    readonly "data-dnd-disabled"?: "" | undefined;
    readonly "aria-disabled"?: true | undefined;
}

/** What {@link useSortableGroup} returns: the state, and the props to bind on the element. */
export interface UseSortableGroupResult {
    readonly state: ComputedRef<SortableGroupState>;
    readonly props: ComputedRef<SortableGroupBindings>;
}

/** How the composable drives the core's sortable group. */
const BINDING: PartBinding<UseSortableGroupOptions, SortableGroupState> = {
    ...sortableGroupBinding,
    connect: (element, options, slot) =>
        connectPart(element, registerSortableGroup, options, slot),
};

/** Makes the element its `props` go on the container of a sortable group, with no provider. */
export function useSortableGroup(
    options: MaybeRefOrGetter<UseSortableGroupOptions>,
): UseSortableGroupResult {
    // a copy, so a reactive object (or a ref's object changed in place) is tracked key by key
    const read = () => ({ ...toValue(options) });
    const { state, ref } = usePart(BINDING, read);
    return {
        state,
        props: computed(() => ({
            ref,
            "data-dnd-part": "sortable-group",
            "data-dnd-id": read().group,
            "data-dnd-sorting": state.value.sorting ? "" : undefined,
            "data-dnd-disabled": state.value.disabled ? "" : undefined,
            "aria-disabled": state.value.disabled ? true : undefined,
        })),
    };
}
