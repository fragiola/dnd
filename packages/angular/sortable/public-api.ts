// @fragiola/dnd-angular/sortable: the core's sortable entry, re-exported (D1), and its Angular
// directives. It imports only the shared core, never another capability (D3, S1); the shared
// `DndDragHandle`, re-exported here, works inside a `[dndSortable]`.

export * from "@fragiola/dnd/sortable";
export { ɵDndDragHandle as DndDragHandle } from "@fragiola/dnd-angular";
export { DndSortable } from "./sortable.directive";
export { DndSortableGroup } from "./sortable-group.directive";
