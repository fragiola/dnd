import { getDragSpace } from "@fragiola/dnd";
import { describe, expect, it, vi } from "vitest";
import { type Component, defineComponent, h, type PropType, ref } from "vue";
import {
    arrayMove,
    DragHandle,
    moveBetween,
    Sortable,
    SortableGroup,
    type SortableState,
    type SortEndEvent,
} from "../src/sortable";
import {
    byTestId,
    countUpdates,
    placeAll,
    pointer,
    render,
    settle,
} from "./helpers";

// The sortable components: no element of their own, no wrapper around a list, the merge rules, a
// handle found through the DOM, a second mount, and no component update during a sort's preview:
// the app commits once, on `onSortEnd`, with the helpers.

/** A list the app owns: it applies `onSortEnd` with `arrayMove`. */
const List = defineComponent({
    props: {
        handle: Boolean,
        onSortEnd: Function as PropType<(event: SortEndEvent) => void>,
    },
    setup(props) {
        const items = ref(["a", "b", "c", "d"]);
        return () =>
            h(
                "ul",
                items.value.map((id, index) =>
                    h(
                        Sortable,
                        {
                            key: id,
                            id,
                            index,
                            group: "list",
                            onSortEnd: (event: SortEndEvent) => {
                                props.onSortEnd?.(event);
                                items.value = arrayMove(
                                    items.value,
                                    event.from.index,
                                    event.to.index,
                                );
                            },
                        },
                        {
                            default: ({ state }: { state: SortableState }) =>
                                h(
                                    "li",
                                    {
                                        "data-testid": id,
                                        class: [
                                            "item",
                                            state.dragging && "lifted",
                                        ],
                                    },
                                    [
                                        props.handle
                                            ? h(DragHandle, null, () =>
                                                  h("span", {
                                                      "data-testid": `${id}-grip`,
                                                  }),
                                              )
                                            : null,
                                        id,
                                    ],
                                ),
                        },
                    ),
                ),
            );
    },
});

/** Each item's box by its id, in the order rendered now: a column of 100×50, 10 px apart. */
function placeColumn(ids = ["a", "b", "c", "d"]) {
    const rendered = [...document.querySelectorAll("li")].map(
        (li) => li.dataset.testid ?? "",
    );
    placeAll(
        Object.fromEntries(
            rendered
                .filter((id) => ids.includes(id))
                .map((id, index) => [
                    id,
                    { x: 0, y: index * 60, width: 100, height: 50 },
                ]),
        ),
    );
}

const order = () =>
    [...document.querySelectorAll("li")].map((li) => li.dataset.testid);

/** Drags the item `id` from its centre by `dy`, waiting for Vue after each step. */
async function sortBy(id: string, dy: number, release = true, from = id) {
    const element = byTestId(from);
    const box = element.getBoundingClientRect();
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    const press = pointer(element, x, y);
    press.move(x, y + 4);
    await settle();
    press.move(x, y + dy);
    await settle();
    if (release) {
        press.release(x, y + dy);
        await settle();
    }
    return press;
}

describe("Sortable and SortableGroup render no element of their own", () => {
    it("render exactly the child, with their part, id and the child's own props", () => {
        const { container } = render(
            defineComponent({
                setup: () => () =>
                    h(SortableGroup, { group: "list", class: "box" }, () =>
                        h("ul", { "data-testid": "group", class: "own" }, [
                            h(
                                Sortable,
                                {
                                    id: "a",
                                    index: 0,
                                    group: "list",
                                    "data-extra": "t",
                                },
                                () => h("li", { "data-testid": "a" }),
                            ),
                        ]),
                    ),
            }),
        );
        const group = byTestId("group");
        expect(container.firstElementChild).toBe(group);
        expect(group.dataset.dndPart).toBe("sortable-group");
        expect(group.dataset.dndId).toBe("list");
        expect(group.className).toBe("own box");
        const item = byTestId("a");
        expect(group.firstElementChild).toBe(item);
        expect(item.dataset.dndPart).toBe("sortable");
        expect(item.dataset.dndId).toBe("a");
        expect(item.getAttribute("data-extra")).toBe("t");
        expect(item.tabIndex).toBe(0);
    });
});

