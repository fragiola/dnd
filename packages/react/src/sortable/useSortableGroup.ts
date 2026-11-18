// The sortable group hook (S2): the lower layer `SortableGroup` is built on. It registers the
// element its `props.ref` receives as its group's container (only needed for an empty group, or
// to sort to the container's end), follows option changes with `update`, and re-renders at a
// sort's start and end only.

import { connectPart, sortableGroupBinding } from "@fragiola/dnd/adapter";
import {
    registerSortableGroup,
    type SortableGroupOptions,
    type SortableGroupState,
} from "@fragiola/dnd/sortable";
import type * as React from "react";
import { type PartBinding, usePart } from "../utils/use-part";

/** Options of {@link useSortableGroup}: the core's. */
export interface UseSortableGroupOptions extends SortableGroupOptions {}

/** The props {@link useSortableGroup} puts on the container's element. */
export interface SortableGroupHookProps {
    readonly ref: React.RefCallback<HTMLElement>;
    readonly "data-dnd-part": "sortable-group";
    readonly "data-dnd-id": string;
    readonly "data-dnd-sorting"?: "" | undefined;
    readonly "data-dnd-disabled"?: "" | undefined;
    readonly "aria-disabled"?: true | undefined;
}

/** What {@link useSortableGroup} returns: the state, and the props to spread onto the element. */
export interface UseSortableGroupResult {
    readonly state: SortableGroupState;
    readonly props: SortableGroupHookProps;
}

/** How the hook drives the core's sortable group. */
const BINDING: PartBinding<UseSortableGroupOptions, SortableGroupState> = {
    ...sortableGroupBinding,
    connect: (element, options, slot) =>
        connectPart(element, registerSortableGroup, options, slot),
};

/** Makes the element its `props` go on the container of a sortable group, with no provider. */
export function useSortableGroup(
    options: UseSortableGroupOptions,
): UseSortableGroupResult {
    const { state, ref } = usePart(BINDING, options);
    return {
        state,
        props: {
            ref,
            "data-dnd-part": "sortable-group",
            "data-dnd-id": options.group,
            "data-dnd-sorting": state.sorting ? "" : undefined,
            "data-dnd-disabled": state.disabled ? "" : undefined,
            "aria-disabled": state.disabled ? true : undefined,
        },
    };
}
