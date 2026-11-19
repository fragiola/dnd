// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { createSSRApp, defineComponent, h } from "vue";
import { renderToString } from "vue/server-renderer";
import { DragOverlay, useDragMonitor, useDragSpace } from "../src";
import { Draggable, DragHandle } from "../src/draggable";
import { Droppable } from "../src/droppable";
import { Sortable, SortableGroup } from "../src/sortable";
import { Swappable } from "../src/swappable";

// Server rendering: nothing touches a DOM during render (D4: no space is created on the server),
// the components render their child with their attributes (an empty one bare, as Vue writes it),
// and the overlay renders nothing.

const Monitor = defineComponent({
    setup() {
        useDragMonitor(() => {});
        useDragSpace();
        return () => null;
    },
});

const html = (render: () => ReturnType<typeof h> | ReturnType<typeof h>[]) =>
    renderToString(createSSRApp(defineComponent({ setup: () => render })));

describe("server rendering", () => {
    it("renders the wrapped elements and no overlay, without a document", async () => {
        const error = vi.spyOn(console, "error");
        const warn = vi.spyOn(console, "warn");
        expect(typeof document).toBe("undefined");
        expect(
            await html(() =>
                h("main", [
                    h(Monitor),
                    h(Draggable, { id: "a", class: "card" }, () =>
                        h("li", [h(DragHandle, null, () => h("span", "grip"))]),
                    ),
                    h(Droppable, { id: "z", disabled: true }, () =>
                        h("section"),
                    ),
                    h(DragOverlay, null, () => "ghost"),
                ]),
            ),
        ).toBe(
            '<main><!----><li data-dnd-part="draggable" data-dnd-id="a" class="card"><span data-dnd-part="handle" data-dnd-handle>grip</span></li><section data-dnd-part="droppable" data-dnd-id="z" data-dnd-disabled aria-disabled="true"></section><!----></main>',
        );
        expect(error).not.toHaveBeenCalled();
        expect(warn).not.toHaveBeenCalled();
    });

    it("renders sortable and swappable items, their group and a handle, without a document", async () => {
        const error = vi.spyOn(console, "error");
        expect(
            await html(() => [
                h(SortableGroup, { group: "list" }, () =>
                    h("ul", [
                        h(Sortable, { id: "a", index: 0, group: "list" }, () =>
                            h("li", [h(DragHandle, null, () => h("span"))]),
                        ),
                    ]),
                ),
                h(
                    Swappable,
                    { id: "s", index: 0, group: "row", disabled: true },
                    () => h("div"),
                ),
            ]),
        ).toBe(
            '<!--[--><ul data-dnd-part="sortable-group" data-dnd-id="list"><li data-dnd-part="sortable" data-dnd-id="a"><span data-dnd-part="handle" data-dnd-handle></span></li></ul><div data-dnd-part="swappable" data-dnd-id="s" data-dnd-disabled aria-disabled="true"></div><!--]-->',
        );
        expect(error).not.toHaveBeenCalled();
    });
});
