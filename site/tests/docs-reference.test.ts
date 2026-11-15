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

    it("name every attribute the hooks set", () => {
        const pages = [
            ["packages/react/src/draggable/useDraggable.ts", "api/draggable"],
            ["packages/react/src/DragHandle.tsx", "api/drag-handle"],
            ["packages/react/src/droppable/useDroppable.ts", "api/droppable"],
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
});
