import * as core from "@fragiola/dnd";
import * as coreDraggable from "@fragiola/dnd/draggable";
import * as coreDroppable from "@fragiola/dnd/droppable";
import * as coreSortable from "@fragiola/dnd/sortable";
import * as coreSwappable from "@fragiola/dnd/swappable";
import { describe, expect, it } from "vitest";
import * as vue from "../src";
import * as draggable from "../src/draggable";
import * as droppable from "../src/droppable";
import * as sortable from "../src/sortable";
import * as swappable from "../src/swappable";

// D1: an app installs only @fragiola/dnd-vue. Each of its entries re-exports the core's entry of
// the same name (`export *`), read here from the core's sources, and adds exactly its Vue parts
// (D3: named exports per capability, no namespace).

const entries = [
    {
        name: ".",
        core,
        vue,
        own: ["DragOverlay", "useDragMonitor", "useDragSpace"],
    },
    {
        name: "/draggable",
        core: coreDraggable,
        vue: draggable,
        own: ["DragHandle", "Draggable", "useDraggable"],
    },
    {
        name: "/droppable",
        core: coreDroppable,
        vue: droppable,
        own: ["Droppable", "useDroppable"],
    },
    {
        name: "/sortable",
        core: coreSortable,
        vue: sortable,
        own: [
            "DragHandle",
            "Sortable",
            "SortableGroup",
            "useSortable",
            "useSortableGroup",
        ],
    },
    {
        name: "/swappable",
        core: coreSwappable,
        vue: swappable,
        own: ["DragHandle", "Swappable", "useSwappable"],
    },
];

/** Shared parts every drag source's entry re-exports (one binding), never the main entry. */
const SHARED = ["DragHandle"];

describe("@fragiola/dnd-vue", () => {
    it.each(entries)("re-exports the core's $name entry", (entry) => {
        const reexported: Record<string, unknown> = { ...entry.vue };
        for (const [name, value] of Object.entries(entry.core)) {
            expect(reexported[name], name).toBe(value);
        }
    });

    it.each(entries)("adds exactly its own Vue parts to $name", (entry) => {
        const added = Object.keys(entry.vue)
            .filter((name) => !(name in entry.core))
            .sort();
        expect(added).toEqual([...entry.own].sort());
    });

    it("keeps each capability out of the main entry, and out of each other", () => {
        const capabilities = [draggable, droppable, sortable, swappable];
        for (const capability of [
            coreDraggable,
            coreDroppable,
            coreSortable,
            coreSwappable,
            ...capabilities,
        ]) {
            for (const name of Object.keys(capability)) {
                if (name in core) continue;
                expect(name in vue, name).toBe(false);
            }
        }
        for (const one of capabilities)
            for (const other of capabilities) {
                if (one === other) continue;
                for (const name of Object.keys(one)) {
                    if (name in core) continue;
                    if (!SHARED.includes(name))
                        expect(name in other, name).toBe(false);
                    else if (name in other)
                        expect((other as Record<string, unknown>)[name]).toBe(
                            (one as Record<string, unknown>)[name],
                        );
                }
            }
        expect(typeof vue.getDragSpace).toBe("function");
    });
});
