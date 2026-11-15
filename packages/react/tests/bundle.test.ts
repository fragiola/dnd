// Bundle isolation of the React entries (D3, D13): an app that imports one capability's wrapper
// ships none of the other capability, and the shared entry ships neither. A fixture importing
// one entry is bundled with rolldown (the bundler tsdown builds with, reached through it), from
// the sources (the source export condition), React left out, unminified, and searched for names
// only the other capability's code carries.
import { createRequire } from "node:module";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SOURCE_CONDITION } from "../../../scripts/source-condition.ts";

const root = join(import.meta.dirname, "..");

interface Rolldown {
    rolldown(options: {
        input: string;
        external: RegExp;
        resolve: { conditionNames: string[] };
        transform?: { define: Record<string, string> };
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
async function bundle(code: string, production = false): Promise<string> {
    const { rolldown } = await loadRolldown();
    const build = await rolldown({
        ...(production
            ? {
                  transform: {
                      define: { "process.env.NODE_ENV": '"production"' },
                  },
              }
            : {}),
        input: "fixture",
        external: /^react(?:-dom)?(?:\/|$)/,
        resolve: {
            conditionNames: [SOURCE_CONDITION, "import", "browser", "default"],
        },
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

const entry = (name?: string) =>
    JSON.stringify(join(root, "src", ...(name ? [name] : []), "index.ts"));

/** Names only the draggable capability's code carries, core and React. */
const DRAGGABLE = [
    "registerDraggable",
    "bindPointer",
    "useDraggable",
    "addOwner",
];
/** Names only the draggable's own code carries (the sensors and `useSource` are shared). */
const DRAGGABLE_ONLY = ["registerDraggable", "useDraggable", "onDragStart"];
/** Names only the sortable capability's code carries, core and React. */
const SORTABLE = ["registerSortable", "useSortable", "createSort", "onSortEnd"];
/** Names only the swappable capability's code carries, core and React. */
const SWAPPABLE = [
    "registerSwappable",
    "useSwappable",
    "createSwap",
    "data-dnd-swap-target",
];
/** Names only the droppable capability's code carries, core and React. */
const DROPPABLE = ["registerDroppable", "onDragEnter", "useDroppable"];
/** The shared entry's own parts, which a capability alone never ships. */
const SHARED = ["DragOverlay", "overlayStyle", "useDragMonitor"];

describe("bundle isolation of the React entries", () => {
    it("ships no droppable code with only Draggable", async () => {
        const code = await bundle(
            `import { Draggable } from ${entry("draggable")};\nexport const used = Draggable;`,
        );
        for (const name of DRAGGABLE) expect(code, name).toContain(name);
        for (const name of [...DROPPABLE, ...SORTABLE, ...SWAPPABLE, ...SHARED])
            expect(code, name).not.toContain(name);
    });

    it("ships no swappable, draggable or droppable code with only Sortable", async () => {
        const code = await bundle(
            `import { Sortable } from ${entry("sortable")};\nexport const used = Sortable;`,
        );
        for (const name of [...SORTABLE, "bindPointer", "addOwner"])
            expect(code, name).toContain(name);
        for (const name of [
            ...DRAGGABLE_ONLY,
            ...DROPPABLE,
            ...SWAPPABLE,
            ...SHARED,
            "DragHandle",
            "SortableGroup",
            "horizontalList",
            "arrayMove",
        ])
            expect(code, name).not.toContain(name);
    });

    it("ships no sortable, draggable or droppable code with only Swappable", async () => {
        const code = await bundle(
            `import { Swappable } from ${entry("swappable")};\nexport const used = Swappable;`,
        );
        for (const name of [...SWAPPABLE, "bindPointer", "addOwner"])
            expect(code, name).toContain(name);
        for (const name of [
            ...DRAGGABLE_ONLY,
            ...DROPPABLE,
            ...SORTABLE,
            ...SHARED,
            "DragHandle",
            "verticalList",
            "swapItems",
        ])
            expect(code, name).not.toContain(name);
    });

    it("ships no draggable code with only Droppable", async () => {
        const code = await bundle(
            `import { Droppable } from ${entry("droppable")};\nexport const used = Droppable;`,
        );
        for (const name of DROPPABLE) expect(code, name).toContain(name);
        for (const name of [
            ...DRAGGABLE,
            ...SORTABLE,
            ...SWAPPABLE,
            ...SHARED,
            "DragHandle",
            "setPointerCapture",
        ])
            expect(code, name).not.toContain(name);
    });

    it("ships neither capability with the shared entry's parts", async () => {
        const code = await bundle(
            `import { DragOverlay, useDragMonitor, useDragSpace } from ${entry()};\nexport const used = [DragOverlay, useDragMonitor, useDragSpace];`,
        );
        for (const name of ["DragOverlay", "overlayStyle"])
            expect(code, name).toContain(name);
        for (const name of [
            ...DRAGGABLE,
            ...DROPPABLE,
            ...SORTABLE,
            ...SWAPPABLE,
            "DragHandle",
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
            expect(code.trim(), name).toBe("");
        }
    });

    it("drops the development checks and their messages from an app's production build", async () => {
        const code = `import { Draggable, DragHandle } from ${entry("draggable")};\nexport const used = [Draggable, DragHandle];`;
        const messages = [
            "never received the ref",
            "got no child",
            "is not inside",
        ];
        const dev = await bundle(code);
        for (const message of messages) expect(dev, message).toContain(message);
        const production = await bundle(code, true);
        for (const message of messages)
            expect(production, message).not.toContain(message);
    });
});
