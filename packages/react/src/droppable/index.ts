// @fragiola/dnd-react/droppable: the core's droppable entry, re-exported (D1), and its React
// wrapper and hook. It imports only the shared core, never another capability (D3).

export * from "@fragiola/dnd/droppable";
export { Droppable, type DroppableProps } from "./Droppable";
export {
    type DroppableHookProps,
    type UseDroppableOptions,
    type UseDroppableResult,
    useDroppable,
} from "./useDroppable";
