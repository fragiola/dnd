// @fragiola/dnd-vue/droppable: the core's droppable entry, re-exported (D1), and its Vue
// component and composable. It imports only the shared core, never another capability (D3).

export * from "@fragiola/dnd/droppable";
export { Droppable, type DroppableProps } from "./droppable";
export {
    type DroppableBindings,
    type UseDroppableOptions,
    type UseDroppableResult,
    useDroppable,
} from "./use-droppable";
