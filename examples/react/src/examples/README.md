# Examples

Each folder is one example of the site's gallery (`fragiola.com/dnd/examples/<folder>`), rendered
alone by this app at `index.html?id=<folder>`. This app holds only what a reader copies; what every
framework's examples app shares lives once in `examples/shared` (`examples-shared`, private, it
imports no framework):

```
examples/react/src/examples/
  <slug>/index.tsx     the example (default export, "use client")
  <slug>/styles.ts     how it looks: one class string (or state function) per part
  <slug>/*.ts(x)       optional sibling files, shown in the code panel
  _kit/                shared demo content and app logic (cards, reordering data, announcements,
                       the Dockable and Grid Layout glue); no Draggable or Droppable, no styles

examples/shared/
  src/meta/<slug>.ts   each example's metadata, for every framework: title, description,
                       category, order, features, docs link, layout, height
  src/meta-types.ts    its shape, and the categories
  src/themes/          the five themes (one CSS file each, values only) and their list
  src/embed/           the embed's messages with the site (ready, resize, theme)
  scripts/             the manifest builder and the loader generator, parametrized by framework
  e2e/                 every Playwright spec, run by each framework's app against its own embed
```

An example keeps its id in every framework. A framework may ship a subset: its manifest lists the
examples its app has, and a spec of an example it lacks is skipped, not failed.

## Categories

The gallery groups examples by the feature they show (`CATEGORIES` in
`examples/shared/src/meta-types.ts`, in sidebar
order; the site export contract calls a category a `level`). An example belongs where a reader
looking for its feature would search, and `order` is its place inside the category.

| category             | what belongs in it                                                                                                                 |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `getting-started`    | the first drags: a draggable and a droppable with no provider, the bare wrappers                                                   |
| `draggable`          | the dragged side: handles, controls that never drag, activation, `render`                                                          |
| `droppable`          | the drop side: `accepts`, scopes, collision strategies, refused drops                                                              |
| `sortable`           | lists, rows and grids the app reorders: strategies, groups and `accepts`, handles, RTL                                             |
| `swappable`          | items that exchange places, within a group and across groups                                                                       |
| `keyboard`           | grabbing, moving and dropping without a pointer, and what the app announces                                                        |
| `overlay-and-scroll` | `DragOverlay` out of clipped containers, auto-scroll, several scroll containers                                                    |
| `mobile`             | touch: the delay activation, page scrolling kept                                                                                   |
| `interop`            | dnd with the family: inside Dockable panels, onto a tabset, sortable panels, Fragiola UI items (Grid Layout: playground scenarios) |
| `styling`            | how a drag looks when it is not about one feature: the lift, the placeholder, RTL                                                  |
| `apps`               | whole applications that combine many features, some of them live                                                                   |

## Adding an example

1. Create `src/examples/<slug>/index.tsx` and `styles.ts`, and its metadata in
   `examples/shared/src/meta/<slug>.ts` (see `meta-types.ts`): a folder without metadata fails a
   test.
2. `pnpm dev` at the root lists it in the playground (`apps/playground`), with hot reload, the five
   themes and its source: `http://localhost:5173/?example=<slug>`. The embed alone is
   `pnpm --filter examples-react dev` (`http://localhost:5183/?id=<slug>`, it regenerates the
   loaders).
3. The smoke e2e visits it in the reference theme (every theme only for the representative
   examples in `examples/shared/e2e/smoke.spec.ts`; `E2E_ALL_THEMES=1` runs them all), and inside
   an iframe. Add a spec for its main behaviour in `examples/shared/e2e/examples/<slug>.spec.ts`,
   reaching the example only through `data-dnd-*`, roles and accessible names, so every
   framework's app runs it unchanged.

## Anatomy of an example

A reader opens `index.tsx` and sees the logic first: what is rendered, which elements are wrapped
in `Draggable` and `Droppable`, which events the app handles. How it looks is one click away, in
`styles.ts`. The code panel shows the example's files, the shared demo content it imports and the
theme's CSS, and nothing else.

- **`index.tsx` imports `@fragiola/dnd-react`** (or one of its capability entries) and wires the
  drag and drop itself. Parts may be components in the same file or in sibling files of the same
  folder, never in a shared module: `_kit/` imports no dnd part (`tests/examples.test.ts`).
- **Classes in `styles.ts`**, beside `index.tsx`. It exports one `const` per styled part (`card`,
  `zone`, `handle`, `overlay`, …): a class string, built with `cn()` when it is long or has
  conditions, or a function of the part's state. The `.tsx` files `import * as styles from
  "./styles"` and write `className={styles.card}`. No `.tsx` file of an example holds a class
  string or calls `cn()` (`tests/examples.test.ts`).
- **Classes are complete literals.** Tailwind finds a class by reading the source, so
  `` `palette-${tone}` `` is never generated: map a value to a full class instead.
- **A class that does a job beyond looks keeps a short comment** in `styles.ts`.
- **Accessible names and announcements inline**: each item's `aria-label`, each icon button's, the
  live region's text. The packages render no text (D6).
- **Tokens, not values that differ per theme**: fonts, padding, corners, the placeholder, the
  handles and the focus ring read the `--dnd-*` tokens each theme declares (listed in
  `examples/shared/src/themes/<name>.css`).

## Rules

- **No provider, shown**: the examples never wrap their draggables and droppables in anything of
  the package's: each wrapper sits where its element is.
- **Copyable imports only**: `react`, `@fragiola/dnd-react` (it re-exports the core) and its
  capability entries (`/draggable`, `/droppable`, `/sortable`, `/swappable`), `@fragiola/dockable-react` for the integrations,
  `lucide-react`, Fragiola UI (`#/components/ui/*`, `#/components/atoms/*`, `#/lib/cn`), and
  relative files inside `src/examples/`. `#/` is the app's `src/`; `@name` is reserved for packages
  (site export contract, §6). `tests/examples.test.ts` enforces it.
- **Theme-agnostic**: style through palette roles (`bg-palette-base`, …) and the theme tokens
  (`--dnd-*`), never fixed colours, so the example works in all five themes.
- **State as data**: style the package's state through `data-dnd-*` and ARIA only (D7).
- **Accessible names**: every button has `aria-label` or text; the package renders none.
- **App policy stays in the app** (D14): reordering data, persistence, ids, undo, announcement
  text, the look of overlays and placeholders, and the Dockable and Grid Layout glue live in the
  example or in `_kit/`, never in a package.
- **Workarounds are commented** in the code (users copy them).
