// The sortable group wrapper (S2, D6): `<SortableGroup group="done"><ul /></SortableGroup>` renders
// exactly the `ul`, marked as its group's container. It is optional: a list needs it only to be
// sorted into while it is empty, or to the container's end.
import type { SortableGroupState } from "@fragiola/dnd/sortable";
import type * as React from "react";
import type { WrapperProps } from "../utils/useRender";
import { splitProps, useWrap } from "../utils/useWrap";
import {
    type UseSortableGroupOptions,
    useSortableGroup,
} from "./useSortableGroup";

/** The props that are the group's options; the others reach the element. */
const OPTIONS = [
    "group",
    "scope",
    "space",
    "data",
    "disabled",
    "accepts",
    "strategy",
] as const satisfies readonly (keyof UseSortableGroupOptions)[];

/** Props of {@link SortableGroup}: the group's options and the wrapper's. */
export interface SortableGroupProps
    extends UseSortableGroupOptions,
        WrapperProps<SortableGroupState> {}

/**
 * Marks its single child as the container of a sortable group, with no provider. It renders no
 * element of its own: the child must forward `ref` and props.
 */
export function SortableGroup(props: SortableGroupProps): React.ReactNode {
    const { children, render, className, style, ref, ...rest } = props;
    const [options, forwarded] = splitProps(rest, OPTIONS);
    const { state, props: internal } = useSortableGroup(options);
    return useWrap(
        { children, render, className, style, ref },
        { part: "SortableGroup", state, props: internal, forwarded },
    );
}
