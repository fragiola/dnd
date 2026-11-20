import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import {
    collectFiles,
    type ExampleEntry,
    examplesApp,
    importsOf,
    listExampleSlugs,
    loadExamples,
} from "examples-shared/scripts/examples-lib";
import { beforeAll, describe, expect, it } from "vitest";

// The Vue side of the example contract (README, and `#/` imports per §6 of the site export
// contract): every example of examples/react exists here with the same id, its entry is
// `index.vue`, it imports only what a consumer can copy, the code panel lists exactly the files it
// is compiled from, and each example wires the drag and drop itself: `_kit/` is shared demo content
// and app logic only (D14). Looks live in each example's `styles.ts`, bound in the templates.

const APP = examplesApp("vue");
const EXAMPLES_DIR = APP.examplesDir;
const KIT = join(EXAMPLES_DIR, "_kit");

/** What an example file may import, besides relative files inside examples/. */
const ALLOWED = [
    /^vue$/,
    // the Vue package re-exports the core (D1): an example never imports @fragiola/dnd; each
    // capability is its own entry (D3)
    /^@fragiola\/dnd-vue(\/(draggable|droppable|sortable|swappable))?$/,
    // the Dockable integrations (D11, D12): app code in the example, never a package dependency
    /^@fragiola\/dockable-vue$/,
    /^@lucide\/vue$/,
    /^#\/components\/(ui|atoms)\/[a-z-]+$/,
    /^#\/lib\/cn$/,
];

function walk(dir: string): string[] {
    if (!existsSync(dir)) return [];
    return readdirSync(dir).flatMap((name) => {
        const path = join(dir, name);
        return statSync(path).isDirectory() ? walk(path) : [path];
    });
}

/** A single-file component's template, where a class string or `cn()` would be a look inline. */
function inlineClasses(source: string): string[] {
    const start = source.indexOf("<template>");
    if (start < 0) return [];
    const template = source.slice(start);
    return [
        ...template.matchAll(/\sclass="[^"]*"|\bcn\(|:class="[^"]*['`][^"]*"/g),
    ].map((match) => match[0]);
}

let examples: ExampleEntry[] = [];

beforeAll(async () => {
    examples = await loadExamples(APP);
});

describe("the Vue examples", () => {
    const slugs = listExampleSlugs(APP);

    it("are every example of examples/react, and no other", () => {
        expect(slugs).toEqual(listExampleSlugs(examplesApp("react")));
    });

    it("are all in the manifest, each with its metadata", () => {
        expect(examples.map((example) => example.slug).sort()).toEqual(slugs);
    });

    it("import only what a consumer can copy", () => {
        for (const file of walk(EXAMPLES_DIR)) {
            if (!/\.(ts|vue)$/.test(file) || file.endsWith(".generated.ts"))
                continue;
            for (const specifier of importsOf(readFileSync(file, "utf8"))) {
                if (specifier.startsWith(".")) continue;
                expect(
                    ALLOWED.some((pattern) => pattern.test(specifier)),
                    `${relative(EXAMPLES_DIR, file)} imports "${specifier}"`,
                ).toBe(true);
            }
        }
    });

    it.each(slugs)(
        "%s shows in the code panel the files it is compiled from",
        (slug) => {
            const example = examples.find((each) => each.slug === slug);
            const { files } = collectFiles(APP, slug);
            expect(example?.files).toEqual(files);
            expect(files[0]).toBe(`${slug}/index.vue`);
        },
    );

    it.each(slugs)("%s wires the drag and drop in its own files", (slug) => {
        const own = walk(join(EXAMPLES_DIR, slug)).map((file) =>
            readFileSync(file, "utf8"),
        );
        expect(
            own.some((source) =>
                importsOf(source).some((specifier) =>
                    specifier.startsWith("@fragiola/dnd-vue"),
                ),
            ),
        ).toBe(true);
    });

    it.each(slugs)("%s keeps its classes in styles.ts", (slug) => {
        expect(existsSync(join(EXAMPLES_DIR, slug, "styles.ts"))).toBe(true);
        for (const file of walk(join(EXAMPLES_DIR, slug))) {
            if (!file.endsWith(".vue")) continue;
            expect(
                inlineClasses(readFileSync(file, "utf8")),
                relative(EXAMPLES_DIR, file),
            ).toEqual([]);
        }
    });

    it("finds inline classes the styles.ts rule forbids", () => {
        const template = (body: string) => `<template>${body}</template>`;
        expect(inlineClasses(template('<div class="flex" />'))).toHaveLength(1);
        expect(inlineClasses(template(':class="cn(a, b)"'))).toHaveLength(1);
        expect(
            inlineClasses(template(`<p :class="on ? 'a' : styles.b" />`)),
        ).toHaveLength(1);
        expect(
            inlineClasses(
                template(
                    '<div :class="styles.cell" /><p :class="styles.dot(tone)" />',
                ),
            ),
        ).toEqual([]);
    });
});

describe("the kit", () => {
    it("renders no dnd part and holds no styles: the examples wire and style themselves", () => {
        for (const file of walk(KIT)) {
            const source = readFileSync(file, "utf8");
            expect(
                importsOf(source).filter((specifier) =>
                    specifier.startsWith("@fragiola/dnd-vue"),
                ),
                relative(EXAMPLES_DIR, file),
            ).toEqual([]);
            expect(inlineClasses(source), relative(EXAMPLES_DIR, file)).toEqual(
                [],
            );
        }
    });

    it("shares the React kit's demo content and app policy, unchanged", () => {
        const react = examplesApp("react").examplesDir;
        for (const file of ["tasks.ts", "files.ts", "dispatch.ts"])
            expect(readFileSync(join(KIT, file), "utf8"), file).toBe(
                readFileSync(join(react, "_kit", file), "utf8"),
            );
    });
});
