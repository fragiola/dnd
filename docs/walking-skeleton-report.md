# Walking skeleton report (Epic #1)

What the walking skeleton set out to prove, what held, what it measured, where it departs from
dnd-kit and from the Fragiola rules on purpose, and what it hands to the sortable and swappable
Epic (#6).

## The bets

| #   | bet                                                                                                                                                      | held?                          | how we know                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Wrapper without HTML.** `<Draggable id="a"><Card /></Draggable>` renders nothing of its own and merges into a plain element or any Fragiola primitive. | Yes                            | Component tests assert the DOM is exactly the child's, the merged props, refs and handlers, stacking (`data-dnd-part="draggable droppable"`), the inline style allow-list and the development errors for invalid children (`packages/react/tests`). A test wraps a component that forwards props and ref as `Dockable.Tab` does, and both libraries' attributes and handlers survive. In the examples the wrapped elements are `article`, `li`, `section`, a `button` handle and `Dockable.TabSet`. |
| 2   | **No provider.** Draggables and droppables meet through a drag space per document.                                                                       | Yes                            | The fixture spec drags between unrelated subtrees with no common wrapper (Chromium, Firefox); two scopes never meet; an explicit `createDragSpace` is isolated from the document's; a core test moves an element into another document (a popout) and it meets that document's droppables. `hello-dnd` and `scopes` show it in the gallery.                                                                                                                                                         |
| 3   | **Pay for what you import.** Importing only `/draggable` ships no droppable code.                                                                        | Yes, with a size target missed | The bundle test builds a fixture per capability and fails when another capability's code is in the output; a guard test fails when a capability imports another. The draggable entry is larger than its D13 target (see Numbers).                                                                                                                                                                                                                                                                   |
| 4   | **A drag does not render React.** The core writes `translate` once per frame; React commits only when a part's state changes.                            | Yes                            | Zero commits while the pointer moves inside one droppable: a Profiler test in jsdom and a render counter in the fixture, in Chromium and Firefox. The hand-off at drop does not flicker: the core clears `translate` after `onDrop`/`onDragEnd`, so an element the app moved goes straight to its new place, and one the app did not move can glide home with an at-rest transition (`styling-showcase`, asserted in its spec).                                                                     |
| 5   | **One pipeline for every input.** Pointer Events with capture for mouse, touch and pen; a keyboard path with the same events.                            | Yes                            | The same Playwright spec runs on an LTR and an RTL fixture in Chromium and Firefox (drag, click under the threshold, handle, no-drag controls, Escape, `pointercancel`, lost capture, `accepts`, keyboard step and targets, overlay, auto-scroll), a touch spec on a phone with the delay activation, and the `touch` example's spec drives real touch input (a held finger drags, a moving finger scrolls).                                                                                        |
| 6   | **Plays well with the family.** Nested presses claimed, primitives wrapped, moved elements, drops through the siblings' commands.                        | Yes                            | Playground interop scenarios: a draggable in a Dockable panel keeps working after `tab.move`; a `Droppable` around `Dockable.TabSet` runs `tab.add`; a draggable in a `GridLayout.Item` drags without moving the item, and a drop on the grid runs `item.add` through `gridLayoutRef` (when `../grid-layout` is present). The examples `dockable-new-tab` (with a cross-library rule: `space.use` asking `model.can`) and `dockable-panels` show the Dockable side in the gallery.                  |

## Numbers

Measured on the development machine; informative, not gates.

| what                                                            | result                                                                                                                                                                |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@fragiola/dnd-react` (shared entry, with the core), min + gzip | 3.6 KB (target ≤ 4 KB: met)                                                                                                                                           |
| `+ /draggable`                                                  | 8.0 KB, +4.3 KB over the shared entry (target ≤ +2 KB: **missed**)                                                                                                    |
| `+ /droppable`                                                  | 4.8 KB, +1.1 KB (target ≤ +1.5 KB: met)                                                                                                                               |
| all three entries                                               | 8.4 KB                                                                                                                                                                |
| only `Draggable` / only `Droppable` (tree-shaken)               | 6.3 KB / 3.0 KB                                                                                                                                                       |
| React commits while a drag moves inside one droppable           | 0                                                                                                                                                                     |
| React commits at a drag's start                                 | 1 for the source, 1 per droppable of its scope (it becomes active), 1 for the droppable it starts over                                                                |
| React commits per target change                                 | 1 for the droppable left, 1 for the one entered (a `DragOverlay` adds 1)                                                                                              |
| React commits at the drop                                       | 1 for the source, 1 per droppable it met (back to rest)                                                                                                               |
| `translate` writes                                              | at most 1 per animation frame                                                                                                                                         |
| unit and component tests                                        | 250 (core 108, React 46, examples 41, site 32, playground 23)                                                                                                         |
| e2e                                                             | 92 in the playground (Chromium, Firefox, a phone), 112 in the examples app with `E2E_ALL_THEMES=1` (every example in five themes, inside an iframe, and its own spec) |

The sizes come from `pnpm size`: an app's production build of the entries it imports, with the
core they pull, React left out and the development checks dropped. **Why the draggable misses:**
the draggable capability carries, for every draggable, the pointer sensor (distance and held-touch
activation, capture, the press claim and its focus fix), the keyboard sensor (steps and the
targets mode in reading order), the drag operation (measurement, collision, the once-per-frame
writer, the events) and the guards that cancel a drag cleanly when app code throws. A size pass
dropped the development messages from production builds (3.8 → 3.5 KB for the shared entry); the
draggable path did not move measurably. Loading the targets mode lazily (about 0.3 KB) would make a
drag's first arrow keys wait for a chunk, so it stays.

## Deliberate deviations from dnd-kit

dnd-kit (`../references/dnd-kit`, `ccaf3d5`) was the capability reference, never copied: no file
is derived from it, so `DERIVED` and `NOTICES` in the guard test are still empty and the LICENSE
carries no dnd-kit notice yet.

1. **No provider.** dnd-kit needs a `DndContext` around every draggable and droppable that meet;
   here a drag space per document, created lazily, and an optional `createDragSpace`.
2. **Wrappers clone their child** and render no element; dnd-kit's hooks hand back
   `setNodeRef`, `attributes` and `listeners` to spread (dnd's hooks keep that lower layer as
   `{ state, props }`).
3. **`translate`, never `transform`.** dnd-kit gives the app a transform to apply; dnd writes the
   CSS `translate` property itself, imperatively, once per frame, so it composes with a host that
   owns `transform` (Grid Layout's items) and React never renders per frame.
4. **One package per framework, an entry per capability**, re-exporting the core: dnd-kit's core
   holds draggable and droppable together.
5. **No default texts.** dnd-kit ships default screen reader instructions and announcements and an
   `aria-roledescription`; dnd sets no role, name or text at all, and the app builds its live
   region from `useDragMonitor` (the examples' `_kit/announce.ts`).
6. **Pointer Events with capture for every input**, instead of separate mouse, touch and pointer
   sensors; touch activation by a held delay with a tolerance.
7. **The press is claimed on `pointerdown`** (see below), where dnd-kit activates on move.
8. **Drop rules are middleware on the space** (`space.use`), asked as a dry run on hover and for
   real on release, with the Fragiola verbs (`can`, `check`), instead of a check in `onDragEnd`.
9. **No modifiers** beyond `autoScroll`, no drop animation, no measuring strategies to choose:
   rects are measured at start, on scroll or resize, and when droppables change.

## Deviations from the Fragiola rules

- **D3, no single namespace.** Fragiola libraries export one namespace (`Dockable.*`). A namespace
  gathers every capability into one import, which defeats bet 3, so parts are named exports of
  their capability's entry.
- **D6, the wrapper clones its child.** The Fragiola rule is "`render`, never `asChild`"; dnd's
  primary form is the cloned child, because it exists to add behaviour to elements other code
  renders (a tabset, a grid item). `render` is accepted as the alternative.
- **D11, the press claim and the focus fix.** Claiming a press with `preventDefault()` on
  `pointerdown` is what lets Grid Layout (which ignores `defaultPrevented` presses) leave a
  nested drag alone. Measured in Chromium and Firefox, it suppresses the compatibility mouse
  events (`mousedown`/`mouseup`: an app's `onMouseDown` on a draggable does not run; `click`
  still fires) and the focus a press gives. The claim stays, and the pointer sensor gives that
  focus itself, to the press's closest focusable element inside the activator. Text selection is
  prevented while a press lasts, on purpose. Native controls and `data-dnd-no-drag` subtrees are
  never claimed. This is documented on the sensors page and in the limitations.

## What the examples could not express

Recorded in [`examples-gaps.md`](examples-gaps.md). Fixed in the Epic's review pass, each with a
regression test:

- **`DragOverlay`'s state functions ran while idle** with no operation, against their type (E1):
  the overlay now renders its content only while a drag runs.
- **The first `drag-over` repeated the start place**, so an announcer had to skip it (E2): the
  start target is resolved when the drag starts and carried by `drag-start`; `drag-over` reports
  only a later change.
- **An arrow pressed before a keyboard drag's first frame** counted from no target (E3): fixed by
  the same start resolution.

Open:

- **Firefox scroll anchoring** scrolls a container back when `translate` is cleared after a
  cancel; `overflow-anchor: none` fixes it (E4). This explains the "Firefox scrollTop resets
  after a drop" observation: it happens on a cancel (or a release outside any droppable) with the
  container scrolled to its end, never in Chromium.
- **Grid Layout is not on npm**, so its integration is a playground scenario, not an example (E8).
  A change in Grid Layout's API can break that scenario unnoticed until its e2e runs with
  `../grid-layout` present.

## Found on the way

- A CSS transition takes the after-change style: the core clears `translate` and React removes
  `data-dnd-dragging` before the next style recalc, so a transition on `translate` that applies
  only at rest runs on a cancel. The styling guide documents it as the glide home.
- An element whose `translate` extends its scroll container's overflow fed auto-scroll without
  end; the range is now measured when the drag starts (fixed in #3, documented as a limit: content
  that grows during a drag is not scrolled into).
- Dockable's own tab drags are native HTML5 drag and drop inside its root, and dnd's are Pointer
  Events: the two never meet, and their attributes do not collide (`data-dragging`,
  `data-dnd-dragging`).

## Fixed in the Epic's review pass

Each with a regression test, besides E1–E3 above:

- A wrapper read its consumers' refs (its `ref`, the child's own) only when the element attached,
  so a ref that changed later never received the element; they now follow each render, as on a
  plain element, while the registration still attaches once (`packages/react/tests/wrapper.test.tsx`).
- `space.check`/`can` took the first draggable and droppable of each id, so ids repeated across
  scopes answered for the wrong droppable; it now picks the pair that shares a scope
  (`packages/core/tests/verbs.test.ts`).
- A throw in the frame a release flushes cancelled the drag, and the drop still ran after it
  (`onDragCancel`, then `onDrop` and `onDragEnd`); the drop now stops there
  (`packages/core/tests/errors.test.ts`).
- Docs that contradicted the code: the errors paragraph, the styling guide's "cancel" on a release,
  `subscribe`'s options, the shared entry's contents, refocus after Tab, the overlay's inline style
  and a droppable's re-renders.

## For the sortable and swappable Epic (#6)

- **Re-parenting during a drag.** A sortable moves the dragged element (or its siblings) in the
  DOM while it is dragged. Pointer capture is on the activator: re-parenting it fires
  `lostpointercapture`, which cancels the drag today (D9). Sortable needs to re-capture after a
  move, or ignore a `lostpointercapture` that follows its own re-parenting, and the
  `translate`'s base must be re-measured after it (the operation already re-measures on
  `invalidate`).
- **The keyboard's targets mode** is dnd-kit's sortable keyboard idea and already orders targets
  in reading order (RTL aware); sortable can reuse `readingOrder` for item-to-item moves.
- **Placeholders and the overlay.** Sortable lists in clipped containers will lean on
  `DragOverlay` (E1 is fixed), and an overlay that keeps the grab offset (`grabOffset`) is
  ready.
- **Commits per reorder.** Bet 4 should hold for a reorder: the items' new places written
  imperatively during the drag, one React commit when the order changes, none per frame.
- **Size.** Sortable will import the draggable and droppable logic through the shared core; the
  draggable entry is already over its target, so sortable's budget should be measured against
  "all three" (8.4 KB), and shared pieces moved into the core only when two capabilities use them.
- **Scroll anchoring (E4)**: a sortable list is a scroll container whose children move; setting
  `overflow-anchor: none` on the containers during a drag likely belongs in the core then.

## Sortable and swappable (Epic #6)

What Epic #6 added on the walking skeleton, measured the same way. The decisions are S1–S5 in
`AGENTS.md`; the capability-by-capability comparison with dnd-kit is
[`dnd-kit-parity.md`](dnd-kit-parity.md).

### The bets, again

All six held for the new entries. A sortable list and a swap grid need no provider and no wrapper
around the list (bet 2), `Sortable`, `SortableGroup` and `Swappable` render exactly their child
(bet 1), only `Sortable` ships no swappable, draggable-only or droppable code and only `Swappable`
none of sortable's (bet 3, the bundle test), the preview is `translate` shifts written by the core
with no React commit (bet 4), the same fixture spec runs pointer, keyboard and touch in LTR and RTL
in Chromium and Firefox (bet 5), and the ecosystem gallery sorts inside Dockable panels and
popouts, inside Grid Layout items and over Fragiola UI items (bet 6).

### Final sizes

`pnpm size` on the final branch (min + gzip, React entry with the core it pulls, React left out,
development checks dropped):

| imported                                     | min + gzip                       | target                     |
| -------------------------------------------- | -------------------------------- | -------------------------- |
| `@fragiola/dnd-react`                        | 3.6 KB                           | ≤ 4 KB: met                |
| `@fragiola/dnd-react` + `/draggable`         | 8.3 KB (+4.6 KB)                 | ≤ +2 KB: **missed** (D13)  |
| `@fragiola/dnd-react` + `/droppable`         | 4.8 KB (+1.1 KB)                 | ≤ +1.5 KB: met             |
| `@fragiola/dnd-react` + `/sortable`          | 11.1 KB (+7.4 KB)                | ≤ +2.5 KB: **missed** (S5) |
| `@fragiola/dnd-react` + `/swappable`         | 9.0 KB (+5.4 KB)                 | ≤ +1.5 KB: **missed** (S5) |
| the shared entry, `/draggable`, `/droppable` | 8.8 KB                           |                            |
| those three + `/sortable`                    | 11.7 KB (+2.9 KB over the three) |                            |
| those three + `/swappable`                   | 9.7 KB (+0.9 KB over the three)  |                            |
| all five                                     | 12.4 KB                          |                            |
| only `Draggable` / `Droppable`               | 6.6 KB / 3.1 KB                  |                            |
| only `Sortable` / `Swappable`                | 8.7 KB / 7.2 KB                  |                            |

The draggable entry measures 8.3 KB now (8.0 KB at the end of Epic #1): issue #7 moved its drag-source registration into the shared core (`source.ts`), so that sortable and swappable use it without importing `/draggable` (S1). **Why S5 misses:** its targets are counted "on top of the shared core", but a sortable or
swappable item is a drag source, and carries the same pointer and keyboard sensors, drag operation
and `translate` writer as a draggable: about 4.6 KB that the draggable entry pays too. Measured
over that machinery (the three Epic #1 entries), sortable adds 2.9 KB (the groups as drop targets,
the three strategies, the keyboard slots and the helpers) and swappable 0.9 KB. An app that uses
draggables and a sortable list pays the shared part once. Making the machinery smaller would
lower all three entries at once; it is the next size pass, not a sortable one.

### React commits per sort and per swap

Measured by the React tests (`packages/react/tests/sortable.test.tsx`, `swappable.test.tsx`,
Profiler) and the fixture's render counter (`apps/playground/e2e/sortable.spec.ts`, Chromium and
Firefox):

| moment                          | sortable                                                                                                        | swappable                                                           |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| the start                       | 1 per item and `SortableGroup` of the groups taking part (they become `data-dnd-sorting`), the source with them | 1, the source (`data-dnd-dragging`)                                 |
| the preview, however it changes | **0**: the shifts are `translate`, written by the core at most once per frame                                   | **0**: the target's shift and `data-dnd-swap-target` are the core's |
| the drop                        | the app's own commit of its new order (one), then 1 per item back to rest, in the same frame                    | the app's commit, then 1 for the source                             |

The first frame after a release already shows the app's new order with no shift left (asserted in
the fixture spec), so a drop never flickers, and a transition scoped to `[data-dnd-sorting]` never
animates it (S4).

### The examples and the gallery

Eleven examples (`sortable-list`, `sortable-horizontal`, `sortable-grid`, `kanban`,
`sortable-handle`, `sortable-keyboard`, `sortable-rtl`, `swap-grid`, `swap-between-groups`,
`sortable-dockable`, `sortable-fragiola-ui`), each with its own e2e spec, in the five themes and
inside the iframe; two playground scenarios (`interop/grid-layout-kanban`,
`interop/dockable-popout-sortable`). Dockable popouts run under Playwright (Chromium and Firefox):
the popout scenario sorts in the main window, in the popout window's own drag space, and again
once docked back. What the examples could not express is in [`examples-gaps.md`](examples-gaps.md)
(E9–E12); none needed a package change.

### The hand-off items, answered

- **Re-parenting during a drag** never happens: the preview is `translate` shifts, the DOM moves
  only when the app commits (S2), so no `lostpointercapture`.
- **The keyboard's targets mode** became the sortable slots and the swap targets, over
  `readingOrder`.
- **Placeholders and the overlay**: `translate={false}` makes the dragged item its own
  placeholder, shifted to where it lands, while a `DragOverlay` carries the copy
  (`sortable-dockable`, the Grid Layout kanban).
- **Commits per reorder**: see the table above.
- **Size**: measured against the three Epic #1 entries, as planned (above).
- **Scroll anchoring (E4)**: left to the app, as documented CSS (S4); every example sets it.

### Validation

`pnpm check`, `typecheck`, `test` (304: core 144, React 62, playground 23, examples 41, site 34),
`build`, `size`, `E2E_ALL_THEMES=1 pnpm e2e` (156 in the playground: Chromium, Firefox and a
phone, the Grid Layout scenarios included; 195 in the examples app: every example in five themes,
inside an iframe, and its own spec) and `pnpm site:export --base /dnd` (validated).
