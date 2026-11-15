// The sortable item hook (S2, D6): the lower layer `Sortable` is built on, over the shared
// `useSource`. It re-renders at a sort's start and end only: the preview's shifts are written by
// the core, never rendered (D8).
import {
    registerSortable,
    type SortableOptions,
    type SortableState,
} from "@fragiola/dnd/sortable";
import type * as React from "react";
import { type SourceBinding, useSource } from "../utils/useSource";

/** Options of {@link useSortable}: the core's, without `handle` (a `DragHandle` sets it). */
export interface UseSortableOptions extends Omit<SortableOptions, "handle"> {
    /** the id of the element describing how to sort it (`aria-describedby`): the app's text */
    readonly describedBy?: string | undefined;
}

/** The props {@link useSortable} puts on the item's element. */
export interface SortableHookProps {
    readonly ref: React.RefCallback<HTMLElement>;
    readonly "data-dnd-part": "sortable";
    readonly "data-dnd-id": string;
    readonly "data-dnd-dragging"?: "" | undefined;
    readonly "data-dnd-sorting"?: "" | undefined;
    readonly "data-dnd-disabled"?: "" | undefined;
    readonly "aria-disabled"?: true | undefined;
    readonly "aria-describedby"?: string | undefined;
}

/** What {@link useSortable} returns: the state, and the props to spread onto the element. */
export interface UseSortableResult {
    readonly state: SortableState;
    readonly props: SortableHookProps;
}

/** How the hook drives the core's sortable. */
const BINDING: SourceBinding<UseSortableOptions, SortableState> = {
    register: registerSortable,
    compared: [
        "id",
        "index",
        "group",
        "type",
        "data",
        "scope",
        "space",
        "disabled",
        "accepts",
        "strategy",
        "activation",
        "autoScroll",
        "translate",
    ],
    callbacks: ["onSortStart", "onSortOver", "onSortEnd"],
    rest: (options) => ({
        dragging: false,
        sorting: false,
        disabled: !!options.disabled,
    }),
};

/**
 * Makes the element its `props` go on an item of its `group`'s list, sorted by pointer and
 * keyboard, with no provider and no wrapper around the list: spread `props` onto one element.
 */
export function useSortable(options: UseSortableOptions): UseSortableResult {
    const { state, ref } = useSource(BINDING, options);
    return {
        state,
        props: {
            ref,
            "data-dnd-part": "sortable",
            "data-dnd-id": String(options.id),
            "data-dnd-dragging": state.dragging ? "" : undefined,
            "data-dnd-sorting": state.sorting ? "" : undefined,
            "data-dnd-disabled": state.disabled ? "" : undefined,
            "aria-disabled": state.disabled ? true : undefined,
            "aria-describedby": options.describedBy,
        },
    };
}
