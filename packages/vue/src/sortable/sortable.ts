// The sortable wrapper (S2, D6): `<Sortable id="a" :index="0" group="todo"><li /></Sortable>`
// renders exactly the `li`, registered as an item of its group's list, with `data-dnd-*` and ARIA
// merged in. A list needs no wrapper around it.
import type { SortableState } from "@fragiola/dnd/sortable";
import {
    defineWrapper,
    type WrapperComponent,
    type WrapperProps,
    type WrapperSlots,
} from "../utils/wrap";
import { type UseSortableOptions, useSortable } from "./use-sortable";

/** Props of {@link Sortable}: the item's options and the wrapper's. */
export interface SortableProps extends UseSortableOptions, WrapperProps {}

/**
 * Makes its single child an item of its `group`'s list, sorted by pointer and keyboard, with no
 * provider. It renders no element of its own: the child must take its attributes and template
 * ref. The default slot is scoped with the item's state (`v-slot="{ state }"`).
 */
export const Sortable: WrapperComponent<
    SortableProps,
    WrapperSlots<SortableState>
> = defineWrapper<UseSortableOptions, SortableState>({
    name: "Sortable",
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
        "strategy",
        "activation",
        "autoScroll",
        "translate",
        "describedBy",
        "onSortStart",
        "onSortOver",
        "onSortEnd",
    ],
    booleans: ["disabled", "translate"],
    use: useSortable,
});
