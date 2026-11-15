# Walking skeleton report (Epic #1)

What the walking skeleton set out to prove, what held, what it measured, where it departs from
dnd-kit and from the Fragiola rules on purpose, and what it hands to the sortable and swappable
Epic (#6).

## The bets

| # | bet | held? | how we know |
|---|---|---|---|
| 1 | **Wrapper without HTML.** `<Draggable id="a"><Card /></Draggable>` renders nothing of its own and merges into a plain element or any Fragiola primitive. | Yes | Component tests assert the DOM is exactly the child's, the merged props, refs and handlers, stacking (`data-dnd-part="draggable droppable"`), the inline style allow-list and the development errors for invalid children (`packages/react/tests`). A test wraps a component that forwards props and ref as `Dockable.Tab` does, and both libraries' attributes and handlers survive. In the examples the wrapped elements are `article`, `li`, `section`, a `button` handle and `Dockable.TabSet`. |
| 2 | **No provider.** Draggables and droppables meet through a drag space per document. | Yes | The fixture spec drags between unrelated subtrees with no common wrapper (Chromium, Firefox); two scopes never meet; an explicit `createDragSpace` is isolated from the document's; a core test moves an element into another document (a popout) and it meets that document's droppables. `hello-dnd` and `scopes` show it in the gallery. |
| 3 | **Pay for what you import.** Importing only `/draggable` ships no droppable code. | Yes, with a size target missed | The bundle test builds a fixture per capability and fails when another capability's code is in the output; a guard test fails when a capability imports another. The draggable entry is larger than its D13 target (see Numbers). |
| 4 | **A drag does not render React.** The core writes `translate` once per frame; React commits only when a part's state changes. | Yes | Zero commits while the pointer moves inside one droppable: a Profiler test in jsdom and a render counter in the fixture, in Chromium and Firefox. The hand-off at drop does not flicker: the core clears `translate` after `onDrop`/`onDragEnd`, so an element the app moved goes straight to its new place, and one the app did not move can glide home with an at-rest transition (`styling-showcase`, asserted in its spec). |
| 5 | **One pipeline for every input.** Pointer Events with capture for mouse, touch and pen; a keyboard path with the same events. | Yes | The same Playwright spec runs on an LTR and an RTL fixture in Chromium and Firefox (drag, click under the threshold, handle, no-drag controls, Escape, `pointercancel`, lost capture, `accepts`, keyboard step and targets, overlay, auto-scroll), a touch spec on a phone with the delay activation, and the `touch` example's spec drives real touch input (a held finger drags, a moving finger scrolls). |
| 6 | **Plays well with the family.** Nested presses claimed, primitives wrapped, moved elements, drops through the siblings' commands. | Yes | Playground interop scenarios: a draggable in a Dockable panel keeps working after `tab.move`; a `Droppable` around `Dockable.TabSet` runs `tab.add`; a draggable in a `GridLayout.Item` drags without moving the item, and a drop on the grid runs `item.add` through `gridLayoutRef` (when `../grid-layout` is present). The examples `dockable-new-tab` (with a cross-library rule: `space.use` asking `model.can`) and `dockable-panels` show the Dockable side in the gallery. |

## Numbers

Measured on the development machine; informative, not gates.

| what | result |
|---|---|
| `@fragiola/dnd-react` (shared entry, with the core), min + gzip | 3.5 KB (target ≤ 4 KB: met) |
| `+ /draggable` | 7.7 KB, +4.3 KB over the shared entry (target ≤ +2 KB: **missed**) |
| `+ /droppable` | 4.6 KB, +1.1 KB (target ≤ +1.5 KB: met) |
| all three entries | 8.1 KB |
| only `Draggable` / only `Droppable` (tree-shaken) | 6.1 KB / 2.9 KB |
| React commits while a drag moves inside one droppable | 0 |
| React commits at a drag's start | 1 for the source, 1 per droppable of its scope (it becomes active), 1 for the droppable it starts over |
| React commits per target change | 1 for the droppable left, 1 for the one entered (a `DragOverlay` adds 1) |
| React commits at the drop | 1 for the source, 1 per droppable it met (back to rest) |
| `translate` writes | at most 1 per animation frame |
| unit and component tests | 244 (core 104, React 44, examples 41, site 32, playground 23) |
| e2e | 92 in the playground (Chromium, Firefox, a phone), 112 in the examples app with `E2E_ALL_THEMES=1` (every example in five themes, inside an iframe, and its own spec) |

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

Recorded in [`examples-gaps.md`](examples-gaps.md). Open:

- **`DragOverlay`'s state functions run while idle** with no operation, against their type (E1).
- **The first `drag-over` repeats the start place**, so an announcer must skip it (E2).
- **An arrow pressed before a keyboard drag's first frame** counts from no target (E3).
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

## For the sortable and swappable Epic (#6)

- **Re-parenting during a drag.** A sortable moves the dragged element (or its siblings) in the
  DOM while it is dragged. Pointer capture is on the activator: re-parenting it fires
  `lostpointercapture`, which cancels the drag today (D9). Sortable needs to re-capture after a
  move, or ignore a `lostpointercapture` that follows its own re-parenting, and the
  `translate`'s base must be re-measured after it (the operation already re-measures on
  `invalidate`).
- **The keyboard's targets mode** is dnd-kit's sortable keyboard idea and already orders targets
  in reading order (RTL aware); sortable can reuse `readingOrder` for item-to-item moves. E3 (an
  arrow before the first frame) should be fixed there.
- **Placeholders and the overlay.** Sortable lists in clipped containers will lean on
  `DragOverlay`; E1 should be fixed first, and an overlay that keeps the grab offset
  (`grabOffset`) is ready.
- **Commits per reorder.** Bet 4 should hold for a reorder: the items' new places written
  imperatively during the drag, one React commit when the order changes, none per frame.
- **Size.** Sortable will import the draggable and droppable logic through the shared core; the
  draggable entry is already over its target, so sortable's budget should be measured against
  "all three" (8.1 KB), and shared pieces moved into the core only when two capabilities use them.
- **Scroll anchoring (E4)**: a sortable list is a scroll container whose children move; setting
  `overflow-anchor: none` on the containers during a drag likely belongs in the core then.
