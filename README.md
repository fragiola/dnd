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
pnpm e2e        # Playwright
```

Contributors and agents: read [AGENTS.md](AGENTS.md) first.
