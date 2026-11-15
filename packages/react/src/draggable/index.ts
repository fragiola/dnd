// @fragiola/dnd-react/draggable: the core's draggable entry, re-exported (D1), and its React
// wrapper and hook. It imports only the shared core, never another capability (D3).

export * from "@fragiola/dnd/draggable";
// the shared drag handle, re-exported by every drag source's entry
export { DragHandle, type DragHandleProps } from "../DragHandle";
export { Draggable, type DraggableProps } from "./Draggable";
export {
    type DraggableHookProps,
    type UseDraggableOptions,
    type UseDraggableResult,
    useDraggable,
} from "./useDraggable";
