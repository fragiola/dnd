# Scenarios

Dev-only entries of the playground, never shipped and never on the site. A file is all it takes to
add one: `src/scenarios/<area>/<id>.tsx`, a kebab-case id, a component as its default export and
nothing else (`tests/scenarios.test.ts`). The sidebar groups them by area and titles them from the
id (`pointer-threshold` → "Pointer threshold"); `?scenario=<area>/<id>` opens one.

| area       | what belongs in it                                                                 |
| ---------- | ---------------------------------------------------------------------------------- |
| `drag`     | the draggable side: activation, handles, no-drag controls, cancelling, `translate` |
| `drop`     | the droppable side: `accepts`, scopes, collision strategies, `DragOverlay`         |
| `keyboard` | grab, move by step or by target, drop and cancel without a pointer                 |
| `interop`  | dnd inside Dockable and Grid Layout: panels that move, popouts, nested gestures    |
| `api`      | the core driven directly: `createDragSpace`, `subscribe`, the drag operation       |
