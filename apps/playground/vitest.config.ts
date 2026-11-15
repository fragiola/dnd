import type { Alias } from "vite";
import { defineConfig } from "vitest/config";
import { examplesTestResolve } from "../../examples/react/vite.shared.ts";
import { siblings } from "./siblings.ts";

const sibling = siblings();
const resolved = examplesTestResolve();

export default defineConfig({
    ...resolved,
    // the interop scenarios' siblings, as in vite.config.ts
    resolve: {
        ...resolved.resolve,
        alias: [
            ...((resolved.resolve?.alias ?? []) as Alias[]),
            ...sibling.alias,
        ],
    },
    define: sibling.define,
    test: {
        name: "playground",
        environment: "node",
        include: ["tests/**/*.test.ts"],
    },
});
