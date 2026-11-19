// @fragiola/dnd-angular/swappable: the core's swappable entry, re-exported (D1), and its Angular
// directive. It imports only the shared core, never another capability (D3, S1); the shared
// `DndDragHandle`, re-exported here, works inside a `[dndSwappable]`.

export * from "@fragiola/dnd/swappable";
export { ɵDndDragHandle as DndDragHandle } from "@fragiola/dnd-angular";
export { DndSwappable } from "./swappable.directive";
