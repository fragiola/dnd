# @fragiola/dnd-react

Composable React 19 drag and drop for **DnD**, the headless, extremely light drag and drop of the
Fragiola family: draggables, droppables, drag handles and an optional overlay, through mouse, touch,
pen and the keyboard.

DnD is **headless**. It ships the behaviour, the accessibility and the wrappers, and **no CSS, no
icons, no rendered overlays of its own look and no text**: a wrapper renders no HTML of its own,
it adds behaviour to the element it wraps, and you style it with `className`, `style` and the
`data-dnd-*` attributes it exposes. Every visible word and accessible name comes from you.

Documentation, guides and live examples: **<https://fragiola.com/dnd>**.

## Install

```sh
pnpm add @fragiola/dnd-react
```

This one package is all a React app installs: it re-exports the whole core
([`@fragiola/dnd`](https://www.npmjs.com/package/@fragiola/dnd): the drag space, the sensors, the
collision strategies, the types), entry by entry, so everything is imported from
`@fragiola/dnd-react`. It depends on the core at the exact same version. `react` and `react-dom`
**^19** are peer dependencies. ESM only.

## Entries

Each capability is its own entry, so an app ships only the capabilities it imports. There is no
`Dnd.*` namespace: parts are named exports of their capability's entry.

| entry                           | what it holds                                                                                                      |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `@fragiola/dnd-react`           | the shared core: the drag space, sensors, collision strategies, events, `DragOverlay`, `useDragMonitor`, the types |
| `@fragiola/dnd-react/draggable` | `Draggable`, `DragHandle`, `useDraggable`                                                                          |
| `@fragiola/dnd-react/droppable` | `Droppable`, `useDroppable`                                                                                        |

## A minimal drag and drop

The target API, landing in this Epic: no provider, and the two halves in unrelated parts of the
tree.

```tsx
import { Draggable } from "@fragiola/dnd-react/draggable";
import { Droppable } from "@fragiola/dnd-react/droppable";
import { useState } from "react";

export function App() {
    const [inBox, setInBox] = useState(false);
    const card = (
        <Draggable id="card">
            <button type="button">Drag me</button>
        </Draggable>
    );
    return (
        <main>
            <aside>{inBox ? null : card}</aside>
            <section>
                <Droppable id="box" onDrop={() => setInBox(true)}>
                    <div aria-label="Drop here">{inBox ? card : null}</div>
                </Droppable>
            </section>
        </main>
    );
}
```

Neither wrapper renders an element: `Draggable` gives the `button` its handlers, its `ref` and
`data-dnd-dragging` while it moves; `Droppable` gives the `div` `data-dnd-over` while the card is
over it. The look is all yours.

## Stability

DnD is unreleased. Until `1.0`, the API may break between minor versions, and the changelog will
say what changed and how to update.

## Credits

DnD's capabilities follow [dnd-kit](https://github.com/clauderic/dnd-kit) by Claudéric Demers
(MIT), a study reference rebuilt on Fragiola's architecture. See [LICENSE](./LICENSE).
