// @vitest-environment node
// Bundle isolation of the Angular entries (D3, D13): an app that imports one capability's directive
// ships none of the other capabilities, and the shared entry ships neither. The fixture imports the
// package as an app does, from its ng-packagr build (`dist`, built here when it is missing), and
// goes through what an Angular app's production build does to a library: Angular's own
// JavaScript transformer (the linker, and the advanced optimizations that make an unused
// directive class tree-shakable), as the Angular CLI and the Analog Vite plugin run it. Then
// rolldown bundles it, Angular left out, unminified, and the output is searched for names only
// the other capabilities' code carries.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

const root = join(import.meta.dirname, "..");
const require = createRequire(join(root, "package.json"));

interface Rolldown {
    rolldown(options: {
        input: string;
        cwd: string;
        external: (id: string) => boolean;
        treeshake: {
            moduleSideEffects: (id: string, external: boolean) => boolean;
        };
        transform: { define: Record<string, string> };
        plugins: {
            name: string;
            resolveId(id: string): string | undefined;
            load(id: string): string | undefined;
            transform(code: string, id: string): Promise<string | undefined>;
        }[];
    }): Promise<{
        generate(options: { format: "esm"; minify: false }): Promise<{
            output: { code?: string }[];
        }>;
    }>;
}

interface Transformer {
    transformData(
        filename: string,
        data: string,
        options: { sideEffects: () => Promise<boolean> },
    ): Promise<Uint8Array>;
    close(): Promise<void>;
}

/** The built file of an entry (`undefined`: the main one). */
const built = (name?: string) =>
    join(
        root,
        "dist/fesm2022",
        `fragiola-dnd-angular${name ? `-${name}` : ""}.mjs`,
    );

let rolldown: Rolldown["rolldown"];
let transformer: Transformer;

beforeAll(async () => {
    // the package's build needs the core's (its declarations): built first when missing
    if (!existsSync(join(root, "../core/dist/index.js")))
        execFileSync("pnpm", ["--filter", "@fragiola/dnd", "build"], {
            cwd: root,
            stdio: "ignore",
        });
    if (!existsSync(built()))
        execFileSync("pnpm", ["run", "build"], { cwd: root, stdio: "ignore" });
    const fromTsdown = createRequire(require.resolve("tsdown"));
    ({ rolldown } = (await import(fromTsdown.resolve("rolldown"))) as Rolldown);
    const { JavaScriptTransformer } = (await import(
        require.resolve("@angular/build/private")
    )) as {
        JavaScriptTransformer: new (
            options: {
                sourcemap: boolean;
                advancedOptimizations: boolean;
                jit: boolean;
            },
            cache: undefined,
        ) => Transformer;
    };
    transformer = new JavaScriptTransformer(
        { sourcemap: false, advancedOptimizations: true, jit: false },
        undefined,
    );
    return () => transformer.close();
}, 120_000);

/**
 * The unminified bundle of an app module whose source is `code`, for production (Angular's
 * development code, its class metadata included, is what keeps an unused class: a development
 * build tree-shakes nothing).
 */
async function bundle(code: string, production = true): Promise<string> {
    const build = await rolldown({
        input: "fixture",
        cwd: root,
        external: (id) => id.startsWith("@angular/"),
        // both packages are side-effect free (`sideEffects: false`, checked below), as the app's
        // bundler reads them; Angular is the app's
        treeshake: { moduleSideEffects: (_id, external) => external },
        // an app's production build sets Angular's development switch to `false`
        transform: { define: production ? { ngDevMode: "false" } : {} },
        plugins: [
            {
                name: "fixture",
                resolveId: (id) => {
                    if (id === "fixture") return id;
                    if (id === "@fragiola/dnd-angular") return built();
                    if (id.startsWith("@fragiola/dnd-angular/"))
                        return built(id.slice("@fragiola/dnd-angular/".length));
                    return undefined;
                },
                load: (id) => (id === "fixture" ? code : undefined),
                async transform(source, id) {
                    if (!id.startsWith(join(root, "dist"))) return undefined;

                    const output = await transformer.transformData(id, source, {
                        sideEffects: async () => false,
                    });
                    return Buffer.from(output).toString("utf8");
                },
            },
        ],
    });
    const { output } = await build.generate({ format: "esm", minify: false });
    return output.map((chunk) => chunk.code ?? "").join("\n");
}

const entry = (name?: string) =>
    JSON.stringify(`@fragiola/dnd-angular${name ? `/${name}` : ""}`);

