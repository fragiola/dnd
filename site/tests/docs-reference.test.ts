import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// The API pages stay honest: every option a wrapper reads, every attribute a hook sets and every
// key of the drag space's verbs is named on its page. Read from the sources as text, so a new
// option or key fails here until the page documents it.

const REPO = join(import.meta.dirname, "../..");
const read = (path: string) => readFileSync(join(REPO, path), "utf-8");
const page = (path: string) => read(`site/docs/${path}.mdx`);

/** The string literals of the array `const <name> = [ … ]` in `source`. */
function listed(source: string, name: string): string[] {
    const body = new RegExp(`const ${name} = \\[([^\\]]*)\\]`).exec(
        source,
    )?.[1];
    expect(body, name).toBeDefined();
    return [...(body ?? "").matchAll(/"([^"]+)"/g)].map(
        (match) => match[1] ?? "",
    );
}

/** The quoted keys of the `interface <name> { … }` in `source`. */
function keysOf(source: string, name: string): string[] {
    const start = source.indexOf(`interface ${name}`);
    expect(start, name).toBeGreaterThanOrEqual(0);
    const body = source.slice(start, source.indexOf("\n}", start));
    return [...body.matchAll(/^ {4}"?([a-z-]+)"?\??:/gm)].map(
        (match) => match[1] ?? "",
    );
}

const attributes = (source: string) => [
    ...new Set(
        [...source.matchAll(/"(data-dnd-[a-z-]+|aria-[a-z]+)"/g)].map(
            (m) => m[1] ?? "",
        ),
    ),
];

describe("the API pages", () => {
    it("name every Draggable and Droppable option", () => {
        const draggable = page("api/draggable");
        for (const option of listed(
            read("packages/react/src/draggable/Draggable.tsx"),
            "OPTIONS",
        ))
            expect(draggable, option).toContain(`\`${option}\``);
        const droppable = page("api/droppable");
        for (const option of listed(
            read("packages/react/src/droppable/Droppable.tsx"),
            "OPTIONS",
        ))
            expect(droppable, option).toContain(`\`${option}\``);
    });

    it("name every Sortable, SortableGroup and Swappable option", () => {
        const wrappers = [
            ["packages/react/src/sortable/Sortable.tsx", "api/sortable"],
            [
                "packages/react/src/sortable/SortableGroup.tsx",
                "api/sortable-group",
            ],
            ["packages/react/src/swappable/Swappable.tsx", "api/swappable"],
        ] as const;
        for (const [source, path] of wrappers) {
            const options = listed(read(source), "OPTIONS");
            expect(options.length, source).toBeGreaterThan(3);
            for (const option of options)
                expect(page(path), `${path}: ${option}`).toContain(
                    `\`${option}\``,
                );
        }
    });

    it("name every attribute the hooks set", () => {
        const pages = [
            ["packages/react/src/draggable/useDraggable.ts", "api/draggable"],
            ["packages/react/src/DragHandle.tsx", "api/drag-handle"],
            ["packages/react/src/droppable/useDroppable.ts", "api/droppable"],
            ["packages/react/src/sortable/useSortable.ts", "api/sortable"],
            [
                "packages/react/src/sortable/useSortableGroup.ts",
                "api/sortable-group",
            ],
            ["packages/react/src/swappable/useSwappable.ts", "api/swappable"],
            // written by the core with the target's shift, never rendered
            ["packages/core/src/swappable/index.ts", "api/swappable"],
        ] as const;
        const states = page("concepts/state-attributes");
        for (const [source, path] of pages) {
            for (const attribute of attributes(read(source))) {
                expect(page(path), `${path}: ${attribute}`).toContain(
                    attribute,
                );
                expect(states, attribute).toContain(attribute);
            }
        }
    });

    it("name every key of the five verbs", () => {
        const types = read("packages/core/src/core/types.ts");
        const core = page("api/core");
        for (const map of [
            "DragSpaceGetMap",
            "DragSpaceIsMap",
            "DragSpaceRunMap",
            "DragSpaceCheckMap",
        ])
            for (const key of keysOf(types, map))
                expect(core, `${map}.${key}`).toContain(`"${key}"`);
    });

    it("name every export of the shared entry", () => {
        const core = page("api/core");
        const index = read("packages/core/src/index.ts");
        const values = [
            ...index.matchAll(/^\s+(?!type )([a-zA-Z_]+),?$/gm),
        ].map((m) => m[1] ?? "");
        expect(values.length).toBeGreaterThan(5);
        for (const name of values) expect(core, name).toContain(name);
    });

    it("name every value export of the sortable and swappable entries", () => {
        const pages = [
            "api/sortable",
            "api/sortable-group",
            "api/swappable",
            "api/helpers",
        ]
            .map(page)
            .join("\n");
        for (const entry of ["sortable", "swappable"]) {
            const source = read(`packages/core/src/${entry}/index.ts`);
            const names = [
                // re-exported: `export { a, type B, c } from "…"`
                ...[...source.matchAll(/export \{([^}]*)\}/g)].flatMap(
                    (match) =>
                        (match[1] ?? "")
                            .split(",")
                            .map((name) => name.trim())
                            .filter(
                                (name) => name && !name.startsWith("type "),
                            ),
                ),
                // declared: `export function a`, `export const b`
                ...[
                    ...source.matchAll(
                        /^export (?:function|const) ([a-zA-Z]+)/gm,
                    ),
                ].map((match) => match[1] ?? ""),
            ];
            expect(names.length, entry).toBeGreaterThan(2);
            for (const name of names)
                expect(pages, `${entry}: ${name}`).toContain(`\`${name}`);
        }
    });
});
