import angular from "@analogjs/vite-plugin-angular";
import {
    defaultClientConditions,
    defaultServerConditions,
    type Plugin,
    transformWithOxc,
} from "vite";
import { defineProject } from "vitest/config";
import { withSourceCondition } from "../../scripts/source-condition.ts";

/**
 * The React tests' shared helpers (`packages/react/tests/helpers.tsx`, no JSX in it): the Angular
 * plugin transforms TypeScript itself and leaves `.tsx` alone, so Oxc strips their types here.
 */
function tsxHelpers(): Plugin {
    return {
        name: "tsx-helpers",
        async transform(code, id) {
            if (!id.endsWith(".tsx")) return undefined;
            const result = await transformWithOxc(code, id, { lang: "tsx" });
            return { code: result.code, map: result.map };
        },
    };
}

export default defineProject({
    // the directives compiled by the Angular compiler (TypeScript 6.0.3, this package's)
    plugins: [
        angular({
            tsconfig: "tsconfig.spec.json",
            transformFilter: (_code, id) => !id.endsWith(".tsx"),
        }),
        tsxHelpers(),
    ],
    // the core and this package's own entries from their sources (the source export condition),
    // not their dist, in either environment: client (jsdom) and server (ssr.test.ts opts into
    // node), so the tests pass before any build
    resolve: { conditions: withSourceCondition(defaultClientConditions) },
    ssr: {
        resolve: { conditions: withSourceCondition(defaultServerConditions) },
    },
    test: {
        name: "angular",
        environment: "jsdom",
        include: ["tests/**/*.test.ts"],
        setupFiles: ["tests/setup.ts"],
        // a process per file, not the Angular plugin's VM contexts: the bundle test runs rolldown,
        // whose native binding takes only objects of the main realm
        pool: "forks",
    },
});
