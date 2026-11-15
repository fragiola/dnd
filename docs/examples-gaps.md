# Gaps found while writing the examples

What the public surface could not express while the examples of Epic #1 were written, what each
example does meanwhile, and where it is (or will be) answered. An example's workaround is commented
in its code, where readers copy it.

| # | gap | the examples meanwhile | answered |
|---|---|---|---|
| E1 | `DragOverlay`'s `className` and `style` functions are called while no drag runs, with `state.operation` undefined, though its type says it is always there. | `drag-overlay` gives the overlay a plain class. | Open (Epic #6): make `operation` optional in `DragOverlayState`, or skip the state functions while idle. Documented on the API page. |
| E2 | The first `drag-over` of a drag reports the droppable it starts over, right after `drag-start`; an announcer that says every `drag-over` replaces the "Picked up" sentence before a screen reader reads it. | `keyboard`'s narrator (`_kit/announce.ts`, `createNarrator`) skips a first `drag-over` that comes before the drag moved 8 px. | App policy (the words are the app's, D14), documented in keyboard and accessibility. Epic #6 may mark it (`operation.delta` is zero for the keyboard). |
| E3 | An arrow key pressed before a keyboard drag's first animation frame counts from no target: in `"targets"` mode it goes to the first droppable in reading order, not the next one. | The `keyboard` and `rtl` specs wait for the start column's `data-dnd-over` before the first arrow. | Open (Epic #6): the keyboard sensor could run the first frame at once, or read the start target from the measurement at start. Listed in the limitations. |
| E4 | Firefox's scroll anchoring can take the dragged element (moved by `translate`) as the scroll container's anchor: when the core clears `translate` after a cancel at the end of the range, Firefox scrolls the container back by as much (measured: 1032 px to 0). Chromium does not. | `auto-scroll` sets `overflow-anchor: none` on its list. | Open (Epic #6): the core could set `overflow-anchor: none` on the scroll containers during a drag (structural, D7) — a maintainer's decision. Listed in the limitations. |
| E5 | A Fragiola palette class (`palette-danger`) is a plain CSS class: a Tailwind variant cannot apply it (`data-dnd-refused:palette-danger` compiles nothing). | `accepts-types` and `dockable-new-tab` render a small badge that carries the palette and is shown with `group-data-dnd-refused:`. | By design (Fragiola UI's palettes). |
| E6 | A Dockable panel clips its content, so a card moved by its own `translate` vanishes at the panel's edge. | `dockable-panels` uses `translate={false}` and a `DragOverlay`. | By design (D9): the overlay exists for this. Documented in the Dockable guide. |
| E7 | A card pressed while it still glides home (its at-rest transition on `translate`) moves away from the press point. | The `styling-showcase` spec waits for the glide to end. | By design: the transition is the app's. |
| E8 | Grid Layout is not on npm, so no gallery example can import it. | The Grid Layout integration stays a playground scenario (`interop/grid-layout-item`). | Once Grid Layout is published (D12). |
