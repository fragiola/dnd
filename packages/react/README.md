# @fragiola/dnd-react

Composable React 19 drag and drop for **DnD**, the headless, extremely light drag and drop of the
Fragiola family: draggables, droppables, drag handles and an optional overlay, through mouse, touch,
pen and the keyboard.

DnD is **headless**. It ships the behaviour, the accessibility and the wrappers, and **no CSS, no
icons, no rendered overlays of its own look and no text**: a wrapper renders no HTML of its own,
it adds behaviour to the element it wraps, and you style it with `className`, `style` and the
`data-dnd-*` attributes it exposes. Every visible word and accessible name comes from you.

Documentation, guides and live examples: **<https://fragiola.com/dnd>** (the API pages:
[`Draggable`](https://fragiola.com/dnd/docs/api/draggable), [`Droppable`](https://fragiola.com/dnd/docs/api/droppable),
[`DragOverlay`](https://fragiola.com/dnd/docs/api/drag-overlay), [hooks](https://fragiola.com/dnd/docs/api/hooks)).

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
`Dnd.*` namespace: parts are named exports of their capability's entry, and each entry re-exports
the core's entry of the same name.

| entry                           | what it adds to the core's entry                                                                                                     |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `@fragiola/dnd-react`           | `DragOverlay`, `useDragMonitor`, `useDragSpace`, the types `WrapperProps`, `RenderProp`, `RenderedProps` (and the whole shared core) |
| `@fragiola/dnd-react/draggable` | `Draggable`, `DragHandle`, `useDraggable` (and `registerDraggable`)                                                                  |
| `@fragiola/dnd-react/droppable` | `Droppable`, `useDroppable` (and `registerDroppable`)                                                                                |

## A minimal drag and drop

No provider, and the two halves in unrelated parts of the tree:

```tsx
import { Draggable } from "@fragiola/dnd-react/draggable";
import { Droppable } from "@fragiola/dnd-react/droppable";
import { useState } from "react";

export function App() {
    const [inBox, setInBox] = useState(false);
    const card = (
        <Draggable id="card" type="task">
            <div className="card">Drag me</div>
        </Draggable>
    );
    return (
        <main>
            <aside>{inBox ? null : card}</aside>
            <section>
                <Droppable
                    id="box"
                    accepts={["task"]}
                    onDrop={() => setInBox(true)}
                >
                    <div aria-label="Drop here" className="box">
                        {inBox ? card : null}
                    </div>
                </Droppable>
            </section>
        </main>
    );
}
```

Neither wrapper renders an element. `Draggable` registers the `div` in its document's drag space,
makes it a tab stop (Space or Enter grabs, the arrows move, Escape cancels) and marks it
`data-dnd-part="draggable"`, `data-dnd-id="card"` and, while it moves, `data-dnd-dragging`; during
the drag the core moves it with the CSS `translate` property, once per frame, without rendering
React. `Droppable` marks its element `data-dnd-over`, `data-dnd-refused` or `data-dnd-active`.
The look is all yours:

```css
[data-dnd-dragging] {
    opacity: 0.6;
}
[data-dnd-over] {
    outline: 2px solid;
}
[data-dnd-refused] {
    outline: 2px dashed red;
}
```

## The wrapper

A wrapper clones its **single child**: a DOM element, or a component that passes `ref` and its
other props on to its element, as every Fragiola primitive does (`Dockable.TabSet`,
`GridLayout.Item`). Its handlers run before the child's own; the child's `ref`, `className` and
`style` are kept; `className` and `style` also take a function of the state. With no child to wrap,
`render` gives the element:

```tsx
<Draggable id="a" className={(state) => (state.dragging ? "lifted" : undefined)}>
    <Card ref={cardRef} onPointerDown={track} />
</Draggable>

<Droppable id="list" render={(props, state) => <ul {...props} data-full={state.over || undefined} />}>
    {items}
</Droppable>
```

In development, no child, several children, a fragment or text throw, and a child that never
receives the ref is reported. Wrappers stack: `<Droppable><Draggable><Card /></Draggable></Droppable>`.

## A handle, controls and the keyboard

```tsx
import { DragHandle, Draggable } from "@fragiola/dnd-react/draggable";

<Draggable id="row" keyboard={{ mode: "targets" }} describedBy="drag-help">
    <li>
        <DragHandle describedBy="drag-help">
            <span aria-label="Move">⋮⋮</span>
        </DragHandle>
        Row
        <button type="button">Edit</button>
        <div data-dnd-no-drag>…</div>
    </li>
</Draggable>;
```

The handle is the only place a drag starts, and the tab stop; it finds its draggable through the
DOM, not a context. Buttons, inputs and `data-dnd-no-drag` subtrees never start a drag.

## An overlay, auto-scroll, rules and a monitor

```tsx
import {
    autoScroll,
    DragOverlay,
    useDragMonitor,
    useDragSpace,
} from "@fragiola/dnd-react";

const scroll = autoScroll();

function Board() {
    const space = useDragSpace(); // the document's, once mounted
    useEffect(
        () =>
            space?.use((ctx, next) =>
                ctx.payload.droppableId === "archive"
                    ? { ok: false, error: { code: "vetoed" } }
                    : next(),
            ),
        [space],
    );
    useDragMonitor((event) => announce(event)); // your live region, your words
    return (
        <>
            <div style={{ overflow: "hidden" }}>
                <Draggable id="a" translate={false} autoScroll={scroll}>
                    <Card />
                </Draggable>
            </div>
            <DragOverlay>
                {(operation) => <Card id={operation.source.id} />}
            </DragOverlay>
        </>
    );
}
```

`DragOverlay` is the only part that renders HTML: while a drag runs, a `div` portalled into the
document's `body`, fixed over the dragged box (`position`, geometry, `box-sizing: border-box` and
`pointer-events: none` are its only inline style), moved without rendering React. `translate={false}` keeps the source in
place.

## Hooks

`useDraggable(options)` and `useDroppable(options)` are the lower layer and return
`{ state, props }`: spread `props` (the registering `ref`, `data-dnd-*`, ARIA) onto one element.
Options update the registration without re-registering, and inline callbacks are always the
latest. Nothing touches the DOM while rendering, so server rendering works as is.

## Size

`pnpm size` reports each entry, and what an app's production build ships for the entries it
imports, with the core they pull (min + gzip, React left out, the development checks dropped):

| imported                             | min + gzip       | target (D13)   |
| ------------------------------------ | ---------------- | -------------- |
| `@fragiola/dnd-react`                | 3.6 KB           | ≤ 4 KB         |
| `@fragiola/dnd-react` + `/draggable` | 8.0 KB (+4.3 KB) | ≤ 2 KB extra   |
| `@fragiola/dnd-react` + `/droppable` | 4.8 KB (+1.1 KB) | ≤ 1.5 KB extra |
| all three                            | 8.4 KB           |                |
| only `Draggable`                     | 6.3 KB           |                |
| only `Droppable`                     | 3.0 KB           |                |

The draggable misses its target. Most of it is behaviour the core's draggable capability carries
for every draggable: the pointer sensor (activation, capture, the press claim and its focus), the
keyboard sensor (step and targets modes), the drag operation (measurement, collision, the
`translate` writer, events) and the guarded callbacks. A size pass dropped the development
messages from production builds (they are behind a literal `process.env.NODE_ENV` check, and the
build no longer folds it) and took the shared entry from 3.8 to 3.5 KB; the draggable path did not
move measurably. Loading the keyboard's targets mode lazily (about 0.3 KB) would make a drag's
first arrow keys depend on a chunk arriving, so it was left in.

## Known limits

An `onMouseDown` on a draggable does not run (the press is claimed on `pointerdown`; use
`onPointerDown`), a drag never crosses documents, and auto-scroll uses the scroll range measured
when the drag starts. In Firefox, set `overflow-anchor: none` on a scroll container whose
draggables can be cancelled at its end. See
[limitations](https://fragiola.com/dnd/docs/limitations).

## Stability

DnD is unreleased. Until `1.0`, the API may break between minor versions, and the changelog will
say what changed and how to update.

## Credits

DnD's capabilities follow [dnd-kit](https://github.com/clauderic/dnd-kit) by Claudéric Demers
(MIT), a study reference rebuilt on Fragiola's architecture. See [LICENSE](./LICENSE).
