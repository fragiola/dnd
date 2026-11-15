import * as core from "@fragiola/dnd";
import * as coreDraggable from "@fragiola/dnd/draggable";
import * as coreDroppable from "@fragiola/dnd/droppable";
import * as coreSortable from "@fragiola/dnd/sortable";
import * as coreSwappable from "@fragiola/dnd/swappable";
import { describe, expect, it } from "vitest";
import * as react from "../src";
import * as draggable from "../src/draggable";
import * as droppable from "../src/droppable";
import * as sortable from "../src/sortable";
import * as swappable from "../src/swappable";

// D1: an app installs only @fragiola/dnd-react. Each of its entries re-exports the core's entry of
// the same name (`export *`), read here from the core's sources, and adds exactly its React parts
// (D3: named exports per capability, no namespace).

const entries = [
    {
        name: ".",
        core,
        react,
        own: ["DragOverlay", "useDragMonitor", "useDragSpace"],
    },
    {
        name: "/draggable",
        core: coreDraggable,
        react: draggable,
        own: ["DragHandle", "Draggable", "useDraggable"],
    },
    {
        name: "/droppable",
        core: coreDroppable,
        react: droppable,
        own: ["Droppable", "useDroppable"],
    },
    {
        name: "/sortable",
        core: coreSortable,
        react: sortable,
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
        react: swappable,
        own: ["DragHandle", "Swappable", "useSwappable"],
    },
];

/** Shared parts every drag source's entry re-exports (one binding), never the main entry. */
const SHARED = ["DragHandle"];

describe("@fragiola/dnd-react", () => {
    it.each(entries)("re-exports the core's $name entry", (entry) => {
        const reexported: Record<string, unknown> = { ...entry.react };
        for (const [name, value] of Object.entries(entry.core)) {
            expect(reexported[name], name).toBe(value);
        }
    });

    it.each(entries)("adds exactly its own React parts to $name", (entry) => {
        const added = Object.keys(entry.react)
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
                expect(name in react, name).toBe(false);
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
        expect(typeof react.getDragSpace).toBe("function");
    });
});
