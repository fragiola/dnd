import { defineConfig } from "tsdown";

// One entry per capability (D3): an app that imports only `/draggable` never loads the droppable
// code. The shared core is the main entry; the capabilities import it, never each other.
// `adapter` is the shared core's adapter-only entry (what the framework adapters call).
export default defineConfig({
    entry: {
        index: "src/index.ts",
        adapter: "src/adapter.ts",
        draggable: "src/draggable/index.ts",
        droppable: "src/droppable/index.ts",
        sortable: "src/sortable/index.ts",
        swappable: "src/swappable/index.ts",
    },
    format: "esm",
    platform: "browser",
    dts: true,
    sourcemap: true,
    clean: true,
});
