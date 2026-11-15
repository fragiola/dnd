// Bundle isolation (D3, D13): an app that imports one capability ships none of the other. A
// fixture importing only that capability's entry is bundled with rolldown (the bundler tsdown
// builds with, reached through it as `scripts/size-report.ts` does), unminified, and searched for
// names only the other capability's code carries.
import { createRequire } from "node:module";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(import.meta.dirname, "..");

interface Rolldown {
    rolldown(options: {
        input: string;
        plugins: {
            name: string;
            resolveId(id: string): string | undefined;
            load(id: string): string | undefined;
        }[];
    }): Promise<{
        generate(options: { format: "esm"; minify: false }): Promise<{
            output: { type: string; code?: string }[];
        }>;
    }>;
}

async function loadRolldown(): Promise<Rolldown> {
    const fromPackage = createRequire(join(root, "package.json"));
    const fromTsdown = createRequire(fromPackage.resolve("tsdown"));
    return (await import(fromTsdown.resolve("rolldown"))) as Rolldown;
}

/** The unminified bundle of a module whose source is `code`. */
async function bundle(code: string): Promise<string> {
    const { rolldown } = await loadRolldown();
    const build = await rolldown({
        input: "fixture",
        plugins: [
            {
                name: "fixture",
                resolveId: (id) => (id === "fixture" ? id : undefined),
                load: (id) => (id === "fixture" ? code : undefined),
            },
        ],
    });
    const { output } = await build.generate({ format: "esm", minify: false });
    return output.map((chunk) => chunk.code ?? "").join("\n");
}

const entry = (name: string) =>
    JSON.stringify(join(root, "src", name, "index.ts"));

/** Names only the draggable capability's code carries (its entry and the sensors it binds). */
const DRAGGABLE = [
    "registerDraggable",
    "bindPointer",
    "bindKeyboard",
    "startDrag",
];
/** Names only the droppable capability's code carries. */
const DROPPABLE = ["registerDroppable", "onDragEnter", "onDragLeave"];
/** Shared-core exports an app opts into: unused, they are never shipped. */
const OPT_IN = [
    "closestCenter",
    "rectIntersection",
    // the auto-scroll's own helpers (`autoScroll` is also an option name)
    "scrollersOf",
    "edgeStep",
    "overlayStyle",
    "grabOffset",
];

describe("bundle isolation", () => {
    it("ships no droppable code with only registerDraggable", async () => {
        const code = await bundle(
            `import { registerDraggable } from ${entry("draggable")};\nexport const used = registerDraggable;`,
        );
        for (const name of DRAGGABLE) expect(code, name).toContain(name);
        for (const name of [...DROPPABLE, ...OPT_IN])
            expect(code, name).not.toContain(name);
    });

    it("ships no draggable code with only registerDroppable", async () => {
        const code = await bundle(
            `import { registerDroppable } from ${entry("droppable")};\nexport const used = registerDroppable;`,
        );
        for (const name of DROPPABLE) expect(code, name).toContain(name);
        for (const name of [
            ...DRAGGABLE,
            ...OPT_IN,
            "pointerWithin",
            "setPointerCapture",
        ])
            expect(code, name).not.toContain(name);
    });

    it("creates nothing on import: an entry imported for nothing bundles to nothing", async () => {
        for (const name of ["draggable", "droppable"]) {
            const code = await bundle(`import ${entry(name)};`);
            expect(code.trim(), name).toBe("");
        }
        const core = await bundle(
            `import ${JSON.stringify(join(root, "src", "index.ts"))};`,
        );
        expect(core.trim()).toBe("");
    });
});
