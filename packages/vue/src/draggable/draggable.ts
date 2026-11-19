// The draggable wrapper (D6): `<Draggable id="a"><li>…</li></Draggable>` renders exactly the
// `li`, registered as a draggable, with `data-dnd-*` and ARIA merged in.
import type { DraggableState } from "@fragiola/dnd/draggable";
import {
    defineWrapper,
    type WrapperComponent,
    type WrapperProps,
    type WrapperSlots,
} from "../utils/wrap";
import { type UseDraggableOptions, useDraggable } from "./use-draggable";

/** Props of {@link Draggable}: the draggable's options and the wrapper's. */
export interface DraggableProps extends UseDraggableOptions, WrapperProps {}

/**
 * Makes its single child draggable, by pointer and keyboard, with no provider. It renders no
 * element of its own: the child must take its attributes and template ref (`as` replaces it).
 * The default slot is scoped with the draggable's state (`v-slot="{ state }"`).
 */
export const Draggable: WrapperComponent<
    DraggableProps,
    WrapperSlots<DraggableState>
> = defineWrapper<UseDraggableOptions, DraggableState>({
    name: "Draggable",
    options: [
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
    ],
    booleans: ["disabled", "translate"],
    use: useDraggable,
});
