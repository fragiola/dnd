# @fragiola/dnd-vue

Composable Vue 3 drag and drop for **DnD**, the headless, extremely light drag and drop of the
Fragiola family: draggables, droppables, sortable lists and grids, swappable items, drag handles and
an optional overlay, through mouse, touch, pen and the keyboard.

DnD is **headless**. It ships the behaviour, the accessibility and the components, and **no CSS,
no icons, no rendered overlays of its own look and no text**: a component renders no HTML of its
own, it adds behaviour to the element it wraps, and you style it with `class`, `style` and the
`data-dnd-*` attributes it exposes. Every visible word and accessible name comes from you.

Documentation, guides and live examples: **<https://fragiola.com/dnd>** (the Vue API:
[`@fragiola/dnd-vue`](https://fragiola.com/dnd/docs/api/vue)).

## Install

```sh
pnpm add @fragiola/dnd-vue
```

This one package is all a Vue app installs: it re-exports the whole core
([`@fragiola/dnd`](https://www.npmjs.com/package/@fragiola/dnd): the drag space, the sensors, the
collision strategies, the types), entry by entry, so everything is imported from
`@fragiola/dnd-vue`. It depends on the core at the exact same version. `vue` **^3.5** is a peer
dependency. ESM only.

## Entries

Each capability is its own entry, so an app ships only the capabilities it imports. Each entry
re-exports the core's entry of the same name.

| entry                         | what it adds to the core's entry                                                                                                  |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `@fragiola/dnd-vue`           | `DragOverlay`, `useDragMonitor`, `useDragSpace` (and the whole shared core)                                                       |
| `@fragiola/dnd-vue/draggable` | `Draggable`, `DragHandle`, `useDraggable` (and `registerDraggable`)                                                               |
| `@fragiola/dnd-vue/droppable` | `Droppable`, `useDroppable` (and `registerDroppable`)                                                                             |
| `@fragiola/dnd-vue/sortable`  | `Sortable`, `SortableGroup`, `DragHandle`, `useSortable`, `useSortableGroup` (and `registerSortable`, the strategies and helpers) |
| `@fragiola/dnd-vue/swappable` | `Swappable`, `DragHandle`, `useSwappable` (and `registerSwappable`, `swapItems`, `swapBetween`)                                   |

## A minimal drag and drop

No provider, and the two halves in unrelated parts of the tree:

```vue
<script setup lang="ts">
import { Draggable } from "@fragiola/dnd-vue/draggable";
import { Droppable } from "@fragiola/dnd-vue/droppable";
import { ref } from "vue";

const inBox = ref(false);
</script>

<template>
    <main>
        <aside>
            <Draggable v-if="!inBox" id="card" type="task">
                <div class="card">Drag me</div>
            </Draggable>
        </aside>
        <Droppable id="box" :accepts="['task']" @drop="inBox = true">
            <section aria-label="Drop here" class="box">
                <div v-if="inBox" class="card">Dropped</div>
            </section>
        </Droppable>
    </main>
</template>
```

Neither component renders an element. `Draggable` registers the `div` in its document's drag
space, makes it a tab stop (Space or Enter grabs, the arrows move, Escape cancels) and marks it
`data-dnd-part="draggable"`, `data-dnd-id="card"` and, while it moves, `data-dnd-dragging`; during
the drag the core moves it with the CSS `translate` property, once per frame, without updating a
component. `Droppable` marks its element `data-dnd-over`, `data-dnd-refused` or `data-dnd-active`.

## The wrapper

A component renders its **single default-slot child** with its attributes, listeners and template
ref merged in: a DOM element, or a component whose root element takes its attributes and ref, as
every Fragiola primitive does. The child's own `class`, `style`, listeners and template ref are
kept (the wrapper's listeners run first; the child's own plain attributes win). The default slot is
scoped with the part's state, and `as` renders an element when there is no child to wrap:

```vue
<Draggable id="a" v-slot="{ state }">
    <Card ref="card" :class="{ lifted: state.dragging }" @pointerdown="track" />
</Draggable>

<Droppable id="list" as="ul">
    <li v-for="item in items" :key="item">{{ item }}</li>
</Droppable>
```

Callbacks are props, written as listeners (`@drag-start`, `@drop`, `@sort-end`, `@swap`). In
development, no child, several children, a fragment (a `v-for`) or text throw, and a child that
never receives the element or its attributes is reported. Components stack:
`<Droppable><Draggable><Card /></Draggable></Droppable>`.

## Composables

`useDraggable(options)`, `useDroppable`, `useSortable`, `useSortableGroup` and `useSwappable` are
the lower layer and return `{ state, props }`, two computed refs: bind `props` (the registering
template ref, `data-dnd-*`, ARIA) on one element with `v-bind="props"`. Pass a getter or a ref for
options that change; a change updates the registration without re-registering, and callbacks are
always the latest. `useDragMonitor(listener, options?)` sees every drag of the page;
`useDragSpace()` gives the document's space once mounted, for its verbs and middleware
(`space.use`). Nothing touches the DOM while rendering, so server rendering works as is.

## Stability

DnD is unreleased. Until `1.0`, the API may break between minor versions, and the changelog will
say what changed and how to update.

## Credits

DnD's capabilities follow [dnd-kit](https://github.com/clauderic/dnd-kit) by Claudéric Demers
(MIT), a study reference rebuilt on Fragiola's architecture. See [LICENSE](./LICENSE).
