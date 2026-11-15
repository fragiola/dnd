// The swappable wrapper (S3, D6): `<Swappable id="a" index={0} group="board"><div /></Swappable>`
// renders exactly the `div`, registered as a swappable item, with `data-dnd-*` and ARIA merged in.
import type { SwappableState } from "@fragiola/dnd/swappable";
import type * as React from "react";
import type { WrapperProps } from "../utils/useRender";
import { splitProps, useWrap } from "../utils/useWrap";
import { type UseSwappableOptions, useSwappable } from "./useSwappable";

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
    "activation",
    "autoScroll",
    "translate",
    "describedBy",
    "onSwap",
] as const satisfies readonly (keyof UseSwappableOptions)[];

/** Props of {@link Swappable}: the item's options and the wrapper's. */
export interface SwappableProps
    extends UseSwappableOptions,
        WrapperProps<SwappableState> {}

/**
 * Makes its single child an item that swaps with the items of its group (and of the groups it
 * accepts), by pointer and keyboard, with no provider. It renders no element of its own.
 */
export function Swappable(props: SwappableProps): React.ReactNode {
    const { children, render, className, style, ref, ...rest } = props;
    const [options, forwarded] = splitProps(rest, OPTIONS);
    const { state, props: internal } = useSwappable(options);
    return useWrap(
        { children, render, className, style, ref },
        { part: "Swappable", state, props: internal, forwarded },
    );
}
