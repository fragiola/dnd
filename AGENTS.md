# DnD

A **headless, extremely light drag and drop** for the Fragiola family. It ships behaviour,
accessibility and composable wrappers. It ships **no CSS, no icons, no rendered overlays of its own
look and no text**. Styling belongs 100% to the consuming developer; the packages never assume
Tailwind, shadcn or anything else.

Its capability reference is dnd-kit (`../references/dnd-kit`, `clauderic/dnd-kit` at `ccaf3d5`,
MIT, "Copyright (c) 2021, Claudéric Demers"), a **study reference, never copied**. Its architecture
is Fragiola's, shared with Dockable (`../dockable`), Grid Layout (`../grid-layout`) and Data Grid
(`../data-grid`): a framework-free core, one thin adapter per framework (React first), composable
React wrappers that act **on the element they wrap**, **no mandatory provider**, every capability
its own entry, and easy composition with Dockable and Grid Layout.

Other adapters follow React (Vue, Epic #17; Angular, Epic #20), so **every piece of logic that isn't
rendering lives in the core**, and what only an adapter calls is the core's `@fragiola/dnd/adapter`
entry ([The adapter kit](#the-adapter-kit-fragioladndadapter)).

| package                  | name                    | contains                                                                                                                                                                                                | depends on                                                      |
| ------------------------ | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `packages/core`          | `@fragiola/dnd`         | the shared core (drag space, sensors, collision, events, types) and one entry per capability (`/draggable`, `/droppable`, `/sortable`, `/swappable`), plus `/adapter`, the kit only the adapters import | DOM only, zero runtime deps                                     |
| `packages/react`         | `@fragiola/dnd-react`   | the wrappers and hooks of each capability, re-exporting the core entry by entry: **all a React app installs**                                                                                           | `@fragiola/dnd` (same version), peer `react`, `react-dom` (^19) |
| `packages/vue`           | `@fragiola/dnd-vue`     | the components and composables of each capability, re-exporting the core entry by entry: **all a Vue app installs**                                                                                     | `@fragiola/dnd` (same version), peer `vue` (^3.5)               |
| `packages/angular`       | `@fragiola/dnd-angular` | the directives and injection functions of each capability (ng-packagr secondary entries), re-exporting the core entry by entry: **all an Angular app installs**; published from its `dist`              | `@fragiola/dnd` (same version), peer `@angular/core` (^22)      |
| `apps/playground`        | private                 | the dev app (every site example live, dev-only scenarios, themes and source), unstyled fixture pages driven by Playwright                                                                               | both packages, `examples/react`                                 |
| `examples/shared`        | `examples-shared`       | what every framework's examples share: metadata, themes, embed protocol, manifest builder, loader generator, every e2e spec; imports no framework                                                       |                                                                 |
| `examples/react`, `site` | private                 | the site's React examples (the embed app) and pages, exported for fragiola.com                                                                                                                          | `examples-shared`                                               |
| `examples/vue`           | `examples-vue`          | the site's Vue examples (the Vue embed app): every React example, same id                                                                                                                               | `examples-shared`, `@fragiola/dnd-vue`                          |
| `examples/angular`       | `examples-angular`      | the site's Angular examples (the Angular embed app, zoneless): every React example, same id                                                                                                             | `examples-shared`, `@fragiola/dnd-angular`                      |

## Non-negotiable rules

These are the decisions of Epic #1. A change that breaks one is a decision for the maintainer, not
an implementation detail.

1. **Names (D1).** Packages `@fragiola/dnd` (core) and `@fragiola/dnd-react` (React). **An app
   installs only `@fragiola/dnd-react`**, as with `@fragiola/dockable-react`: it depends on the
   core at the exact same version and re-exports it, `export *` per entry, so every import comes
   from `@fragiola/dnd-react[/<capability>]`. Repo `fragiola/dnd`; fragiola.com slug `/dnd`
   (`site/project.json` slug `dnd`, title `DnD`); www `devUrl` `http://localhost:5183`. Core
   creator `createDragSpace`. State attributes are namespaced `data-dnd-*` (D7). Example theme
   tokens are `--dnd-*`, in examples only.
2. **Own implementation, referenced source (D2).** `../references/dnd-kit` is read-only, never
   modified and never copied wholesale. When an algorithm is derived from it (a collision
   strategy, keyboard coordinates), the file starts with a header naming dnd-kit, the upstream
   file, the copyright line and the MIT licence. The root `LICENSE` appends dnd-kit's notice when
   the first derived file lands, and each package ships an identical copy.
   `packages/core/tests/guard.test.ts` lists the derived files (`DERIVED`) and the notice lines
   (`NOTICES`). Code reused from a Fragiola sibling (`useRender`, `mergeProps`, `check-dts.ts`,
   `size-report.ts`, `site/contract.ts`, `source-condition.ts`, …) carries the lighter header
   `// From Grid Layout (fragiola/grid-layout, <path>), same author and licence.` (or Dockable's,
   as the multi-framework `examples/shared` and `site/{export,dev,dev-proxy,sources}.ts` do, or
   Data Grid's).
3. **Entries are capabilities (D3).** The layering is:

   ```
   @fragiola/dnd-react               shared core: drag space, collision, events, auto-scroll, DragOverlay, types
       ├── /draggable                Draggable, DragHandle, useDraggable (and the pointer and keyboard sensors)
       ├── /droppable                Droppable, useDroppable
       ├── /sortable                 Sortable, SortableGroup, useSortable, the strategies and helpers (S2)
       └── /swappable                Swappable, useSwappable, the helpers (S3)
   ```

   Each subpath exists in both packages: `@fragiola/dnd/draggable` holds the logic, and
   `@fragiola/dnd-react/draggable` adds the wrapper and re-exports it. `sideEffects: false`, ESM
   only, `exports` with the `@fragiola/source` condition and a dist-only `publishConfig.exports`,
   one tsdown entry per subpath. The core has one more entry, `./adapter`, of the shared core and
   for adapters only (no adapter re-exports it). **No single namespace object** (`Dnd.*`), because a namespace
   gathers every capability into one import: **this is a deliberate deviation from the Fragiola
   "one namespace" rule**, made for the bundle-size requirement. Parts are named exports of their
   capability's entry. **A capability never imports another capability**: it imports only the
   shared core, and the shared core imports no capability. A guard test enforces it.
4. **No provider: one drag space per document (D4).** The core keeps a `WeakMap<Document,
   DragSpace>`, created on the first registration from that element's `ownerDocument`. Nothing is
   created on import, and nothing on the server. A draggable or droppable registers itself on
   mount and unregisters on unmount; no React context is required anywhere. An optional `scope`
   string (default: the document's default scope) isolates groups: a draggable only meets
   droppables of its scope. An optional `createDragSpace({ document })` gives an explicit,
   isolated space (tests, micro-frontends), passed as the `space` prop; it is never required.
   Callbacks are local: `onDragStart`/`onDragMove`/`onDragEnd`/`onDragCancel` on the draggable,
   `onDragEnter`/`onDragOver`/`onDragLeave`/`onDrop` on the droppable. Page-wide observers
   subscribe with `subscribe(listener, { document | space, scope? })` in the core, or
   `useDragMonitor(listener, options)` in React: the only, optional, "global" API. A drag never
   crosses documents: a drag inside a Dockable popout stays in that window.
   **The drag space is the engine: five verbs.** dnd has no domain model (the app's data stays
   the app's), so the `DragSpace` follows the engine side of the Fragiola model API and exposes
   exactly `run`, `can`, `check`, `get`, `is`, `use`, `subscribe` and `adapter` (a guard test and a
   type fixture keep it exact). Keys are kebab-case, typed by registries (`DragSpaceGetMap`,
   `DragSpaceIsMap`, `DragSpaceRunMap`, `DragSpaceCheckMap`); a new read or question is a new key,
   never a new method. `run` and `check` return a `CommandResult` and never throw. What only an
   adapter calls is under `space.adapter`; `registerDraggable`/`registerDroppable` use it. What only
   a framework adapter calls and belongs to no space (the state slot, the handle link, the option
   rule) is the `@fragiola/dnd/adapter` entry.
5. **The core (D5).** Framework-free and **zero runtime dependencies**. It never imports `react`.
   It never touches global `document`/`window`/`requestAnimationFrame`/`ResizeObserver`/
   `getComputedStyle`; all DOM access goes through an element's `ownerDocument`/`defaultView`. A
   guard test enforces all three. A drag operation is an immutable snapshot:
   `{ source: { id, type?, data? }, target?: { id, data? }, pointer, delta, rects, input:
   "pointer" | "keyboard" }`. Droppables declare `accepts` (a type list or a predicate); a refused
   hover marks `data-dnd-refused` and never reports `onDrop`. After `accepts`, a drop goes through
   the space's middleware (`space.use((ctx, next) => …)`, synchronous, outermost first): as a dry
   run (`ctx.dryRun`, no side effects) on each hover target change and in `can`/`check("drop")`,
   for real on the release, before `onDrop`/`onDragEnd`. A veto (`{ ok: false, error: { code:
   "vetoed" } }`) marks the hover refused, and on the release drops nowhere: no `onDrop`, and
   `onDragEnd` sees no `operation.target`. This is where an app writes a cross-library rule. Collision strategies are pure
   functions exported from the shared core, so unused ones are tree-shaken: `pointerWithin`
   (default), `closestCenter`, `rectIntersection`. Rects are measured at drag start and on scroll
   or resize during the drag, never on every frame.
6. **The wrapper contract (D6).** See [the wrapper contract](#the-wrapper-contract-fragioladnd-react)
   below. **The primary form is a wrapper that clones its single child**, renders no element of
   its own, and merges into it. **This is a deliberate, documented exception to the Fragiola
   "render, never asChild" rule**, chosen by the maintainer for this library: the wrapper exists
   to add behaviour to elements other code already renders.
7. **Style and state (D7).** **Inline style is structural only:** `translate` on the dragged
   element during a drag (the CSS `translate` property, **never `transform`**, so it composes with
   a host that owns `transform`, as Grid Layout's engine does), `touch-action: none` on a drag
   handle, and for `DragOverlay` its `position: fixed`, geometry, `box-sizing: border-box` and `pointer-events: none`.
   Everything else is the app's: the look of a dragged item, the placeholder, transitions, cursor
   and z-index. The packages ship no CSS file. **State only through `data-*` and ARIA**, each
   present or absent, never `"false"`, namespaced so that wrapping another primitive never
   collides with its own attributes (Dockable's `data-dragging`): `data-dnd-dragging` on the
   dragged element; `data-dnd-over` and `data-dnd-refused` on a droppable; `data-dnd-active` on a
   droppable that would accept the drag in progress; `data-dnd-disabled`, and `data-dnd-handle` on
   a handle. A component test asserts the inline style allow-list. **A part attribute on every
   element a wrapper touches** (the Fragiola path-attribute rule, so e2e selectors and tooling never
   depend on class names): `data-dnd-part="draggable" | "handle" | "droppable" | "overlay"`, and
   `data-dnd-id="<id>"` on a draggable and a droppable. Stacked wrappers on one element list their
   parts (`data-dnd-part="draggable droppable"`, matched with `~=`) and keep the inner one's id.
8. **A drag does not render React (D8).** The core writes `translate` imperatively, at most once
   per animation frame through the element's `defaultView`. React re-renders only the parts whose
   `state` changed: the source on start and end, and droppables when a drag they would accept starts and ends, and on enter and leave. A render
   counter checks zero commits while the pointer moves inside one droppable. On drop, the core
   clears `translate` after the app's `onDrop`/`onDragEnd`, so an app that moves the element in its
   own state never sees a jump.
9. **Interaction (D9).** Pointer Events with `setPointerCapture`: one path for mouse, touch and
   pen. **No HTML5 drag and drop and no drag library.** Activation is configurable per draggable
   (`activation`): mouse and pen by a distance (default 3 px); touch by a delay with a tolerance
   (default 200 ms / 5 px), so page scroll still works. Escape, `pointercancel` and a lost capture
   cancel the drag: no `onDrop`, and `onDragCancel` fires. Native controls (`input`, `textarea`,
   `select`, `button` unless it is the handle, `[contenteditable]`) never start a drag, and a
   `data-dnd-no-drag` subtree opts out. A `DragHandle` inside a draggable makes the handle the only
   place a drag starts. Auto-scroll of the nearest scroll containers near their edges is an opt-in
   strategy exported from the shared core (`autoScroll`), given to a draggable, so an app that does
   not use it does not ship it. `DragOverlay` (shared core) portals a copy the app renders under
   the pointer, for drags out of `overflow: hidden` containers (Dockable rows) and between scroll
   containers: it is the only part that renders HTML, and only because the app asks for it.
10. **Keyboard and accessibility (D10).** A draggable is a tab stop (its handle, when it has one).
    **Space or Enter grabs it**, and the arrow keys move it: by a step in px (`keyboard.step`,
    default 25), or droppable to droppable, in reading order, with `keyboard.mode = "targets"`
    (dnd-kit's sortable keyboard idea). Space or Enter drops it, and Escape cancels it. Arrows are
    visual: in RTL, ArrowRight still moves right. Focus returns to the source after a drop or
    Escape, unless the app moved it (Tab or the focus leaving cancels without refocusing). The events carry `input: "keyboard"` and name the source and
    target ids, so the app can announce them. The wrapper never adds a role or the deprecated
    `aria-grabbed`/`aria-dropeffect`; it sets `tabIndex` when the element is not focusable,
    `aria-disabled` when disabled, and `aria-describedby` only when the app passes `describedBy`.
11. **Fragiola interop (D11).** See [Interop](#interop-with-the-family) below. Nested presses are
    claimed with `preventDefault()` on `pointerdown` and a press another library already claimed is
    ignored (the claim suppresses the focus a press gives, in Chromium and Firefox, so the pointer
    sensor gives that focus back itself); dnd's `translate` and `data-dnd-*` never collide with a
    wrapped primitive's `transform` and `data-*`; a draggable keeps working after Dockable moves its element or carries
    it into a popout; drops into the family go through their commands, in app code. **The packages
    never import a sibling.**
12. **Versions and tooling (D12).** Grid Layout's toolchain: pnpm 11 (`pnpm@11.23.0`, as every
    sibling, for www's `sources-sync`; **not pnpm 12**), Node ≥ 24, Biome 2.x, TypeScript 7,
    tsdown, Vitest 5, Playwright, Vite 8, Tailwind v4 in the apps only, React 19.3, jsdom, Testing
    Library. Confirm the current stable version before installing (`npm view <pkg> version`) and
    pin exact versions published at least 7 days ago (`npm view <pkg> time`).
    `@fragiola/dockable-react` (`0.2.0`, on npm) may be a dependency of `examples/react` and
    `apps/playground` only, for the integration examples. `@fragiola/grid-layout-react` is not on
    npm: Grid Layout integrations are dev-only playground scenarios that resolve `../grid-layout`
    sources through a Vite alias when that folder exists, and are skipped otherwise. No `link:` or
    `file:` dependency is committed. The workspace packages resolve to their sources through the
    `@fragiola/source` export condition (`scripts/source-condition.ts`); the published `exports`
    are `publishConfig.exports`, without it.
13. **Size is a feature (D13).** `pnpm size` (`scripts/size-report.ts`) reports min + gzip per
    entry and per chunk. A bundle test (rolldown, through tsdown) builds a fixture that imports
    only `Draggable` and fails when droppable, sortable or swappable code is in the output; the
    same check runs for each capability. The budget (min + gzip, React entry including the core it
    pulls): the shared core ≤ 4 KB, `draggable` ≤ 2 KB extra, `droppable` ≤ 1.5 KB extra. A missed
    target is written in the report with its reason; it does not stop the work.
14. **App policy stays in the app (D14).** Reordering data, persistence, ids, undo, announcement
    text, the look of overlays and placeholders, and the Dockable and Grid Layout glue all belong
    to the examples (`_kit`), never to a package.

### Sortable and swappable (Epic #6)

These are the decisions of Epic #6, on top of D1–D14, which still hold.

1. **Entries (S1).** `./sortable` and `./swappable` exist in both packages, with D3's shape (an
   `exports` and a `publishConfig.exports` entry, a tsdown entry, `export *` of the core entry in
   the React one) and D13's size checks. Each imports only the shared core, never `draggable`,
   `droppable` or the other: what a drag source needs (its registration, the pointer and keyboard
   sensors, the operation, the writer and `restRect`) lives in `packages/core/src/core`
   (`source.ts` is the draggable's old registration, now shared), and in React the
   `useSource` hook, the handle link and `DragHandle` live outside the capability folders. The
   guard and both bundle tests check it: only `Sortable` ships no swappable, draggable-only or
   droppable code, and only `Swappable` none of sortable, draggable-only or droppable.
2. **Sortable (S2).** `registerSortable(element, { id, index, group, scope?, accepts?, strategy?,
   handle?, translate?, onSortStart?, onSortOver?, onSortEnd?, … })` in the core,
   `Sortable`/`useSortable` in React. Items of one `group` (in the space's `scope`) are one list,
   ordered by `index` (its place, from 0); a list needs no wrapper. `SortableGroup`
   (`registerSortableGroup`, a cloned child, optional) marks a group's container: needed only to
   sort into an empty group, or to a container's end.
   - **A sort is a drop on a group.** When an item's drag starts, every group of its scope becomes
     a drop target of that drag, an entry in the space whose id is the group's name (removed when
     the drag ends: `get("droppable-ids")` lists them only during a sort). So the middleware sees a
     sort exactly as a drop: `ctx.payload` is `{ draggableId: <item id>, droppableId: <group> }`,
     `ctx.target.data` is the `SortableGroup`'s `data`, a dry run when the target group changes and
     the real one on release; a veto puts the preview back home and the drop reports `to = from`.
     `can`/`check("drop")` know a group only during a sort, and answer for the item asked about. A
     plain `Droppable` of the scope under the pointer still takes the item (the list goes back to
     rest, `to = from`), unless an accepting group's box under the pointer is smaller (a droppable
     around a list leaves its sort alone). A disabled group is never sorted into nor within, but
     its items may leave it for an accepting group. A group name
     shares the id space of the scope's droppables: keep them distinct.
   - **Across groups.** The target decides, as a droppable's `accepts` does: a group takes items of
     another group when one of its members (an item or its `SortableGroup`) lists that group in
     `accepts` (or its predicate takes the item); two-way moves list each other. A refusing group is
     never entered: over it the preview stays where it was.
   - **The preview is `translate` shifts written by the core** on the shifted items (the CSS
     property, never `transform`), from each item's box at rest: never a DOM move (so no
     `lostpointercapture` from a re-parenting), never a React render, once per frame at most and
     only when the preview changes. The source follows the pointer as a draggable does; with
     `translate={false}` (a `DragOverlay` shows it) it is shifted to where it lands, as a
     placeholder. Boxes at rest are measured without the shifts (`restRect`: the computed
     `translate`, so even mid-way through the app's transition), at the start and after a scroll
     or resize, so the index never feeds back on itself and auto-scroll re-measures without a jump.
     The app commits on `onSortEnd` (`{ id, from: { group, index }, to: { group, index }, canceled
     }`, `to` being exactly what the preview showed); the core clears the shifts after the app's
     callbacks and the page's listeners, so the app's new order never shows a jump.
   - **Strategies** are pure (`{ index(input), shifts(input) }` over the group's boxes at rest),
     each its own export: `verticalList` (the default), `horizontalList` (RTL flows from the right)
     and `grid` (reading order, RTL aware). Over an item, the source takes its place (from another
     group: before or after it, by its half); between items, the place does not change. The grid's
     hysteresis: an item of another row than the current place must hold the probe a quarter of its
     height inside it. Lists take items of any size (they flow with the gaps at rest); the grid
     moves items to their new place's corner, so it suits items of one size best.
   - **Keyboard:** always the "targets" mode, over the group's slots: the arrows move one slot
     (forward is down or toward the inline end), on into the next accepting group in reading order
     past a group's end, Space or Enter drops, Escape cancels and restores every shift. Every
     targets-mode step (a sortable's slot, a swap target, a draggable's droppable: the shared
     keyboard sensor) scrolls its destination into view within its scroll containers, the least
     that shows it (`reveal`, `block: "nearest"`-like, instant unless the app's CSS asks for
     `scroll-behavior: smooth`), the pointer following it, and measures again at once.
   - **Helpers:** `arrayMove(list, from, to)` and `moveBetween(lists, event)` (a record of lists by
     group), pure: they never mutate their input, and return it unchanged when nothing moves.
3. **Swappable (S3).** `registerSwappable(element, { id, index, group, accepts?, … , onSwap? })` and
   `Swappable`/`useSwappable`. A swappable item is a draggable and a drop target of its space:
   hovering an item of a group that accepts the source's (its own always) shifts only that target
   into the source's place (corners on the inline start) and marks it `data-dnd-swap-target`.
   `onSwap({ source, target?, canceled })`, each `{ id, group, index }` (`index` is required so the
   helpers stay pure); no target when it was dropped over none (or a veto). An item is never a
   target of its own drag (the arrows count from its place, and back to it is no swap). The middleware sees
   `{ draggableId: <source>, droppableId: <target> }`, and `can("drop")` answers at any time. The
   keyboard picks targets in reading order. Helpers: `swapItems(list, a, b)` and
   `swapBetween(lists, event)`.
4. **Animation is the app's (S4).** The core writes the shift values; the app adds `transition:
   translate …` in its CSS, best scoped to `[data-dnd-sorting]` so the drop (the app's new order and
   the cleared shifts in one frame) never animates. There are no built-in drop animations.
   **Scroll anchoring:** a sortable container whose children shift should set `overflow-anchor:
   none` in the app's CSS (Firefox anchors on a shifted child and scrolls it back when the shift is
   cleared, E4); the packages ship no CSS, so it is documented, not set.
5. **Size targets (S5)** (min + gzip, React entry, on top of the shared core): `sortable` ≤ 2.5 KB,
   `swappable` ≤ 1.5 KB. `pnpm size` lists both entries, alone and over the draggable and droppable
   ones (their drag machinery is shared). A miss is reported with its reason; it is not a stop.

**State attributes they add** (D7's rules: present or absent, namespaced): `data-dnd-part="sortable"`
(with `data-dnd-id`), `"sortable-group"` (with `data-dnd-id="<group>"`) and `"swappable"` (with
`data-dnd-id`); `data-dnd-dragging` and `data-dnd-disabled` as a draggable's; **`data-dnd-sorting`**
on every item (and `SortableGroup`) of a group taking part in a sort in progress, the source's and
the accepting ones' (rendered by React at the sort's start and end only); **`data-dnd-swap-target`**
on the item a swap would exchange with, **written by the core** with its shift (React never
renders it, so a swap preview commits nothing).

Releasing is a merge (as in Dockable and Grid Layout): `.github/workflows/release.yml` opens the
Version Packages PR, and merging it publishes the four packages (`@fragiola/dnd`,
`@fragiola/dnd-react`, `@fragiola/dnd-vue`, `@fragiola/dnd-angular`, one `fixed` group) with pnpm
through npm trusted publishing (OIDC, no token); no workflow step names a package, so every
`packages/*` is built, packed, checked and published alike (the Angular one from its ng-packagr
`dist`, `publishConfig.directory`). Every adapter depends on the core at its exact version (pnpm
replaces `workspace:*` when it packs), which `pnpm check:package` checks. After the maintainer's
first `0.0.0` stubs and `npm trust` of the four packages, nobody but that workflow publishes; the
maintainer's steps are in [`docs/releasing.md`](docs/releasing.md). DnD is not
registered on fragiola.com yet: CI has no www trigger.

## Several frameworks (Epic #14)

Each adapter is a package and an examples app; everything else is shared and driven by lists
(`guidelines/architecture/core-and-adapters.md`, "A repository with several adapters", after
Dockable's Epic #131). Adding a framework is:

1. its package, `packages/<framework>` (`@fragiola/dnd-<framework>`), on the core's
   `@fragiola/dnd/adapter`;
2. its examples app, `examples/<framework>` (`examples-<framework>`), with the same scripts as
   `examples/react`: `generate` (`node ../shared/scripts/generate.ts <framework>`), `dev` (with
   `EMBED_BASE` and `PORT`), `build` (with `EMBED_BASE` and `EMBED_OUT_DIR`), `typecheck`, `e2e`
   (its `playwright.config.ts` is `examplesE2eConfig("<framework>")`), importing the themes, the
   embed messages and the metadata from `examples-shared`; its example folders reuse the React
   ids, each with its framework's entry file (`ENTRY_FILES` in `examples/shared/src/framework.ts`);
3. the framework in `site/project.json`'s `frameworks`.

No edit to the site logic, the manifest builder or the specs: `site:export` builds one embed and
one manifest per framework, `site:dev` serves them all on one port, and `pnpm e2e` runs every
examples app. A spec whose example a framework lacks is skipped (`requireExamples`, called by
`openExample`). Releasing a new framework's package also needs its entry in `ADAPTERS`
(`scripts/check-package.ts`) with its smoke app, its `0.0.0` stub and its `npm trust`
([`docs/releasing.md`](docs/releasing.md), "Later releases, new packages, failures"); CI's examples
e2e job finds the new examples app by its `playwright.config.ts`.

## Commands

| command                                    | does                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm install`                             | install dependencies                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `pnpm check`                               | Biome lint + format + assist (non-mutating)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `pnpm check:fix`                           | Biome check with auto-fix                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `pnpm typecheck`                           | `pnpm -r typecheck` (TypeScript 7, no emit; `examples-vue` runs `vue-tsc`, the Angular package and app `ngc`, each on its pinned TypeScript 6.0)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `pnpm test`                                | Vitest: `core` (node), `react` (jsdom), `vue` (jsdom), `angular` (jsdom, `@analogjs/vitest-angular`), `playground`, `examples-shared`, `examples-react`, `examples-vue`, `examples-angular`, `site`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `pnpm build`                               | `pnpm -r build` (tsdown for the packages, ng-packagr for the Angular one, Vite for the apps), then the `.d.ts` check                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `pnpm check:package`                       | builds the packages, packs them with pnpm, checks the packed `exports` are the repo's without the source condition (only `types`/`import`/`default`, targets in `dist`), runs `publint` and `attw --profile esm-only` on the tarballs, the Angular package packed from its `dist` (its exports are `distExports` of `scripts/publish-manifest.ts`, every target a file of the tarball), checks every adapter pins the core's exact version, then one scratch app per adapter, outside the workspace, installs that adapter's tarball only, imports every entry, typechecks, builds and loads its dev server: Vite + React (`tsc`), Vite + `@vitejs/plugin-vue` (`vue-tsc` on TypeScript 6.0.3), Vite + `@analogjs/vite-plugin-angular` (`ngc` with strict templates on TypeScript 6.0.3) (`scripts/check-package.ts`, from Dockable; `--tarballs <dir>` checks the tarballs in `dir`, which the release workflow does on what `changeset pack` wrote) |
| `pnpm changeset`                           | adds a changeset (`.changeset/*.md`): every PR that changes what a package ships (`changedFilePatterns` in `.changeset/config.json`) carries one, and CI's Changesets job fails one that does not; the four packages are in one `fixed` group (`@fragiola/*`), so they always share a version                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `pnpm release:version`                     | `changeset version`: bumps the four packages and writes their `CHANGELOG.md`. Only the release workflow runs it (the Version Packages PR); never commit a version bump by hand                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `pnpm size`                                | the bundle sizes of every entry point (raw, gzip, min + gzip): a report, after `pnpm build`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `pnpm e2e`                                 | Playwright: the playground (Chromium, Firefox) and every examples app (Chromium, the shared specs against its embed, built and served under `/dnd/embed/<framework>/`, also inside an iframe)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `pnpm dev`                                 | the playground on <http://localhost:5173>: every example and scenario live, the fixtures (`PLAYGROUND_PORT` moves it)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `pnpm site:export --base /dnd --out <dir>` | the site export for fragiola.com (contract v1.2, `../www/CONTRACT.md`), self-validated                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `pnpm site:dev --base /dnd --port 5183`    | every framework's examples app with hot reload, one dev server each behind one port (`site/dev-proxy.ts`), under the base `www` proxies in dev                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |

## Repository layout

```
packages/core/      @fragiola/dnd                src/<capability>/, src/ (the shared core), tests/
packages/react/     @fragiola/dnd-react          src/<capability>/, src/ (the shared core), tests/
packages/vue/       @fragiola/dnd-vue            src/<capability>/, src/{components,composables,utils}/, tests/
packages/angular/   @fragiola/dnd-angular        <capability>/ (ng-packagr secondary entries), src/lib/{directives,inject,utils}/, tests/
apps/playground/    src/                         the shell: catalog, sidebar, toolbar, stage, source
                    src/scenarios/<area>/<id>    dev-only scenarios: drag, drop, keyboard, interop, api
                    fixtures/<name>/             unstyled pages Playwright drives (LTR and RTL)
                    e2e/, tests/                 Playwright specs, unit tests
examples/shared/    src/meta/<slug>.ts           every example's metadata, for every framework
                    src/themes/, src/embed/      the five themes, the embed's messages with the site
                    scripts/                     manifest builder, loader generator (per framework)
                    e2e/                         every Playwright spec, also inside an iframe
examples/react/     src/examples/<slug>/         the site's React examples (the embed app, Vite)
                    src/components, lib, …       Fragiola UI, vendored (scripts/vendor-fragiola.ts)
examples/vue/       src/examples/<slug>/         the same examples in Vue (`index.vue`, `styles.ts`)
                    src/components, lib, …       Fragiola UI over Reka UI, from Dockable's Vue examples
examples/angular/   src/examples/<slug>/         the same examples in Angular (`index.ts`, `styles.ts`)
                    src/components, lib, …       Fragiola UI as directives, from Dockable's Angular examples
site/               docs/                        the pages fragiola.com/dnd serves
                    export.ts, contract.ts       `pnpm site:export` and its validation
                    dev.ts, dev-proxy.ts         `pnpm site:dev`: one port, one dev server per framework
scripts/                                         the `.d.ts` check, the size report, the source condition
```

## Playground

`pnpm dev` serves `apps/playground`: a local app to see the packages working, with hot reload on
the core, the React wrappers and the examples. A sidebar, a theme switch (the five example themes)
and the source beside the stage; the state is in the URL
(`?example=<slug>` or `?scenario=<area>/<id>`, `&theme=<name>&code=1`).

- **Examples** live in `examples/react/src/examples` (their metadata in
  `examples/shared/src/meta`) and are public: the site embeds them, readers copy them. The
  playground reads them in place (`import.meta.glob`, the `#/` alias and the pre-paint theme from
  `examples/react/vite.shared.ts`); it never keeps a second list. It stays React-only.
- **Scenarios** (`src/scenarios/<area>/<id>.tsx`) are dev-only and never shipped: one file each,
  a default export only, grouped by area (`drag`, `drop`, `keyboard`, `interop`, `api`). The Grid
  Layout integrations live here, behind the `../grid-layout` alias (D12).
- **Dockable popouts** open `public/popout.html` (an empty page Dockable fills); the
  `interop/dockable-popout-sortable` scenario and its e2e drive the popout window.
- **Fixtures** (`fixtures/<name>/`) are the unstyled pages Playwright drives; the sidebar links
  them. `basic/` and `rtl/` are one page (`fixtures/fixture.tsx`) in each direction, driven by one
  spec (`e2e/fixture.spec.ts`; `e2e/fixture.touch.spec.ts` on a phone); `sortable/` and
  `sortable-rtl/` are the sortable and swappable page (`fixtures/sortable.tsx`,
  `e2e/sortable.spec.ts`, `e2e/sortable.touch.spec.ts`). Both mount through `fixtures/mount.tsx`
  (StrictMode and the render counter).
- **Grid Layout** is found by `siblings.ts`, walking up from the playground to the first folder
  holding `grid-layout` (the checkout may be a worktree), and aliased to its sources in
  `vite.config.ts` and `vitest.config.ts`. Absent (or with `DND_GRID_LAYOUT=off`), both names
  resolve to a stub (`src/grid-layout-absent.ts`), `__GRID_LAYOUT__` is false, the catalog leaves
  the `interop/grid-layout-*` scenarios out and their e2e spec skips. TypeScript reads the slice of
  its API the scenario uses from a local ambient declaration (`src/grid-layout.d.ts`), so
  `pnpm typecheck` passes either way and the scenario stays typechecked; a drift in Grid Layout's
  API shows in the e2e spec.

## Conventions

- Biome: 4-space indent, double quotes, LF, trailing newline, organized imports.
- TypeScript strict with `noUncheckedIndexedAccess` and `verbatimModuleSyntax`.
  Do not relax it; a blanket `!` on every index access is not a fix.
- English everywhere: code, comments, docs, commits.
- Commits are gitmoji-conventional: `✨ feat(core): …`, `✨ feat(react): …`, `🐛 fix(react): …`,
  `✅ test(core): …`, `🔧 chore: …`, `📝 docs: …`.
- Branches: `<type>/epic-<n>-<short-description>`; one worktree per Epic under `.worktrees/`.
- Unit tests live in each package's `tests/`, mirroring `src/`; type fixtures in `tests/types/`.
- Every exported member has a one-line `/** … */`; a file opens with a `//` header when its
  purpose or a design choice is not obvious from its name.

## Type safety

- **No `any` in public types.** A guard test checks the core's exported declarations, and
  `pnpm build` checks every package's emitted `.d.ts` (`scripts/check-dts.ts`).
- **Type fixtures** go in `tests/types/` (checked by `tsc`, not run): `@ts-expect-error` marks
  what must not compile.

## Code quality

Every change keeps the packages small, simple and fast. Before writing code:

- **Reuse first.** Look for the helper that already exists before writing one. Logic needed twice
  becomes one function; a helper several capabilities use goes in the shared core.
- **The core grows only for the drag and drop's own job.** What is not (announcement text, ids,
  reordering, persistence) is the app's (D14).
- **Simple over clever.** No flag that duplicates other state, no defensive branch that cannot
  happen, no wrapper with a single caller unless its name says something the code does not.
- **Hot paths allocate nothing they do not need**: the pointer move handler, the `translate`
  writer, the collision pass. Nothing renders React per frame (D8).
- **Size is watched** (D13). `pnpm size` reports each entry point; a change says when one grows
  noticeably, and why.
- **Tests share their setup**, never a copy.

## The wrapper contract (`@fragiola/dnd-react`)

Every wrapper follows the same rules (D6, D7). Tests enforce them; keep it that way.

- **A wrapper clones its single child and renders no element of its own.**
  `<Draggable id="a"><Card /></Draggable>` renders exactly `Card`'s element, with the wrapper's
  `ref`, handlers, `data-*`, ARIA and structural style merged into it. The child is a plain
  element or any Fragiola primitive (`Dockable.Tab`, `GridLayout.Item`).
- **The child must be one element that forwards `ref` and props**: a DOM element, or a component
  that does, as every Fragiola primitive does. Anything else throws in development with a clear
  message.
- **`render` is also accepted**, Base UI style (`render={<li />}` or
  `render={(props, state) => …}`), for when there is no child to wrap.
- **`ref` is a plain prop** (React 19) and is merged with the wrapper's own: the wrapper's ref,
  the `ref` given to the wrapper and the child's own `ref` all receive the element.
- **A wrapper forwards what is not its option** to the element, so a wrapper is itself a valid
  child and wrappers stack (`<Droppable><Draggable><Card /></Draggable></Droppable>`).
- **No context, even for a handle**: a `DragHandle` finds its drag source through the DOM (the
  closest `[data-dnd-part~="draggable"]`, `~="sortable"` or `~="swappable"`), whichever side
  attaches first. It is a shared part (`packages/react/src/DragHandle.tsx`), re-exported by each
  drag source's entry (`/draggable`, `/sortable`, `/swappable`), never by the main one.
- **Development checks** (`process.env.NODE_ENV !== "production"`, written literally so the app's
  bundler drops them): no child, several children, a fragment or text throw; a child that never
  attaches the ref, and a handle outside a draggable, are reported with `console.error` after
  mount. In production an invalid child renders as it is.
- **Handlers compose**: internal first, then the child's own.
- **`className` and `style` accept a value or a `(state) => value` function**, as in every
  Fragiola primitive. Structural style always wins.
- **Hooks are the lower layer** and have the family shape: `useDraggable(options)` and
  `useDroppable(options)` return `{ state, props }`, where `props` is what goes on the element.
  `useDragMonitor` returns nothing.
- **No text and no names.** The wrappers set no `aria-label` and no `aria-roledescription`.
  Accessible names and announcement text are the app's; the examples' `_kit` builds a live region
  from the drag events.
- **Structural inline style only** (D7), and **state only through namespaced `data-dnd-*` and
  ARIA**, present or absent. e2e selectors use them, never class names.
- **No provider, no context** (D4): a wrapper registers itself in its document's drag space.

## The wrapper contract in Vue (`@fragiola/dnd-vue`)

The same contract (D6, D7, D8) with Vue's tools (Epic #17). Tests in `packages/vue/tests` enforce
it, mirroring `packages/react/tests`.

- **A component renders its single default-slot child cloned** (`cloneVNode`) and no element of
  its own: its attributes (`data-dnd-*`, ARIA), the attributes passed to the component (`class`,
  `style`, listeners, …), the structural style and its template ref are merged in. `inheritAttrs`
  is off: the component passes them on itself. A `v-if` comment beside the child is skipped.
- **The merge**: the child's `class` first, then the component's; the component's `style` over the
  child's, the structural keys winning; listeners composed, the wrapper's first, then the child's;
  the child's own plain attributes win. The wrapper's template ref runs before the child's own
  (cloning appends it; it is moved first), so the child's ref sees the element registered.
- **`as`** (a tag or a component) is rendered when there is no child to wrap; the default slot is
  then its content. It is the family's Vue form of `render`.
- **The default slot is scoped with the part's state** (`v-slot="{ state }"`), the Vue form of
  React's `(state) => value`: the app binds `:class` or `:style` on the child from it. The
  overlay's slot gives `{ operation, state }`.
- **Options and callbacks are props** (`@drag-start`, `@drop`, `@sort-end`, `@swap` reach
  `onDragStart`, …); `disabled` and `translate` cast a bare attribute to `true`. A props change is
  an `update` (the core's `optionsChanged`), applied after the patch (`flush: "post"`).
- **A ref on a component** receives the component; its `$el` is the element. An outer wrapper
  reaches the inner one's element the same way, so wrappers stack.
- **Development checks** (literal `process.env.NODE_ENV !== "production"`): no child, several
  children, a fragment or text throw; a child that never receives the element (a fragment root) or
  its attributes, and a handle outside a source, are reported after mount (after the flush,
  `nextTick`, when every template ref is set).
- **Composables** (`useDraggable`, `useDroppable`, `useSortable`, `useSortableGroup`,
  `useSwappable`) take a value, a ref or a getter and return `{ state, props }`, computed refs; a
  part ends with its effect scope. `useDragSpace` returns a computed ref (the space once mounted),
  and `useDragMonitor` subscribes from the mount on (a synchronous watcher).
- **No update while the pointer moves (D8)**: the state slot is read through a computed ref that
  triggers only when the snapshot changes; a render counter (a global `updated` mixin) checks zero
  updates while the pointer moves inside one droppable.
- **Vue's listeners are on the element since its mount**, before the core's (React delegates to
  the root, after them): an app's `@pointerdown` on a draggable sees the press before dnd claims it.

## The wrapper contract in Angular (`@fragiola/dnd-angular`)

The same contract (D6, D7, D8) with Angular's tools (Epic #20). Tests in `packages/angular/tests`
enforce it, mirroring `packages/react/tests`.

- **Standalone attribute directives on the app's own element**, which add no element:
  `[dndDraggable]`, `[dndDragHandle]`, `[dndDroppable]`, `[dndSortable]`, `[dndSortableGroup]`,
  `[dndSwappable]` (prefix `dnd`, as Dockable's `dockable*`; no NgModule). The main input is the
  id (`<li dndDraggable="a">`, `[dndSortable]="item.id"`, `dndSortableGroup="todo"`), the options
  are inputs under their React names, the callbacks are outputs (`(dragStart)`, `(drop)`,
  `(sortEnd)`, `(swap)`, …), and `exportAs` (the selector's name) exposes the part's `state`, a
  read-only signal: the Angular form of `(state) => value`. Directives stack on one host.
- **Attributes are written directly, merged per host** (`src/lib/utils/host-attributes.ts`), never
  through host bindings: `data-dnd-part` lists every part in one order (drag sources first),
  `data-dnd-id` is the first part's (the drag source's), a flag is present when any part sets it.
  Stacked directives share an input of the same name (`disabled`, `scope`, `data`), and a static
  attribute of an input's name sets it (`type` on a `<button>`): documented, not worked around.
- **Lifecycle** (`src/lib/utils/part.ts`): a part connects in `afterNextRender` (the browser only,
  after every element of the render has its attributes, so a handle and its source find each
  other), outside Angular's zone; `ngOnChanges` applies an input change as an `update`
  (`optionsChanged`); `DestroyRef` disconnects. Nothing subscribes on the server, where the
  attributes are still rendered.
- **`<ng-template dndDragOverlay let-operation>`**: the view is created into a `div` in the space's
  document `body` on a drag's start, checked on its target changes, destroyed at its end; the
  core writes its position (`followOverlay`).
- **Injection functions**: `injectDragSpace(options?)` (a signal: the given space at once, the
  document's after the first render) and `injectDragMonitor(listener, options?)`; options a value
  or a function of signals.
- **No change detection while the pointer moves (D8)**: the state signal changes only with the
  slot's snapshot, the attributes are written from the core's notification; a counter test
  (`afterEveryRender` and per-part template reads) checks zero passes inside one droppable. After a
  state change and a discrete output (start, target change, end), the app is rendered in a
  microtask (`src/lib/utils/render.ts`), before any paint: a zoneless app would otherwise render
  after the core cleared the shifts, and a frame could show the old order.
- **Development checks** are written `(typeof ngDevMode === "undefined" || ngDevMode)`, inline, as
  Angular's (an app's production build defines `ngDevMode` false): a directive on an
  `<ng-container>` throws, a handle outside a source is reported after the first render.
- **Angular's template listeners are on the element since its creation**, before the core's, as in
  Vue: an app's `(pointerdown)` sees the press before dnd claims it.
- **Packaging**: ng-packagr (partial compilation, TypeScript 6.0.3 pinned in the package and the
  app only), secondary entries `draggable/`, `droppable/`, `sortable/`, `swappable/` at the
  package root (ng-packagr names an entry by its folder), each `export *` of the core entry; what
  they share (the part runner, the handle, the helpers) comes from the main entry as `ɵ` members,
  since ng-packagr bundles each entry alone. It is published from `dist`
  (`publishConfig.directory`), whose manifest `scripts/publish-manifest.ts` writes (dist-only
  `exports`, the core `workspace:*`, no `tslib`). The bundle test and `pnpm size` run Angular's own
  production transformer (`@angular/build/private`), as an app's build does, so an unused directive
  is tree-shaken.

## The adapter kit (`@fragiola/dnd/adapter`)

What every adapter takes from the core, so that an adapter only renders and wires (the Fragiola
adapter rule): if an adapter needs a decision, it is a new member here, with a core test. It is an
entry of the shared core (it imports no capability), no adapter re-exports it, and an app never
imports it. `@fragiola/dnd-react`, `@fragiola/dnd-vue` and `@fragiola/dnd-angular` are built on it.

| member                                                                                                              | what it decides                                                                                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `createSlot(fallback)`, `StateSlot`, `StateSource`                                                                  | a part's state as one external store that follows the registration of the moment (the fallback before mount and on the server); its snapshot keeps its identity until a field changes (D8)                                                         |
| `optionsChanged(previous, next, keys)`                                                                              | an option change is an `update` only when a compared option differs; inline arrays and plain objects compare by content                                                                                                                            |
| `withLatestCallbacks(values, names, latest)`                                                                        | the callbacks the core holds call the latest ones, so an inline callback is never a change                                                                                                                                                         |
| `connectPart(element, register, options, slot)`                                                                     | registers the element, makes the slot follow it, `update()` re-reads `options()`, `disconnect()` undoes it all                                                                                                                                     |
| `connectSource(…)`, `connectHandle(element, slot)`                                                                  | the same for a drag source, with the drag handle link through the DOM (the closest `data-dnd-part` of `draggable`, `sortable` or `swappable`, whichever side attaches first); a handle shows its source's state and reports whether it is `linked` |
| `followOverlay(space, view, scope?)`                                                                                | what a drag overlay shows (start, target changes, end, a drag already running) and its placing on each move, written by the core, never rendered                                                                                                   |
| `draggableBinding`, `droppableBinding`, `sortableBinding`, `sortableGroupBinding`, `swappableBinding`, `handleRest` | each capability's compared options, callbacks and state before mount (a type fixture checks every option is covered)                                                                                                                               |

An adapter keeps the options of the moment, renders the part's attributes from its state and
writes its own development messages (they name its own parts). Rendering a wrapper (cloning the
child, `render`, merging props and refs) stays each framework's.

## Interop with the family

D11, in practice. These rules make dnd easy to combine with Dockable and Grid Layout:

- **Nested gestures.** A dnd press that will become a drag is claimed on `pointerdown` with
  `preventDefault()`. Grid Layout already ignores `defaultPrevented` presses
  (`grid-layout/packages/core/src/engine/engine.ts`, `pointerdown`), so a sortable list inside a
  `GridLayout.Item` drags its cards and not the grid item. dnd in turn ignores a press another
  library already claimed (`defaultPrevented`). **Measured in Chromium and Firefox** (the
  fixture's e2e): cancelling `pointerdown` keeps `click` and the native controls (never claimed)
  working, but suppresses the focus a press gives. The claim stays, and the pointer sensor gives
  that focus itself, to the press's focusable element inside the activator
  (`packages/core/src/core/sensors/pointer.ts`, `focusPress`). Text selection is prevented while
  a press lasts, on purpose.
- **Wrapping primitives.** A wrapper over `Dockable.Tab`, `Dockable.TabSet`, `GridLayout.Item` or a
  Fragiola UI component works because they forward props and ref and compose handlers. dnd's
  `translate` and `data-dnd-*` never collide with their `transform` and `data-*`.
- **Moved elements.** Dockable re-parents a panel's moveable element and can carry it into a
  popout. dnd measures at drag start and registers per `ownerDocument`, so a draggable keeps
  working after a move and inside a popout window.
- **Drops into the family go through their commands.** Dropping a dnd item on a Dockable tabset
  runs `model.run("tab.add", …)`, and dropping it on a grid runs Grid Layout's `item.add` through
  `gridLayoutRef`. This is app code in the examples, never a dependency of the packages: the
  packages never import a sibling.

## Provenance: dnd-kit

`../references/dnd-kit` is the capability reference: read it, never modify it, never copy it
wholesale. What DnD takes from it is capabilities (draggables and droppables, sensors, collision
strategies, keyboard coordinates, an overlay, auto-scroll) rebuilt on Fragiola's architecture. What
it leaves behind on purpose: the mandatory `DndContext` provider, `transform` as the move property,
a single package holding every capability, and default accessible texts. Every deliberate deviation
is listed in `docs/walking-skeleton-report.md`.

## Site

The docs and examples are served by `fragiola.com/dnd`, built by the `www` repo from this repo's
**site export** (`../www/CONTRACT.md`, v1.2). This repo only provides: the pages (`site/docs`,
base-free links, the v1.2 vocabulary), the gallery configuration (`examples.json`) and one examples
app per framework (`examples/react`, `examples/vue` and `examples/angular`, built for
`<base>/embed/<framework>/`). The
guides stay React-first; the getting-started pages, the wrapper contract and the Dockable guide
show each framework in `<Framework name="…">` blocks, and `api/vue` and `api/angular` are the Vue
and Angular APIs. `www` owns the shell, the gallery chrome,
the code panel and search. A page's `title` is at most 60 characters and never repeats "DnD"; its
`description` is 50–160 characters, plain words, no `: ` (YAML); a page body has no `#` and never
skips a heading level; `pnpm site:export` checks all of it. Examples import internal modules
through `#/…` (never `@/…`). Every HTML file of the examples app carries
`<meta name="robots" content="noindex">`.

In dev the playground resolves both packages to their sources through the `@fragiola/source`
export condition; production builds use `dist`.
