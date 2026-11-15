import * as core from "@fragiola/dnd";
import * as coreDraggable from "@fragiola/dnd/draggable";
import * as coreDroppable from "@fragiola/dnd/droppable";
import { describe, expect, it } from "vitest";
import * as react from "../src";
import * as draggable from "../src/draggable";
import * as droppable from "../src/droppable";

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
];

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
        for (const capability of [
            coreDraggable,
            coreDroppable,
            draggable,
            droppable,
        ]) {
            for (const name of Object.keys(capability)) {
                if (name in core) continue;
                expect(name in react, name).toBe(false);
            }
        }
        for (const name of Object.keys(droppable))
            if (!(name in core)) expect(name in draggable, name).toBe(false);
        expect(typeof react.getDragSpace).toBe("function");
    });
});
