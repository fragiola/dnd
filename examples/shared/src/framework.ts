// From Dockable (fragiola/dockable, examples/shared/src/framework.ts), same author and licence.
//
// The frameworks an examples app can be written in. Each one is an app of its own,
// `examples/<framework>` (package `examples-<framework>`), built for `<base>/embed/<framework>/`;
// what they share (the metadata, the themes, the embed protocol, the manifest, the e2e specs) is
// this package. `site/project.json`'s `frameworks` says which ones the site export ships.

export const FRAMEWORKS = ["react", "vue", "angular"] as const;

export type Framework = (typeof FRAMEWORKS)[number];

/** The file an example's folder is found by, and the code panel opens first. */
export const ENTRY_FILES: Record<Framework, string> = {
    react: "index.tsx",
    vue: "index.vue",
    angular: "index.ts",
};

/** The adapter package an example of that framework installs (it brings the core). */
export const ADAPTER_PACKAGES: Record<Framework, string> = {
    react: "@fragiola/dnd-react",
    vue: "@fragiola/dnd-vue",
    angular: "@fragiola/dnd-angular",
};

/**
 * The npm packages an example imports itself (a consumer installs them): the icons, and Dockable's
 * adapter for the interop examples. Listed in the manifest's `packages`, after the adapter.
 */
export const OWN_PACKAGES: Record<Framework, readonly string[]> = {
    react: ["lucide-react", "@fragiola/dockable-react"],
    vue: ["@lucide/vue", "@fragiola/dockable-vue"],
    angular: ["@lucide/angular", "@fragiola/dockable-angular"],
};

export function isFramework(value: unknown): value is Framework {
    return FRAMEWORKS.includes(value as Framework);
}
