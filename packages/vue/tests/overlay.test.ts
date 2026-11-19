import { describe, expect, it } from "vitest";
import { defineComponent, h, ref } from "vue";
import { DragOverlay, type DragOverlaySlotProps } from "../src";
import { Draggable } from "../src/draggable";
import { Droppable } from "../src/droppable";
import {
    byTestId,
    countUpdates,
    placeAll,
    pointer,
    render,
    settle,
} from "./helpers";

// The drag overlay (D7, D9): rendered only during a drag, teleported into the document's body at
// the dragged box, moved without a component update; the source opts out of `translate`.

const BOXES = {
    card: { x: 10, y: 20, width: 50, height: 40 },
    zone: { x: 200, y: 0, width: 100, height: 100 },
};

const overlay = () =>
    document.querySelector<HTMLElement>('[data-dnd-part="overlay"]');

const Page = defineComponent({
    setup: () => () => [
        h("div", { style: { overflow: "hidden" } }, [
            h(Draggable, { id: "card", translate: false }, () =>
                h("div", { "data-testid": "card" }),
            ),
        ]),
        h(Droppable, { id: "zone" }, () => h("div", { "data-testid": "zone" })),
        h(
            DragOverlay,
            { class: "ghost", style: { opacity: 0.5 } },
            {
                default: ({ operation }: DragOverlaySlotProps) =>
                    h(
                        "span",
                        { "data-testid": "ghost" },
                        `${String(operation.source.id)} over ${String(operation.target?.id ?? "nothing")}`,
                    ),
            },
        ),
    ],
});

describe("DragOverlay", () => {
    it("shows the app's content in a fixed box under the pointer during a drag only", async () => {
        const updates: string[] = [];
        render(Page, countUpdates(updates));
        placeAll(BOXES);
        expect(overlay()).toBeNull();
        const card = byTestId("card");
        const press = pointer(card, 20, 30);
        press.move(30, 30);
        await settle();
        expect(overlay()?.parentElement).toBe(document.body);
        expect(overlay()?.className).toBe("ghost");
        expect(overlay()?.getAttribute("style")).toBe(
            "opacity: 0.5; position: fixed; left: 20px; top: 20px; width: 50px; height: 40px; box-sizing: border-box; pointer-events: none;",
        );
        expect(byTestId("ghost").textContent).toBe("card over nothing");
        // the source stays where it is
        expect(card.style.translate).toBe("");

        updates.length = 0;
        press.move(60, 50);
        await settle();
        expect(overlay()?.style.left).toBe("50px");
        expect(overlay()?.style.top).toBe("40px");
        expect(updates.filter((name) => name === "DragOverlay")).toEqual([]);

        press.move(250, 50);
        await settle();
        expect(byTestId("ghost").textContent).toBe("card over zone");
        expect(updates.filter((name) => name === "DragOverlay")).toEqual([
            "DragOverlay",
        ]);

        press.release(250, 50);
        await settle();
        expect(overlay()).toBeNull();
    });

    it("renders plain content, or `as` instead of its div", async () => {
        render(
            defineComponent({
                setup: () => () => [
                    h(Draggable, { id: "card" }, () =>
                        h("div", { "data-testid": "card" }),
                    ),
                    h(DragOverlay, { as: "section" }, () => "Ghost"),
                ],
            }),
        );
        placeAll(BOXES);
        const press = pointer(byTestId("card"), 20, 30);
        press.move(40, 30);
        await settle();
        expect(overlay()?.tagName).toBe("SECTION");
        expect(overlay()?.textContent).toBe("Ghost");
        press.release(40, 30);
    });

    it("shows a drag already running when it mounts", async () => {
        const shown = ref(false);
        render(
            defineComponent({
                setup: () => () => [
                    h(Draggable, { id: "card" }, () =>
                        h("div", { "data-testid": "card" }),
                    ),
                    shown.value ? h(DragOverlay, null, () => "Ghost") : null,
                ],
            }),
        );
        placeAll(BOXES);
        const press = pointer(byTestId("card"), 20, 30);
        press.move(40, 30);
        await settle();
        shown.value = true;
        await settle();
        expect(overlay()?.textContent).toBe("Ghost");
        press.release(40, 30);
        await settle();
        expect(overlay()).toBeNull();
    });
});
