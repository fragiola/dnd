import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        name: "examples-angular",
        environment: "node",
        include: ["tests/**/*.test.ts"],
    },
});
