import { defineConfig } from "tsdown";

// One entry per capability (D3), mirroring the core's: each re-exports its core entry and adds
// the React wrapper and hooks of that capability.
export default defineConfig({
    entry: {
        index: "src/index.ts",
        draggable: "src/draggable/index.ts",
        droppable: "src/droppable/index.ts",
        sortable: "src/sortable/index.ts",
        swappable: "src/swappable/index.ts",
    },
    format: "esm",
    platform: "browser",
    // the development checks stay for the app's bundler to decide: the browser platform would
    // otherwise fold `process.env.NODE_ENV` to "development" here, for good
    define: { "process.env.NODE_ENV": "process.env.NODE_ENV" },
    dts: true,
    sourcemap: true,
    clean: true,
    // the declarations are built from src only: tsconfig.json also takes in the tests and the
    // configs, which import the repo's scripts/, and their declarations would be written there
    tsconfig: "tsconfig.build.json",
});
