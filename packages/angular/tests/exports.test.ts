import * as core from "@fragiola/dnd";
import * as coreDraggable from "@fragiola/dnd/draggable";
import * as coreDroppable from "@fragiola/dnd/droppable";
import * as coreSortable from "@fragiola/dnd/sortable";
import * as coreSwappable from "@fragiola/dnd/swappable";
import { describe, expect, it } from "vitest";
import * as draggable from "../draggable/public-api";
import * as droppable from "../droppable/public-api";
import * as sortable from "../sortable/public-api";
import * as angular from "../src/public-api";
import * as swappable from "../swappable/public-api";

// D1: an app installs only @fragiola/dnd-angular. Each of its entries re-exports the core's entry
// of the same name (`export *`), read here from the core's sources, and adds exactly its Angular
// parts (D3: named exports per capability, no namespace). The main entry's `ɵ` members are what
// the capability entries build on (ng-packagr bundles each entry alone), not an app's API; the
// shared handle is one class, re-exported by each drag source's entry.

const entries = [
    {
        name: ".",
        core,
        angular,
        own: ["DndDragOverlay", "injectDragMonitor", "injectDragSpace"],
    },
    {
        name: "/draggable",
        core: coreDraggable,
        angular: draggable,
        own: ["DndDragHandle", "DndDraggable"],
    },
    {
        name: "/droppable",
        core: coreDroppable,
        angular: droppable,
        own: ["DndDroppable"],
    },
    {
        name: "/sortable",
        core: coreSortable,
        angular: sortable,
        own: ["DndDragHandle", "DndSortable", "DndSortableGroup"],
    },
    {
        name: "/swappable",
        core: coreSwappable,
        angular: swappable,
        own: ["DndDragHandle", "DndSwappable"],
    },
];

/** Shared parts every drag source's entry re-exports (one binding), never the main entry. */
const SHARED = ["DndDragHandle"];

describe("@fragiola/dnd-angular", () => {
    it.each(entries)("re-exports the core's $name entry", (entry) => {
        const reexported: Record<string, unknown> = { ...entry.angular };
        for (const [name, value] of Object.entries(entry.core)) {
            expect(reexported[name], name).toBe(value);
        }
    });

    it.each(entries)("adds exactly its own Angular parts to $name", (entry) => {
        const added = Object.keys(entry.angular)
            .filter((name) => !(name in entry.core) && !name.startsWith("ɵ"))
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
                expect(name in angular, name).toBe(false);
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
        expect(typeof angular.getDragSpace).toBe("function");
        expect(draggable.DndDragHandle).toBe(angular.ɵDndDragHandle);
    });
});
