// The sortable wrapper (S2, D6): `<Sortable id="a" index={0} group="todo"><li /></Sortable>`
// renders exactly the `li`, registered as an item of its group's list, with `data-dnd-*` and ARIA
// merged in. A list needs no wrapper around it.
import type { SortableState } from "@fragiola/dnd/sortable";
import type * as React from "react";
import type { WrapperProps } from "../utils/useRender";
import { splitProps, useWrap } from "../utils/useWrap";
import { type UseSortableOptions, useSortable } from "./useSortable";

/** The props that are the item's options; the others reach the element. */
const OPTIONS = [
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
    "describedBy",
    "onSortStart",
    "onSortOver",
    "onSortEnd",
] as const satisfies readonly (keyof UseSortableOptions)[];

/** Props of {@link Sortable}: the item's options and the wrapper's. */
export interface SortableProps
    extends UseSortableOptions,
        WrapperProps<SortableState> {}

/**
 * Makes its single child an item of its `group`'s list, sorted by pointer and keyboard, with no
 * provider. It renders no element of its own: the child must forward `ref` and props.
 */
export function Sortable(props: SortableProps): React.ReactNode {
    const { children, render, className, style, ref, ...rest } = props;
    const [options, forwarded] = splitProps(rest, OPTIONS);
    const { state, props: internal } = useSortable(options);
    return useWrap(
        { children, render, className, style, ref },
        { part: "Sortable", state, props: internal, forwarded },
    );
}
