import { defineProject } from "vitest/config";

export default defineProject({
    test: {
        name: "core",
        // Node by default: the shared core must load and run without a DOM (D5).
        // Files that need one opt in with a `// @vitest-environment jsdom` docblock.
        environment: "node",
        include: ["tests/**/*.test.ts"],
    },
});
