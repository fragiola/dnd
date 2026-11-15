// The droppable wrapper (D6): `<Droppable id="z"><section /></Droppable>` renders exactly the
// `section`, registered as a drop target, with `data-dnd-*` merged in.
import type { DroppableState } from "@fragiola/dnd/droppable";
import type * as React from "react";
import type { WrapperProps } from "../utils/useRender";
import { splitProps, useWrap } from "../utils/useWrap";
import { type UseDroppableOptions, useDroppable } from "./useDroppable";

/** The props that are the droppable's options; the others reach the element. */
const OPTIONS = [
    "id",
    "data",
    "scope",
    "space",
    "accepts",
    "disabled",
    "onDragEnter",
    "onDragOver",
    "onDragLeave",
    "onDrop",
] as const satisfies readonly (keyof UseDroppableOptions)[];

/** Props of {@link Droppable}: the droppable's options and the wrapper's. */
export interface DroppableProps
    extends UseDroppableOptions,
        WrapperProps<DroppableState> {}

/**
 * Makes its single child a drop target, with no provider. It renders no element of its own: the
 * child must forward `ref` and props (`render` replaces it).
 */
export function Droppable(props: DroppableProps): React.ReactNode {
    const { children, render, className, style, ref, ...rest } = props;
    const [options, forwarded] = splitProps(rest, OPTIONS);
    const { state, props: internal } = useDroppable(options);
    return useWrap(
        { children, render, className, style, ref },
        { part: "Droppable", state, props: internal, forwarded },
    );
}
