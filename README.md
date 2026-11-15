# DnD

A headless, extremely light drag and drop for React: wrap any element in a `Draggable` or a
`Droppable` and it drags and drops. The wrappers render no HTML of their own, need no provider,
and each capability is its own entry, so an app ships only what it imports. It ships behaviour,
accessibility and composable wrappers, and no CSS, icons or text: you bring the styling.

Mouse, touch and pen go through one Pointer Events path, the keyboard grabs, moves, drops and
cancels with the same events, and it composes with the rest of the Fragiola family: inside
Dockable panels and popouts, over Grid Layout items.

| package                                 | what it is                                                                                               |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| [`@fragiola/dnd-react`](packages/react) | composable React 19 wrappers and hooks, re-exporting the core: all a React app installs                  |
| [`@fragiola/dnd`](packages/core)        | framework-agnostic core: the drag space, sensors, collision strategies, events, one entry per capability |

## Documentation and examples

- **Docs**: <https://fragiola.com/dnd>, from [`site/docs`](site/docs): [installation](site/docs/getting-started/installation.mdx),
  [quick start](site/docs/getting-started/quick-start.mdx), the concepts, the API pages and the guides
  ([with Dockable](site/docs/guides/with-dockable.mdx), [with Grid Layout](site/docs/guides/with-grid-layout.mdx),
  [styling](site/docs/guides/styling.mdx), [bundle size](site/docs/guides/bundle-size.mdx)).
- **Examples**: <https://fragiola.com/dnd/examples>, from
  [`examples/react/src/examples`](examples/react/src/examples): fourteen themed, copyable examples,
  including the Dockable integrations. The Grid Layout integration is a playground scenario
  (`apps/playground/src/scenarios/interop`) until Grid Layout is on npm.
- **Status**: [the walking-skeleton report](docs/walking-skeleton-report.md) (what held, the
  measured sizes, the deviations) and [the gaps the examples found](docs/examples-gaps.md).

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