/** Names only the draggable capability's code carries, core and Angular. */
const DRAGGABLE = [
    "registerDraggable",
    "bindPointer",
    "DndDraggable",
    "addOwner",
];
/** Names only the draggable's own code carries (the sensors are shared). */
const DRAGGABLE_ONLY = ["registerDraggable", "DndDraggable", "onDragStart"];
/** Names only the sortable capability's code carries, core and Angular. */
const SORTABLE = ["registerSortable", "DndSortable", "createSort", "onSortEnd"];
/** Names only the swappable capability's code carries, core and Angular. */
const SWAPPABLE = [
    "registerSwappable",
    "DndSwappable",
    "createSwap",
    "data-dnd-swap-target",
];
/** Names only the droppable capability's code carries, core and Angular. */
const DROPPABLE = ["registerDroppable", "onDragEnter", "DndDroppable"];
/** The shared entry's own parts, which a capability alone never ships. */
const SHARED = ["DndDragOverlay", "overlayStyle", "injectDragMonitor"];

describe("bundle isolation of the Angular entries", () => {
    it("ships no droppable code with only DndDraggable", async () => {
        const code = await bundle(
            `import { DndDraggable } from ${entry("draggable")};\nexport const used = DndDraggable;`,
        );
        for (const name of DRAGGABLE) expect(code, name).toContain(name);
        for (const name of [
            ...DROPPABLE,
            ...SORTABLE,
            ...SWAPPABLE,
            ...SHARED,
            "DndDragHandle",
        ])
            expect(code, name).not.toContain(name);
    });

    it("ships no swappable, draggable or droppable code with only DndSortable", async () => {
        const code = await bundle(
            `import { DndSortable } from ${entry("sortable")};\nexport const used = DndSortable;`,
        );
        for (const name of [...SORTABLE, "bindPointer", "addOwner"])
            expect(code, name).toContain(name);
        for (const name of [
            ...DRAGGABLE_ONLY,
            ...DROPPABLE,
            ...SWAPPABLE,
            ...SHARED,
            "DndDragHandle",
            "DndSortableGroup",
            "horizontalList",
            "arrayMove",
        ])
            expect(code, name).not.toContain(name);
    });

    it("ships no sortable, draggable or droppable code with only DndSwappable", async () => {
        const code = await bundle(
            `import { DndSwappable } from ${entry("swappable")};\nexport const used = DndSwappable;`,
        );
        for (const name of [...SWAPPABLE, "bindPointer", "addOwner"])
            expect(code, name).toContain(name);
        for (const name of [
            ...DRAGGABLE_ONLY,
            ...DROPPABLE,
            ...SORTABLE,
            ...SHARED,
            "DndDragHandle",
            "verticalList",
            "swapItems",
        ])
            expect(code, name).not.toContain(name);
    });

    it("ships no draggable code with only DndDroppable", async () => {
        const code = await bundle(
            `import { DndDroppable } from ${entry("droppable")};\nexport const used = DndDroppable;`,
        );
        for (const name of DROPPABLE) expect(code, name).toContain(name);
        for (const name of [
            ...DRAGGABLE,
            ...SORTABLE,
            ...SWAPPABLE,
            ...SHARED,
            "DndDragHandle",
            "setPointerCapture",
        ])
            expect(code, name).not.toContain(name);
    });

    it("ships neither capability with the shared entry's parts", async () => {
        const code = await bundle(
            `import { DndDragOverlay, injectDragMonitor, injectDragSpace } from ${entry()};\nexport const used = [DndDragOverlay, injectDragMonitor, injectDragSpace];`,
        );
        for (const name of ["DndDragOverlay", "overlayStyle"])
            expect(code, name).toContain(name);
        for (const name of [
            ...DRAGGABLE,
            ...DROPPABLE,
            ...SORTABLE,
            ...SWAPPABLE,
            "DndDragHandle",
        ])
            expect(code, name).not.toContain(name);
    });

    it("creates nothing on import: an entry imported for nothing bundles to nothing", async () => {
        for (const name of [
            "draggable",
            "droppable",
            "sortable",
            "swappable",
            undefined,
        ]) {
            const code = await bundle(`import ${entry(name)};`);
            expect(
                code.replace('import "@angular/core";', "").trim(),
                name,
            ).toBe("");
        }
        for (const manifest of ["dist/package.json", "../core/package.json"])
            expect(
                JSON.parse(readFileSync(join(root, manifest), "utf8"))
                    .sideEffects,
                manifest,
            ).toBe(false);
    });

    it("drops the development checks and their messages from an app's production build", async () => {
        const code = `import { DndDraggable, DndDragHandle } from ${entry("draggable")};\nexport const used = [DndDraggable, DndDragHandle];`;
        const messages = ["is not inside", "goes on an element"];
        const dev = await bundle(code, false);
        for (const message of messages) expect(dev, message).toContain(message);
        const production = await bundle(code);
        for (const message of messages)
            expect(production, message).not.toContain(message);
    });
});
