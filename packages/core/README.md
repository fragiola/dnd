# @fragiola/dnd

The framework-free core of [DnD](https://fragiola.com/dnd): a drag space per document, pointer and
keyboard sensors, collision strategies, events and types, and one entry per capability
(`@fragiola/dnd/draggable`, `@fragiola/dnd/droppable`). Zero runtime dependencies.

A React app does not install this package: it is installed through, and re-exported by,
[`@fragiola/dnd-react`](https://www.npmjs.com/package/@fragiola/dnd-react), entry by entry. Install
it directly only to build an adapter for another framework.

## API

| entry                     | exports                                                                                                                                                                                                                                                      |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `@fragiola/dnd`           | `getDragSpace(document)`, `createDragSpace({ document })`, `subscribe(listener, { document \| space, scope? })`, `pointerWithin`, `closestCenter`, `rectIntersection`, `autoScroll(options?)`, `overlayStyle(operation)`, `grabOffset(operation)`, the types |
| `@fragiola/dnd/draggable` | `registerDraggable(element, options)`                                                                                                                                                                                                                        |
| `@fragiola/dnd/droppable` | `registerDroppable(element, options)`                                                                                                                                                                                                                        |

```ts
import { registerDraggable } from "@fragiola/dnd/draggable";
import { registerDroppable } from "@fragiola/dnd/droppable";

const zone = registerDroppable(list, {
    id: "done",
    accepts: ["task"],
    onDrop: (event) => move(event.operation.source.id),
});
const card = registerDraggable(item, { id: "t1", type: "task" });
card.subscribe(() => render(card.getState())); // { dragging, disabled }
// later
card.unregister();
zone.unregister();
```

There is no provider: both register in their document's drag space, created on first use. A
registration returns `{ update(options), unregister(), getState(), subscribe(listener) }`, an
external store for `useSyncExternalStore`. During a drag the core writes only the CSS `translate`
of the dragged element (never `transform`), once per animation frame, and `touch-action: none` on
a handle; every other look is the app's.

Docs and examples: <https://fragiola.com/dnd>. MIT, see [LICENSE](LICENSE).
