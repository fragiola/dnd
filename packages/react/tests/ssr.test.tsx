// @vitest-environment node
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { DragOverlay, useDragMonitor, useDragSpace } from "../src";
import { Draggable, DragHandle } from "../src/draggable";
import { Droppable } from "../src/droppable";
import { Sortable, SortableGroup } from "../src/sortable";
import { Swappable } from "../src/swappable";

// Server rendering: nothing touches a DOM during render (D4: no space is created on the server),
// the wrappers render their child with their attributes, and the overlay renders nothing.

function Monitor() {
    useDragMonitor(() => {});
    useDragSpace();
    return null;
}

describe("server rendering", () => {
    it("renders the wrapped elements and no overlay, without a document", () => {
        const error = vi.spyOn(console, "error");
        expect(typeof document).toBe("undefined");
        const html = renderToString(
            <main>
                <Monitor />
                <Draggable id="a" className="card">
                    <li>
                        <DragHandle>
                            <span>grip</span>
                        </DragHandle>
                    </li>
                </Draggable>
                <Droppable id="z" disabled>
                    <section />
                </Droppable>
                <DragOverlay>ghost</DragOverlay>
            </main>,
        );
        expect(html).toBe(
            '<main><li data-dnd-part="draggable" data-dnd-id="a" class="card"><span data-dnd-part="handle" data-dnd-handle="">grip</span></li><section data-dnd-part="droppable" data-dnd-id="z" data-dnd-disabled="" aria-disabled="true"></section></main>',
        );
        expect(error).not.toHaveBeenCalled();
    });

    it("renders sortable and swappable items, their group and a handle, without a document", () => {
        const error = vi.spyOn(console, "error");
        const html = renderToString(
            <>
                <SortableGroup group="list">
                    <ul>
                        <Sortable id="a" index={0} group="list">
                            <li>
                                <DragHandle>
                                    <span />
                                </DragHandle>
                            </li>
                        </Sortable>
                    </ul>
                </SortableGroup>
                <Swappable id="s" index={0} group="row" disabled>
                    <div />
                </Swappable>
            </>,
        );
        expect(html).toBe(
            '<ul data-dnd-part="sortable-group" data-dnd-id="list"><li data-dnd-part="sortable" data-dnd-id="a"><span data-dnd-part="handle" data-dnd-handle=""></span></li></ul><div data-dnd-part="swappable" data-dnd-id="s" data-dnd-disabled="" aria-disabled="true"></div>',
        );
        expect(error).not.toHaveBeenCalled();
    });
});
