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

Other adapters may follow React, so **every piece of logic that isn't rendering lives in the core**.

| package                  | name                  | contains                                                                                                                  | depends on                                                      |
| ------------------------ | --------------------- | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `packages/core`          | `@fragiola/dnd`       | the shared core (drag space, sensors, collision, events, types) and one entry per capability (`/draggable`, `/droppable`) | DOM only, zero runtime deps                                     |
| `packages/react`         | `@fragiola/dnd-react` | the wrappers and hooks of each capability, re-exporting the core entry by entry: **all a React app installs**             | `@fragiola/dnd` (same version), peer `react`, `react-dom` (^19) |
| `apps/playground`        | private               | the dev app (every site example live, dev-only scenarios, themes and source), unstyled fixture pages driven by Playwright | both packages, `examples/react`                                 |
| `examples/react`, `site` | private               | the site's examples (the embed app) and pages, exported for fragiola.com                                                  |                                                                 |

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
   `size-report.ts`, `site/contract.ts`, `site/export.ts`, `source-condition.ts`, …) carries the
   lighter header `// From Grid Layout (fragiola/grid-layout, <path>), same author and licence.`
   (or Dockable's, or Data Grid's).
3. **Entries are capabilities (D3).** The layering is:

   ```
   @fragiola/dnd-react               shared core: drag space, sensors, collision, events, DragOverlay, types
       ├── /draggable                Draggable, DragHandle, useDraggable
       ├── /droppable                Droppable, useDroppable
       ├── /sortable                 (next Epic)
       └── /swappable                (next Epic)
   ```

   Each subpath exists in both packages: `@fragiola/dnd/draggable` holds the logic, and
   `@fragiola/dnd-react/draggable` adds the wrapper and re-exports it. `sideEffects: false`, ESM
   only, `exports` with the `@fragiola/source` condition and a dist-only `publishConfig.exports`,
   one tsdown entry per subpath. **No single namespace object** (`Dnd.*`), because a namespace
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
   subscribe with `subscribe(listener, { scope?, document? })` in the core, or
   `useDragMonitor(listener, options)` in React: the only, optional, "global" API. A drag never
   crosses documents: a drag inside a Dockable popout stays in that window.
