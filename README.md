# DnD

A headless, extremely light drag and drop for React: wrap any element in a `Draggable`, a
`Droppable`, a `Sortable` or a `Swappable` and it drags, drops, sorts or swaps. The wrappers render no HTML of their own, need no provider,
and each capability is its own entry, so an app ships only what it imports. It ships behaviour,
accessibility and composable wrappers, and no CSS, icons or text: you bring the styling.

Mouse, touch and pen go through one Pointer Events path, the keyboard grabs, moves, drops and
cancels with the same events, and it composes with the rest of the Fragiola family: inside
Dockable panels and popouts, over Grid Layout items.

| capability | entry                           | what it does                                                                                 |
| ---------- | ------------------------------- | -------------------------------------------------------------------------------------------- |
| draggable  | `@fragiola/dnd-react/draggable` | `Draggable`, `DragHandle`: any element follows the pointer or the keyboard                   |
| droppable  | `@fragiola/dnd-react/droppable` | `Droppable`: a drop target with `accepts`, scopes and drop rules                             |
| sortable   | `@fragiola/dnd-react/sortable`  | `Sortable`, `SortableGroup`: lists, rows, grids and kanban columns, previewed by `translate` |
| swappable  | `@fragiola/dnd-react/swappable` | `Swappable`: two items exchange places, within a group or across accepting ones              |

The shared entry, `@fragiola/dnd-react`, holds the drag space, the collision strategies,
`DragOverlay`, `autoScroll` and the monitor. The app owns the data: sorts and swaps are applied
with pure helpers (`arrayMove`, `moveBetween`, `swapItems`, `swapBetween`).

| package                                 | what it is                                                                                               |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| [`@fragiola/dnd-react`](packages/react) | composable React 19 wrappers and hooks, re-exporting the core: all a React app installs                  |
| [`@fragiola/dnd`](packages/core)        | framework-agnostic core: the drag space, sensors, collision strategies, events, one entry per capability |

## Documentation and examples

- **Docs**: <https://fragiola.com/dnd>, from [`site/docs`](site/docs): [installation](site/docs/getting-started/installation.mdx),
  [quick start](site/docs/getting-started/quick-start.mdx), the concepts, the API pages and the guides
  ([a kanban board](site/docs/guides/kanban.mdx), [animating the shifts](site/docs/guides/animating-shifts.mdx),
  [with Dockable](site/docs/guides/with-dockable.mdx), [with Grid Layout](site/docs/guides/with-grid-layout.mdx),
  [styling](site/docs/guides/styling.mdx), [bundle size](site/docs/guides/bundle-size.mdx)).
- **Examples**: <https://fragiola.com/dnd/examples>, from
  [`examples/react/src/examples`](examples/react/src/examples): twenty-five themed, copyable
  examples, including sortable lists, grids, a kanban, swaps and the Dockable and Fragiola UI
  integrations. The Grid Layout integrations (a grid item, a kanban of grid items) are playground
  scenarios (`apps/playground/src/scenarios/interop`) until Grid Layout is on npm.
- **Status**: [the walking-skeleton report](docs/walking-skeleton-report.md) (what held, the
  measured sizes, the deviations), [the dnd-kit parity report](docs/dnd-kit-parity.md) (what is
  built, different or out of scope) and [the gaps the examples found](docs/examples-gaps.md).

Its capabilities follow [dnd-kit](https://github.com/clauderic/dnd-kit) (MIT), a study reference
rebuilt on Fragiola's architecture: see [LICENSE](LICENSE).

## Running it

Requires Node ≥ 24 and pnpm 11.

```sh
pnpm install
pnpm dev        # playground on http://localhost:5173: every example and scenario live
pnpm check      # lint + format
pnpm typecheck
pnpm test       # unit and component tests
pnpm build
pnpm size       # bundle sizes per entry, after build
pnpm e2e        # Playwright (E2E_ALL_THEMES=1: every example in every theme)
pnpm site:export --base /dnd --out <dir>   # the fragiola.com export, validated
```

Contributors and agents: read [AGENTS.md](AGENTS.md) first.
