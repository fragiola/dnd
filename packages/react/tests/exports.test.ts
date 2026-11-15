import * as core from "@fragiola/dnd";
import * as coreDraggable from "@fragiola/dnd/draggable";
import * as coreDroppable from "@fragiola/dnd/droppable";
import { describe, expect, it } from "vitest";
import * as react from "../src";
import * as draggable from "../src/draggable";
import * as droppable from "../src/droppable";

// D1: an app installs only @fragiola/dnd-react. Each of its entries re-exports the core's entry of
// the same name (`export *`), read here from the core's sources.

const entries = [
    { name: ".", core, react },
    { name: "/draggable", core: coreDraggable, react: draggable },
    { name: "/droppable", core: coreDroppable, react: droppable },
];

describe("@fragiola/dnd-react", () => {
    it.each(entries)("re-exports the core's $name entry", (entry) => {
        const reexported: Record<string, unknown> = { ...entry.react };
        for (const [name, value] of Object.entries(entry.core)) {
            expect(reexported[name], name).toBe(value);
        }
    });

    it("keeps each capability out of the main entry", () => {
        for (const capability of [coreDraggable, coreDroppable]) {
            for (const name of Object.keys(capability)) {
                expect(name in react, name).toBe(false);
            }
        }
        expect(react.VERSION).toBe("0.0.0");
    });
});
