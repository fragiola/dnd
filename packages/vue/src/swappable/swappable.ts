// The swappable wrapper (S3, D6): `<Swappable id="a" :index="0" group="board"><div /></Swappable>`
// renders exactly the `div`, registered as a swappable item, with `data-dnd-*` and ARIA merged in.
import type { SwappableState } from "@fragiola/dnd/swappable";
import {
    defineWrapper,
    type WrapperComponent,
    type WrapperProps,
    type WrapperSlots,
} from "../utils/wrap";
import { type UseSwappableOptions, useSwappable } from "./use-swappable";

/** Props of {@link Swappable}: the item's options and the wrapper's. */
export interface SwappableProps extends UseSwappableOptions, WrapperProps {}

/**
 * Makes its single child an item that swaps with the items of its group (and of the groups it
 * accepts), by pointer and keyboard, with no provider. It renders no element of its own. The
 * default slot is scoped with the item's state (`v-slot="{ state }"`).
 */
export const Swappable: WrapperComponent<
    SwappableProps,
    WrapperSlots<SwappableState>
> = defineWrapper<UseSwappableOptions, SwappableState>({
    name: "Swappable",
    options: [
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
    ],
    booleans: ["disabled", "translate"],
    use: useSwappable,
});
