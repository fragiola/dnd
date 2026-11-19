import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        projects: [
            "packages/*",
            "apps/playground",
            "examples/shared",
            "examples/react",
            "examples/vue",
            "examples/angular",
            "site",
        ],
    },
});
