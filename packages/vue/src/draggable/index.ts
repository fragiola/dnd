// @fragiola/dnd-vue/draggable: the core's draggable entry, re-exported (D1), and its Vue
// component and composable. It imports only the shared core, never another capability (D3).

export * from "@fragiola/dnd/draggable";
// the shared drag handle, re-exported by every drag source's entry
export { DragHandle, type DragHandleProps } from "../components/drag-handle";
export { Draggable, type DraggableProps } from "./draggable";
export {
    type DraggableBindings,
    type UseDraggableOptions,
    type UseDraggableResult,
    useDraggable,
} from "./use-draggable";
