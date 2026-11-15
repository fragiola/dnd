// The draggable wrapper (D6): `<Draggable id="a"><Card /></Draggable>` renders exactly `Card`'s
// element, registered as a draggable, with `data-dnd-*` and ARIA merged in.
import type { DraggableState } from "@fragiola/dnd/draggable";
import type * as React from "react";
import type { WrapperProps } from "../utils/useRender";
import { splitProps, useWrap } from "../utils/useWrap";
import { type UseDraggableOptions, useDraggable } from "./useDraggable";

/** The props that are the draggable's options; the others reach the element. */
const OPTIONS = [
    "id",
    "type",
    "data",
    "scope",
    "space",
    "disabled",
    "activation",
    "keyboard",
    "autoScroll",
    "collision",
    "translate",
    "describedBy",
    "onDragStart",
    "onDragMove",
    "onDragEnd",
    "onDragCancel",
] as const satisfies readonly (keyof UseDraggableOptions)[];

/** Props of {@link Draggable}: the draggable's options and the wrapper's. */
export interface DraggableProps
    extends UseDraggableOptions,
        WrapperProps<DraggableState> {}

/**
 * Makes its single child draggable, by pointer and keyboard, with no provider. It renders no
 * element of its own: the child must forward `ref` and props (`render` replaces it).
 */
export function Draggable(props: DraggableProps): React.ReactNode {
    const { children, render, className, style, ref, ...rest } = props;
    const [options, forwarded] = splitProps(rest, OPTIONS);
    const { state, props: internal } = useDraggable(options);
    return useWrap(
        { children, render, className, style, ref },
        { part: "Draggable", state, props: internal, forwarded },
    );
}
