import { describe, expect, it, vi } from "vitest";
import { defineComponent, h, type PropType, ref } from "vue";
import { type SwapEvent, Swappable, swapItems } from "../src/swappable";
import {
    byTestId,
    countUpdates,
    placeAll,
    pointer,
    render,
    settle,
} from "./helpers";

// The swappable component: no element of its own, a preview the core writes (only the target
// moves, marked `data-dnd-swap-target`) with no component update, and the app's commit with
// `swapItems`.

const Row = defineComponent({
    props: { onSwap: Function as PropType<(event: SwapEvent) => void> },
    setup(props) {
        const items = ref(["a", "b", "c"]);
        return () =>
            h(
                "div",
                items.value.map((id, index) =>
                    h(
                        Swappable,
                        {
                            key: id,
                            id,
                            index,
                            group: "row",
                            onSwap: (event: SwapEvent) => {
                                props.onSwap?.(event);
                                const { target } = event;
                                if (target)
                                    items.value = swapItems(
                                        items.value,
                                        event.source.index,
                                        target.index,
                                    );
                            },
                        },
                        () => h("div", { "data-testid": id }),
                    ),
                ),
            );
    },
});

const place = () =>
    placeAll(
        Object.fromEntries(
            [...document.querySelectorAll<HTMLElement>("[data-testid]")]
                .filter((el) => el.dataset.dndPart === "swappable")
                .map((el, index) => [
                    el.dataset.testid ?? "",
                    { x: index * 100, y: 0, width: 80, height: 50 },
                ]),
        ),
    );

const order = () =>
    [...document.querySelectorAll<HTMLElement>("[data-dnd-part]")].map(
        (el) => el.dataset.testid,
    );

describe("Swappable", () => {
    it("renders exactly the child, with its part and id", () => {
        const { container } = render(
            defineComponent({
                setup: () => () =>
                    h(
                        Swappable,
                        { id: "a", index: 0, group: "row", class: "x" },
                        () => h("div", { "data-testid": "a" }),
                    ),
            }),
        );
        const a = byTestId("a");
        expect(container.firstElementChild).toBe(a);
        expect(a.dataset.dndPart).toBe("swappable");
        expect(a.dataset.dndId).toBe("a");
        expect(a.className).toBe("x");
    });

    it("previews the swap with no update, then the app swaps once", async () => {
        const updates: string[] = [];
        const onSwap = vi.fn();
        render(Row, { props: { onSwap }, ...countUpdates(updates) });
        place();
        const press = pointer(byTestId("a"), 40, 25);
        press.move(44, 25);
        await settle();
        expect(byTestId("a").dataset.dndDragging).toBe("");
        updates.length = 0;
        press.move(140, 25);
        await settle();
        press.move(240, 25);
        await settle();
        expect(byTestId("c").dataset.dndSwapTarget).toBe("");
        expect(byTestId("c").style.translate).toBe("-200px");
        expect(byTestId("b").style.translate).toBe("");
        expect(byTestId("b").dataset.dndSwapTarget).toBeUndefined();
        expect(updates).toEqual([]);
        press.release(240, 25);
        await settle();
        expect(onSwap.mock.calls[0]?.[0]).toMatchObject({
            source: { id: "a", index: 0 },
            target: { id: "c", index: 2 },
        });
        expect(order()).toEqual(["c", "b", "a"]);
        expect(byTestId("c").style.translate).toBe("");
        expect(byTestId("c").dataset.dndSwapTarget).toBeUndefined();
    });
});
