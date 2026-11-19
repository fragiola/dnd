// @fragiola/dnd-vue/sortable: the core's sortable entry, re-exported (D1), and its Vue components
// and composables. It imports only the shared core, never another capability (D3, S1); the
// shared `DragHandle`, re-exported here, works inside a `Sortable`.

export * from "@fragiola/dnd/sortable";
export { DragHandle, type DragHandleProps } from "../components/drag-handle";
export { Sortable, type SortableProps } from "./sortable";
export { SortableGroup, type SortableGroupProps } from "./sortable-group";
export {
    type SortableBindings,
    type UseSortableOptions,
    type UseSortableResult,
    useSortable,
} from "./use-sortable";
export {
    type SortableGroupBindings,
    type UseSortableGroupOptions,
    type UseSortableGroupResult,
    useSortableGroup,
} from "./use-sortable-group";
