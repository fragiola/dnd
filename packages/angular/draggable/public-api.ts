// @fragiola/dnd-angular/draggable: the core's draggable entry, re-exported (D1), and its Angular
// directive. It imports only the shared core, never another capability (D3).

export * from "@fragiola/dnd/draggable";
// the shared drag handle, re-exported by every drag source's entry
export { ɵDndDragHandle as DndDragHandle } from "@fragiola/dnd-angular";
export { DndDraggable } from "./draggable.directive";
