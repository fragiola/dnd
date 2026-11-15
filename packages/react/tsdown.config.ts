import { defineConfig } from "tsdown";

// One entry per capability (D3), mirroring the core's: each re-exports its core entry and adds
// the React wrapper and hooks of that capability.
export default defineConfig({
    entry: {
        index: "src/index.ts",
        draggable: "src/draggable/index.ts",
        droppable: "src/droppable/index.ts",
    },
    format: "esm",
    platform: "browser",
    dts: true,
    sourcemap: true,
    clean: true,
    // the declarations are built from src only: tsconfig.json also takes in the tests and the
    // configs, which import the repo's scripts/, and their declarations would be written there
    tsconfig: "tsconfig.build.json",
});
