# @fragiola/dnd-vue

## 0.1.1

### Patch Changes

- Updated dependencies []:
  - @fragiola/dnd@0.1.1

## 0.1.0

### Minor Changes

- [#11](https://github.com/fragiola/dnd/pull/11) [`66c2850`](https://github.com/fragiola/dnd/commit/66c2850092a438b9534ec81028b5a07c8c274c3c) Thanks [@maurodesouza](https://github.com/maurodesouza)! - The first release: headless drag and drop through mouse, touch, pen and the keyboard, one entry per capability (draggable, droppable, sortable, swappable).
  
  - `@fragiola/dnd`, the framework-free core: the drag space of a document, the sensors, the collision strategies, auto-scroll, the overlay geometry and the drag events, plus the `@fragiola/dnd/adapter` entry the framework adapters are built on.
  - `@fragiola/dnd-react`, the React adapter: wrappers that render no element of their own (`Draggable`, `Droppable`, `Sortable`, `Swappable`, `DragHandle`), their hooks, `useDragMonitor` and an optional `DragOverlay`.
  - `@fragiola/dnd-vue`, the Vue adapter: the same wrappers as components and composables (`useDraggable`, `useSortable`, …), `useDragMonitor` and `DragOverlay`.
  - `@fragiola/dnd-angular`, the Angular adapter: attribute directives on your own elements (`dndDraggable`, `dndDroppable`, `dndSortable`, `dndSortableGroup`, `dndSwappable`, `dndDragHandle`), injection functions (`injectDragMonitor`, `injectDragSpace`) and the `dndDragOverlay` template.
  
  No provider anywhere: the parts of one document meet through its drag space, and every adapter pins the core at its exact version.

### Patch Changes

- Updated dependencies [[`66c2850`](https://github.com/fragiola/dnd/commit/66c2850092a438b9534ec81028b5a07c8c274c3c)]:
  - @fragiola/dnd@0.1.0