describe("a sort from Vue", () => {
    it("previews with the core's shifts, then the app commits the new order once", async () => {
        const onSortEnd = vi.fn();
        render(List, { props: { onSortEnd } });
        placeColumn();
        const press = await sortBy("a", 130, false);
        const a = byTestId("a");
        expect(a.dataset.dndDragging).toBe("");
        expect(a.className).toBe("item lifted");
        // every item takes part in the sort
        expect(
            ["a", "b", "c", "d"].map((id) => byTestId(id).dataset.dndSorting),
        ).toEqual(["", "", "", ""]);
        expect(byTestId("b").style.translate).toBe("0px -60px");
        expect(byTestId("c").style.translate).toBe("0px -60px");
        // the app's DOM order is untouched during the preview
        expect(order()).toEqual(["a", "b", "c", "d"]);
        press.release(50, 159);
        await settle();
        expect(onSortEnd.mock.calls[0]?.[0]).toMatchObject({
            from: { group: "list", index: 0 },
            to: { group: "list", index: 2 },
        });
        expect(order()).toEqual(["b", "c", "a", "d"]);
        for (const id of ["a", "b", "c", "d"]) {
            const item = byTestId(id);
            expect(item.style.translate, id).toBe("");
            expect(item.dataset.dndSorting, id).toBeUndefined();
        }
    });

    it("updates nothing while the preview changes, once at the start and once at the end", async () => {
        const updates: string[] = [];
        render(List, countUpdates(updates));
        placeColumn();
        updates.length = 0;
        const press = await sortBy("a", 10, false);
        // the start: every item becomes `sorting`
        expect([...new Set(updates)].sort()).toEqual(["a", "b", "c", "d"]);
        updates.length = 0;
        for (let dy = 10; dy <= 190; dy += 15) {
            press.move(50, 25 + dy);
            await settle();
        }
        expect(byTestId("d").style.translate).toBe("0px -60px");
        expect(updates).toEqual([]);
        press.release(50, 215);
        await settle();
        expect(order()).toEqual(["b", "c", "d", "a"]);
        // the end: back to rest, in the new order
        expect([...new Set(updates)].sort()).toEqual([
            "a",
            "anonymous",
            "b",
            "c",
            "d",
        ]);
    });

    it("writes only the allow-listed inline style: translate during a sort, nothing after", async () => {
        render(List);
        placeColumn();
        const press = await sortBy("a", 70, false);
        for (const id of ["a", "b"]) {
            const style = byTestId(id).style;
            expect([...style], id).toEqual(["translate"]);
        }
        press.release(50, 95);
        await settle();
        for (const id of ["a", "b", "c", "d"])
            expect([...byTestId(id).style], id).toEqual([]);
    });

    it("drags from a DragHandle only, found through the DOM", async () => {
        const onSortEnd = vi.fn();
        render(List, { props: { handle: true, onSortEnd } });
        placeColumn();
        placeAll({ "a-grip": { x: 0, y: 0, width: 10, height: 10 } });
        await sortBy("a", 130);
        expect(onSortEnd).not.toHaveBeenCalled();
        expect(byTestId("a-grip").dataset.dndHandle).toBe("");
        await sortBy("a", 130, true, "a-grip");
        expect(onSortEnd).toHaveBeenCalledOnce();
        expect(order()).toEqual(["b", "c", "a", "d"]);
    });

    it("registers once, and unregisters on unmount", async () => {
        const space = getDragSpace(document);
        const { wrapper } = render(List);
        expect(space.get("draggable-ids")).toEqual(["a", "b", "c", "d"]);
        placeColumn();
        await sortBy("d", -190);
        expect(order()).toEqual(["d", "a", "b", "c"]);
        wrapper.unmount();
        expect(space.get("draggable-ids")).toEqual([]);
        expect(space.get("droppable-ids")).toEqual([]);
    });
});

/** A kanban the app owns: `todo` and an empty `done` with its container, applied with moveBetween. */
const Board: Component = defineComponent({
    setup() {
        const lists = ref<Record<string, readonly string[]>>({
            todo: ["a", "b"],
            done: [],
        });
        return () =>
            Object.entries(lists.value).map(([group, ids]) =>
                h(
                    SortableGroup,
                    { key: group, group, accepts: ["todo", "done"] },
                    () =>
                        h(
                            "ul",
                            { "data-testid": group },
                            ids.map((id, index) =>
                                h(
                                    Sortable,
                                    {
                                        key: id,
                                        id,
                                        index,
                                        group,
                                        accepts: ["todo", "done"],
                                        onSortEnd: (event: SortEndEvent) => {
                                            lists.value = moveBetween(
                                                lists.value,
                                                event,
                                            );
                                        },
                                    },
                                    () => h("li", { "data-testid": id }),
                                ),
                            ),
                        ),
                ),
            );
    },
});

describe("groups from Vue", () => {
    it("moves an item into an empty group through SortableGroup, with moveBetween", async () => {
        render(Board);
        placeAll({
            todo: { x: 0, y: 0, width: 100, height: 300 },
            done: { x: 200, y: 0, width: 100, height: 300 },
            a: { x: 0, y: 0, width: 100, height: 50 },
            b: { x: 0, y: 60, width: 100, height: 50 },
        });
        const press = pointer(byTestId("a"), 50, 25);
        press.move(50, 29);
        await settle();
        press.move(250, 100);
        await settle();
        expect(byTestId("done").dataset.dndSorting).toBe("");
        expect(byTestId("b").style.translate).toBe("0px -60px");
        press.release(250, 100);
        await settle();
        expect(byTestId("done").contains(byTestId("a"))).toBe(true);
        expect(byTestId("b").style.translate).toBe("");
    });
});
