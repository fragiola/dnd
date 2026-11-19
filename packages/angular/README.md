# @fragiola/dnd-angular

Composable Angular drag and drop for **DnD**, the headless, extremely light drag and drop of the
Fragiola family: draggables, droppables, sortable lists and grids, swappable items, drag handles and
an optional overlay, through mouse, touch, pen and the keyboard.

DnD is **headless**. It ships the behaviour, the accessibility and the directives, and **no CSS, no
icons, no rendered overlays of its own look and no text**: a directive adds no element, it adds
behaviour to the element it sits on, and you style it with `class`, `style` and the `data-dnd-*`
attributes it exposes. Every visible word and accessible name comes from you.

Documentation, guides and live examples: **<https://fragiola.com/dnd>** (the Angular API:
[`@fragiola/dnd-angular`](https://fragiola.com/dnd/docs/api/angular)).

## Install

```sh
pnpm add @fragiola/dnd-angular
```

This one package is all an Angular app installs: it re-exports the whole core
([`@fragiola/dnd`](https://www.npmjs.com/package/@fragiola/dnd): the drag space, the sensors, the
collision strategies, the types), entry by entry, so everything is imported from
`@fragiola/dnd-angular`. It depends on the core at the exact same version. `@angular/core` **^22**
is a peer dependency. Standalone directives only (no NgModule), zoneless-safe, in the Angular
Package Format (ESM only).

## Entries

Each capability is its own entry, so an app ships only the capabilities it imports. Each entry
re-exports the core's entry of the same name.

| entry                             | what it adds to the core's entry                                                                        |
| --------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `@fragiola/dnd-angular`           | `DndDragOverlay`, `injectDragMonitor`, `injectDragSpace` (and the whole shared core)                    |
| `@fragiola/dnd-angular/draggable` | `DndDraggable`, `DndDragHandle` (and `registerDraggable`)                                               |
| `@fragiola/dnd-angular/droppable` | `DndDroppable` (and `registerDroppable`)                                                                |
| `@fragiola/dnd-angular/sortable`  | `DndSortable`, `DndSortableGroup`, `DndDragHandle` (and `registerSortable`, the strategies and helpers) |
| `@fragiola/dnd-angular/swappable` | `DndSwappable`, `DndDragHandle` (and `registerSwappable`, `swapItems`, `swapBetween`)                   |

## A minimal drag and drop

No provider, and the two halves in unrelated parts of the page:

```ts
import { Component, signal } from "@angular/core";
import { DndDraggable } from "@fragiola/dnd-angular/draggable";
import { DndDroppable } from "@fragiola/dnd-angular/droppable";

@Component({
    selector: "app-board",
    imports: [DndDraggable, DndDroppable],
    template: `
        <main>
            <aside>
                @if (!inBox()) {
                    <div dndDraggable="card" type="task" class="card">Drag me</div>
                }
            </aside>
            <section dndDroppable="box" [accepts]="['task']" (drop)="inBox.set(true)" aria-label="Drop here" class="box">
                @if (inBox()) {
                    <div class="card">Dropped</div>
                }
            </section>
        </main>
    `,
})
export class Board {
    readonly inBox = signal(false);
}
```

Neither directive adds an element. `[dndDraggable]` registers the `div` in its document's drag
space, makes it a tab stop (Space or Enter grabs, the arrows move, Escape cancels) and marks it
`data-dnd-part="draggable"`, `data-dnd-id="card"` and, while it moves, `data-dnd-dragging`; during
the drag the core moves it with the CSS `translate` property, once per frame, with no change
detection. `[dndDroppable]` marks its element `data-dnd-over`, `data-dnd-refused` or
`data-dnd-active`.

## The directives

A directive acts on its host element: the main input is the part's id (`dndDraggable="a"`,
`[dndSortable]="item.id"`), the options are inputs (`[disabled]`, `[accepts]`, `[index]`, `group`,
`[translate]="false"`, …) and the callbacks are outputs (`(dragStart)`, `(dragEnd)`, `(drop)`,
`(sortEnd)`, `(swap)`, …). `exportAs` gives the part's state as a signal, for your bindings:

```html
<li [dndSortable]="item.id" [index]="$index" group="todo" #card="dndSortable" [class.lifted]="card.state().dragging">
    <button type="button" dndDragHandle aria-label="Drag">⋮</button>
    {{ item.title }}
</li>
```

Directives stack on one element (`<li dndDraggable="a" dndDroppable="z">` is marked
`data-dnd-part="draggable droppable"`), and they share an input of the same name (`disabled`,
`scope`, …). A static attribute of an input's name sets it, as in any Angular directive (`type` on a
`<button>` is the draggable's `type`). The host's own attributes, classes, styles and listeners are
untouched, and its template listeners run before the core's: an app's `(pointerdown)` sees a press
before dnd claims it. The overlay is a template, rendered into the document's `body` during a drag:

```html
<ng-template dndDragOverlay overlayClass="ghost" let-operation>{{ operation.source.id }}</ng-template>
```

`injectDragMonitor(listener, options?)` sees every drag of the page; `injectDragSpace()` gives the
document's space once rendered, for its verbs and middleware (`space.use`). Nothing subscribes on
the server, so server rendering works as is.

## Stability

DnD is unreleased. Until `1.0`, the API may break between minor versions, and the changelog will
say what changed and how to update.

## Credits

DnD's capabilities follow [dnd-kit](https://github.com/clauderic/dnd-kit) by Claudéric Demers
(MIT), a study reference rebuilt on Fragiola's architecture. See [LICENSE](./LICENSE).
