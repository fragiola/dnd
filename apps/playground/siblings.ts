// The Fragiola siblings the dev-only interop scenarios use without depending on them (D12).
// `@fragiola/grid-layout-react` is not on npm: when the `grid-layout` repository sits beside this
// one (`../grid-layout`), its sources are aliased in; otherwise both names point at a stub and
// the scenario is left out of the catalog (`__GRID_LAYOUT__`) and its e2e spec skips. The
// repository may be a worktree (`dnd/.worktrees/<name>`), so the sibling is found by walking up
// to the first folder that holds `grid-layout`, wherever this checkout lives.
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

/**
 * Grid Layout's sources beside this repository, if they are there. `DND_GRID_LAYOUT=off` acts as
 * if they were not (to check that path).
 */
export function gridLayoutSources():
    | { readonly root: string; readonly react: string; readonly core: string }
    | undefined {
    if (process.env.DND_GRID_LAYOUT === "off") return undefined;
    for (
        let at = resolve(import.meta.dirname);
        at !== dirname(at);
        at = dirname(at)
    ) {
        const root = join(at, "grid-layout");
        const react = join(root, "packages", "react", "src", "index.ts");
        const core = join(root, "packages", "core", "src", "index.ts");
        if (existsSync(react) && existsSync(core)) return { root, react, core };
    }
    return undefined;
}

/** The aliases and the `define` the playground's Vite and Vitest configs share. */
export function siblings() {
    const grid = gridLayoutSources();
    const stub = resolve(import.meta.dirname, "src", "grid-layout-absent.ts");
    return {
        alias: [
            {
                find: /^@fragiola\/grid-layout-react$/,
                replacement: grid?.react ?? stub,
            },
            {
                find: /^@fragiola\/grid-layout$/,
                replacement: grid?.core ?? stub,
            },
        ],
        define: { __GRID_LAYOUT__: JSON.stringify(Boolean(grid)) },
        /** the folders Vite may serve beside the workspace */
        allow: grid ? [grid.root] : [],
    };
}