5. **The core (D5).** Framework-free and **zero runtime dependencies**. It never imports `react`.
   It never touches global `document`/`window`/`requestAnimationFrame`/`ResizeObserver`/
   `getComputedStyle`; all DOM access goes through an element's `ownerDocument`/`defaultView`. A
   guard test enforces all three. A drag operation is an immutable snapshot:
   `{ source: { id, type?, data? }, target?: { id, data? }, pointer, delta, rects, input:
   "pointer" | "keyboard" }`. Droppables declare `accepts` (a type list or a predicate); a refused
   hover marks `data-dnd-refused` and never reports `onDrop`. Collision strategies are pure
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
   handle, and for `DragOverlay` its `position: fixed`, geometry and `pointer-events: none`.
   Everything else is the app's: the look of a dragged item, the placeholder, transitions, cursor
   and z-index. The packages ship no CSS file. **State only through `data-*` and ARIA**, each
   present or absent, never `"false"`, namespaced so that wrapping another primitive never
   collides with its own attributes (Dockable's `data-dragging`): `data-dnd-dragging` on the
   dragged element; `data-dnd-over` and `data-dnd-refused` on a droppable; `data-dnd-active` on a
   droppable that would accept the drag in progress; `data-dnd-disabled`, and `data-dnd-handle` on
   a handle. A component test asserts the inline style allow-list.
8. **A drag does not render React (D8).** The core writes `translate` imperatively, at most once
   per animation frame through the element's `defaultView`. React re-renders only the parts whose
   `state` changed: the source on start and end, and droppables on enter, leave and drop. A render
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
    visual: in RTL, ArrowRight still moves right. Focus returns to the source after a drop or a
    cancel, unless the app moved it. The events carry `input: "keyboard"` and name the source and
    target ids, so the app can announce them. The wrapper never adds a role or the deprecated
    `aria-grabbed`/`aria-dropeffect`; it sets `tabIndex` when the element is not focusable,
    `aria-disabled` when disabled, and `aria-describedby` only when the app passes `describedBy`.
11. **Fragiola interop (D11).** See [Interop](#interop-with-the-family) below. Nested presses are
    claimed with `preventDefault()` on `pointerdown` and a press another library already claimed is
    ignored; dnd's `translate` and `data-dnd-*` never collide with a wrapped primitive's
    `transform` and `data-*`; a draggable keeps working after Dockable moves its element or carries
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

Nothing is published yet: no npm release, no Changesets, no GitHub Actions workflow, no www
registration, until the maintainer validates the library.

## Commands

| command                                    | does                                                                                                                                              |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm install`                             | install dependencies                                                                                                                              |
| `pnpm check`                               | Biome lint + format + assist (non-mutating)                                                                                                       |
| `pnpm check:fix`                           | Biome check with auto-fix                                                                                                                         |
| `pnpm typecheck`                           | `pnpm -r typecheck` (TypeScript 7, no emit)                                                                                                       |
| `pnpm test`                                | Vitest: `core` (node), `react` (jsdom), `playground`, `examples-react`, `site`                                                                    |
| `pnpm build`                               | `pnpm -r build` (tsdown for the packages, Vite for the apps), then the `.d.ts` check                                                              |
| `pnpm size`                                | the bundle sizes of every entry point (raw, gzip, min + gzip): a report, after `pnpm build`                                                       |
| `pnpm e2e`                                 | Playwright: the playground (Chromium, Firefox) and the examples app (Chromium, built and served under `/dnd/embed/react/`, also inside an iframe) |
| `pnpm dev`                                 | the playground on <http://localhost:5173>: every example and scenario live, the fixtures (`PLAYGROUND_PORT` moves it)                             |
| `pnpm site:export --base /dnd --out <dir>` | the site export for fragiola.com (contract v1.2, `../www/CONTRACT.md`), self-validated                                                            |
| `pnpm site:dev --base /dnd --port 5183`    | the examples app with hot reload, under the base `www` proxies in dev                                                                             |

## Repository layout

```
packages/core/      @fragiola/dnd                src/<capability>/, src/ (the shared core), tests/
packages/react/     @fragiola/dnd-react          src/<capability>/, src/ (the shared core), tests/
apps/playground/    src/                         the shell: catalog, sidebar, toolbar, stage, source
                    src/scenarios/<area>/<id>    dev-only scenarios: drag, drop, keyboard, interop, api
                    fixtures/<name>/             unstyled pages Playwright drives (LTR and RTL)
                    e2e/, tests/                 Playwright specs, unit tests
examples/react/     src/examples/<slug>/         the site's examples (the embed app, Vite)
                    src/components, lib, …       Fragiola UI, vendored (scripts/vendor-fragiola.ts)
                    e2e/                         Playwright specs, also inside an iframe
site/               docs/                        the pages fragiola.com/dnd serves
                    export.ts, contract.ts       `pnpm site:export` and its validation
scripts/                                         the `.d.ts` check, the size report, the source condition
```

## Playground

`pnpm dev` serves `apps/playground`: a local app to see the packages working, with hot reload on
the core, the React wrappers and the examples. A sidebar, a theme switch (the five example themes)
and the source beside the stage; the state is in the URL
(`?example=<slug>` or `?scenario=<area>/<id>`, `&theme=<name>&code=1`).

- **Examples** live in `examples/react/src/examples` and are public: the site embeds them, readers
  copy them. The playground reads them in place (`import.meta.glob`, the `#/` alias and the
  pre-paint theme from `examples/react/vite.shared.ts`); it never keeps a second list.
- **Scenarios** (`src/scenarios/<area>/<id>.tsx`) are dev-only and never shipped: one file each,
  a default export only, grouped by area (`drag`, `drop`, `keyboard`, `interop`, `api`). The Grid
  Layout integrations live here, behind the `../grid-layout` alias (D12).
- **Fixtures** (`fixtures/<name>/`) are the unstyled pages Playwright drives; the sidebar links
  them.

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
- **`ref` is a plain prop** (React 19) and is merged with the wrapper's own.
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

## Interop with the family

D11, in practice. These rules make dnd easy to combine with Dockable and Grid Layout:

- **Nested gestures.** A dnd press that will become a drag is claimed on `pointerdown` with
  `preventDefault()`. Grid Layout already ignores `defaultPrevented` presses
  (`grid-layout/packages/core/src/engine/engine.ts`, `pointerdown`), so a sortable list inside a
  `GridLayout.Item` drags its cards and not the grid item. dnd in turn ignores a press another
  library already claimed (`defaultPrevented`). If `preventDefault` on `pointerdown` breaks focus
  or text selection in a browser, the press is claimed another way and the choice is recorded in
  the report: a decision, not a stop.
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
base-free links, the v1.2 vocabulary), the gallery configuration (`examples.json`) and the examples
app (`examples/react`, built for `<base>/embed/react/`). `www` owns the shell, the gallery chrome,
the code panel and search. A page's `title` is at most 60 characters and never repeats "DnD"; its
`description` is 50–160 characters, plain words, no `: ` (YAML); a page body has no `#` and never
skips a heading level; `pnpm site:export` checks all of it. Examples import internal modules
through `#/…` (never `@/…`). Every HTML file of the examples app carries
`<meta name="robots" content="noindex">`.

In dev the playground resolves both packages to their sources through the `@fragiola/source`
export condition; production builds use `dist`.
