// From Dockable (fragiola/dockable, site/tests/check-package.test.ts), same author and licence.
import {
    mkdirSync,
    mkdtempSync,
    readdirSync,
    rmSync,
    writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import angularManifest from "../../packages/angular/package.json" with {
    type: "json",
};
import {
    ADAPTERS,
    buildOutputExports,
    corePinProblem,
    exportProblems,
    findTarballs,
    publishedExportsProblems,
    relativeTo,
    servedImports,
    tarballsOption,
    unlistedPackages,
    withoutSource,
} from "../../scripts/check-package.ts";
import { SOURCE_CONDITION } from "../../scripts/source-condition.ts";

// `pnpm check:package` runs scripts/check-package.ts over the packed packages.
describe("the packed package check", () => {
    const published = {
        ".": {
            types: "./dist/index.d.ts",
            import: "./dist/index.js",
            default: "./dist/index.js",
        },
        "./package.json": "./package.json",
    };
    const repo = {
        ".": { [SOURCE_CONDITION]: "./src/index.ts", ...published["."] },
        "./package.json": "./package.json",
    };

    it("accepts dist-only exports with the types, import and default conditions", () => {
        expect(exportProblems(published)).toEqual([]);
    });

    it("rejects any other condition, and a target outside dist", () => {
        expect(
            exportProblems({
                ".": {
                    "@fragiola/source": "./src/index.ts",
                    development: "./dist/index.js",
                    "@acme/anything": "./dist/index.js",
                    import: "./dist/index.js",
                },
            }),
        ).toEqual([
            'exports["."]: the "@fragiola/source" condition is published',
            'exports["."]["@fragiola/source"]: "./src/index.ts" is not in dist',
            'exports["."]: the "development" condition is published',
            'exports["."]: the "@acme/anything" condition is published',
        ]);
        expect(exportProblems(undefined)).toHaveLength(1);
    });

    it("takes the published exports for the repo's, without the source condition", () => {
        expect(withoutSource(repo)).toEqual(published);
        expect(publishedExportsProblems(repo, published)).toEqual([]);
    });

    it("finds published exports that drifted from the repo's", () => {
        const { default: _, ...noDefault } = published["."];
        expect(
            publishedExportsProblems(repo, { ...published, ".": noDefault }),
        ).toHaveLength(1);
        expect(
            publishedExportsProblems(repo, {
                ...published,
                "./extra": "./dist/extra.js",
            }),
        ).toHaveLength(1);
        expect(
            publishedExportsProblems(repo, {
                ".": { ...published["."], import: "./dist/other.js" },
                "./package.json": "./package.json",
            }),
        ).toHaveLength(1);
    });

    it("takes a package packed from its build output as publishing that directory's files", () => {
        // ng-packagr's output: packed from dist (publishConfig.directory), targets relative to it
        const angularRepo = {
            ".": {
                [SOURCE_CONDITION]: "./src/public-api.ts",
                types: "./dist/types/x.d.ts",
                default: "./dist/fesm2022/x.mjs",
            },
            "./package.json": "./package.json",
        };
        const packed = {
            ".": { types: "./types/x.d.ts", default: "./fesm2022/x.mjs" },
            "./package.json": "./package.json",
        };
        expect(
            publishedExportsProblems(relativeTo(angularRepo, "dist"), packed),
        ).toEqual([]);
        const files = new Set(["./types/x.d.ts", "./fesm2022/x.mjs"]);
        expect(
            exportProblems(packed, "exports", (target) => files.has(target)),
        ).toEqual([]);
        expect(
            exportProblems(
                { ".": { default: "./src/public-api.ts" } },
                "exports",
                (target) => files.has(target),
            ),
        ).toHaveLength(1);
        // a package packed from its folder keeps its dist targets
        expect(relativeTo(published, "out")).toEqual(published);
    });

    it("expects the Angular package's packed exports to be what publish-manifest.ts writes", () => {
        // dist/package.json: no source condition, `./dist/` stripped, no `dist/` in the tarball
        const expected = buildOutputExports(angularManifest.exports, "dist");
        expect(publishedExportsProblems(expected, expected)).toEqual([]);
        expect(expected).toEqual(
            relativeTo(withoutSource(angularManifest.exports), "dist"),
        );
        expect(Object.keys(expected as object)).toEqual([
            ".",
            "./draggable",
            "./droppable",
            "./sortable",
            "./swappable",
            "./package.json",
        ]);
        expect((expected as Record<string, unknown>)["./draggable"]).toEqual({
            types: "./types/fragiola-dnd-angular-draggable.d.ts",
            default: "./fesm2022/fragiola-dnd-angular-draggable.mjs",
        });
        expect(JSON.stringify(expected)).not.toContain("./dist/");
        expect(JSON.stringify(expected)).not.toContain(SOURCE_CONDITION);
    });

    it("lists the absolute imports of a module the dev server served", () => {
        expect(
            servedImports(
                'import "/@vite/client";\nimport { Dockable } from "/node_modules/.vite/deps/x.js?v=1";\nimport React from "react";',
            ),
        ).toEqual(["/@vite/client", "/node_modules/.vite/deps/x.js?v=1"]);
    });

    it("reads the tarballs directory of --tarballs, and nothing else", () => {
        expect(tarballsOption([])).toBeUndefined();
        expect(tarballsOption(["--tarballs", "out"])).toBe("out");
        expect(tarballsOption(["--tarballs=out"])).toBe("out");
        expect(() => tarballsOption(["--tarballs"])).toThrow();
        expect(() => tarballsOption(["--tarballs", "--other"])).toThrow();
        expect(() => tarballsOption(["--tarballs="])).toThrow();
        expect(() => tarballsOption(["out"])).toThrow();
    });

    it("finds the tarballs at any depth of a directory, as changeset pack writes them", () => {
        const dir = mkdtempSync(join(tmpdir(), "dnd-tarballs-"));
        try {
            mkdirSync(join(dir, "packages"));
            writeFileSync(join(dir, "publish-plan.json"), "{}");
            writeFileSync(join(dir, "packages", "b-0.1.0.tgz"), "");
            writeFileSync(join(dir, "packages", "a-0.1.0.tgz"), "");
            writeFileSync(join(dir, "packages", "notes.txt"), "");
            expect(findTarballs(dir)).toEqual([
                join(dir, "packages", "a-0.1.0.tgz"),
                join(dir, "packages", "b-0.1.0.tgz"),
            ]);
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });
});

// Every package under packages/ but the core is an adapter, and each adapter is checked the same
// way: its exact core pin and its own smoke app.
describe("the adapters the package check covers", () => {
    it("are every package of packages/ but the core, React first, then Vue and Angular", () => {
        const dirs = readdirSync(join(import.meta.dirname, "../../packages"));
        expect(unlistedPackages(dirs)).toEqual([]);
        expect(ADAPTERS.map((adapter) => adapter.dir).sort()).toEqual(
            dirs.filter((dir) => dir !== "core").sort(),
        );
        expect(ADAPTERS.map((adapter) => adapter.dir)).toEqual([
            "react",
            "vue",
            "angular",
        ]);
        // each smoke app takes its versions from its own framework's examples app
        expect(ADAPTERS.map((adapter) => adapter.framework)).toEqual([
            "react",
            "vue",
            "angular",
        ]);
    });

    it("finds a package that is neither the core nor a listed adapter", () => {
        const dirs = ["core", "react", "vue", "angular", "solid"];
        expect(unlistedPackages(dirs)).toEqual(["solid"]);
        expect(
            unlistedPackages(dirs, [
                ...ADAPTERS,
                { dir: "solid", framework: "react", smoke: async () => {} },
            ]),
        ).toEqual([]);
    });

    it.each([
        "@fragiola/dnd-react",
        "@fragiola/dnd-vue",
        "@fragiola/dnd-angular",
    ])("require %s to pin the core at its exact version", (name) => {
        const adapter = (pin?: string) => ({
            name,
            ...(pin ? { dependencies: { "@fragiola/dnd": pin } } : {}),
        });
        expect(corePinProblem(adapter("1.2.3"), "1.2.3")).toBeUndefined();
        expect(corePinProblem(adapter("^1.2.3"), "1.2.3")).toBe(
            `${name} depends on the core at "^1.2.3", not at 1.2.3`,
        );
        expect(corePinProblem(adapter("workspace:*"), "1.2.3")).toBeDefined();
        expect(corePinProblem(adapter(), "1.2.3")).toMatch(/"undefined"/);
    });
});
