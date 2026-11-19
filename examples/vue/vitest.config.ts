import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        name: "examples-vue",
        environment: "node",
        include: ["tests/**/*.test.ts"],
    },
});
