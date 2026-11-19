// The sortable group wrapper (S2, D6): `<SortableGroup group="done"><ul /></SortableGroup>`
// renders exactly the `ul`, marked as its group's container. It is optional: a list needs it
// only to be sorted into while it is empty, or to the container's end.
import type { SortableGroupState } from "@fragiola/dnd/sortable";
import {
    defineWrapper,
    type WrapperComponent,
    type WrapperProps,
    type WrapperSlots,
} from "../utils/wrap";
import {
    type UseSortableGroupOptions,
    useSortableGroup,
} from "./use-sortable-group";

/** Props of {@link SortableGroup}: the group's options and the wrapper's. */
export interface SortableGroupProps
    extends UseSortableGroupOptions,
        WrapperProps {}

/**
 * Marks its single child as the container of a sortable group, with no provider. It renders no
 * element of its own: the child must take its attributes and template ref. The default slot is
 * scoped with the group's state (`v-slot="{ state }"`).
 */
export const SortableGroup: WrapperComponent<
    SortableGroupProps,
    WrapperSlots<SortableGroupState>
> = defineWrapper<UseSortableGroupOptions, SortableGroupState>({
    name: "SortableGroup",
    options: [
        "group",
        "scope",
        "space",
        "data",
        "disabled",
        "accepts",
        "strategy",
    ],
    booleans: ["disabled"],
    use: useSortableGroup,
});
