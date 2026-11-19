---

"@fragiola/dnd": minor
"@fragiola/dnd-react": minor
"@fragiola/dnd-vue": minor
"@fragiola/dnd-angular": minor
---

The first release: headless drag and drop through mouse, touch, pen and the keyboard, one entry per capability (draggable, droppable, sortable, swappable).

- `@fragiola/dnd`, the framework-free core: the drag space of a document, the sensors, the collision strategies, auto-scroll, the overlay geometry and the drag events, plus the `@fragiola/dnd/adapter` entry the framework adapters are built on.
- `@fragiola/dnd-react`, the React adapter: wrappers that render no element of their own (`Draggable`, `Droppable`, `Sortable`, `Swappable`, `DragHandle`), their hooks, `useDragMonitor` and an optional `DragOverlay`.
- `@fragiola/dnd-vue`, the Vue adapter: the same wrappers as components and composables (`useDraggable`, `useSortable`, …), `useDragMonitor` and `DragOverlay`.
- `@fragiola/dnd-angular`, the Angular adapter: attribute directives on your own elements (`dndDraggable`, `dndDroppable`, `dndSortable`, `dndSortableGroup`, `dndSwappable`, `dndDragHandle`), injection functions (`injectDragMonitor`, `injectDragSpace`) and the `dndDragOverlay` template.

No provider anywhere: the parts of one document meet through its drag space, and every adapter pins the core at its exact version.
