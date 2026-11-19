// The droppable wrapper (D6): `<Droppable id="z"><section /></Droppable>` renders exactly the
// `section`, registered as a drop target, with `data-dnd-*` merged in.
import type { DroppableState } from "@fragiola/dnd/droppable";
import {
    defineWrapper,
    type WrapperComponent,
    type WrapperProps,
    type WrapperSlots,
} from "../utils/wrap";
import { type UseDroppableOptions, useDroppable } from "./use-droppable";

/** Props of {@link Droppable}: the droppable's options and the wrapper's. */
export interface DroppableProps extends UseDroppableOptions, WrapperProps {}

/**
 * Makes its single child a drop target, with no provider. It renders no element of its own: the
 * child must take its attributes and template ref (`as` replaces it). The default slot is scoped
 * with the droppable's state (`v-slot="{ state }"`).
 */
export const Droppable: WrapperComponent<
    DroppableProps,
    WrapperSlots<DroppableState>
> = defineWrapper<UseDroppableOptions, DroppableState>({
    name: "Droppable",
    options: [
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
    ],
    booleans: ["disabled"],
    use: useDroppable,
});
