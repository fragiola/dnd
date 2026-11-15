import { describe, expect, it } from "vitest";
import { arrayMove, moveBetween } from "../src/sortable";
import { swapBetween, swapItems } from "../src/swappable";

// The helpers an app applies the events with: pure, on frozen input, returning what the event
// describes (and the input itself when nothing moves).

const frozen = <T extends object>(value: T): T => {
    for (const each of Object.values(value))
        if (each && typeof each === "object") Object.freeze(each);
    return Object.freeze(value);
};

describe("arrayMove", () => {
    it("returns a new array with the item moved, up or down", () => {
        const list = frozen(["a", "b", "c", "d"]);
        expect(arrayMove(list, 0, 2)).toEqual(["b", "c", "a", "d"]);
        expect(arrayMove(list, 3, 1)).toEqual(["a", "d", "b", "c"]);
        expect(arrayMove(list, 1, 1)).toEqual(list);
        expect(arrayMove(list, 1, 1)).not.toBe(list);
        // out of range: a copy
        expect(arrayMove(list, 9, 0)).toEqual(list);
        expect(list).toEqual(["a", "b", "c", "d"]);
    });
});

describe("moveBetween", () => {
    const lists = frozen({
        todo: ["a", "b", "c"],
        done: ["x"],
        empty: [] as string[],
    });

    it("moves within a group and across groups, as the sort-end event says", () => {
        expect(
            moveBetween(lists, {
                from: { group: "todo", index: 0 },
                to: { group: "todo", index: 2 },
            }),
        ).toEqual({ todo: ["b", "c", "a"], done: ["x"], empty: [] });
        const across = moveBetween(lists, {
            from: { group: "todo", index: 1 },
            to: { group: "done", index: 0 },
        });
        expect(across).toEqual({
            todo: ["a", "c"],
            done: ["b", "x"],
            empty: [],
        });
        // the untouched group keeps its array
        expect(across.empty).toBe(lists.empty);
        expect(
            moveBetween(lists, {
                from: { group: "done", index: 0 },
                to: { group: "empty", index: 0 },
            }),
        ).toEqual({ todo: ["a", "b", "c"], done: [], empty: ["x"] });
        expect(lists.todo).toEqual(["a", "b", "c"]);
    });

    it("returns the lists themselves for a cancel or no move", () => {
        const move = {
            from: { group: "todo", index: 0 },
            to: { group: "done", index: 1 },
        };
        expect(moveBetween(lists, { ...move, canceled: true })).toBe(lists);
        expect(moveBetween(lists, { from: move.from, to: move.from })).toBe(
            lists,
        );
        expect(
            moveBetween(lists, {
                from: { group: "nowhere", index: 0 },
                to: move.to,
            }),
        ).toBe(lists);
    });
});

describe("swapItems and swapBetween", () => {
    it("exchanges two items of a list, never the input", () => {
        const list = frozen([1, 2, 3]);
        expect(swapItems(list, 0, 2)).toEqual([3, 2, 1]);
        expect(swapItems(list, 0, 7)).toEqual([1, 2, 3]);
        expect(list).toEqual([1, 2, 3]);
    });

    it("swaps within a group and across groups, as the swap event says", () => {
        const lists = frozen({ left: ["a", "b"], right: ["x", "y"] });
        expect(
            swapBetween(lists, {
                source: { group: "left", index: 0 },
                target: { group: "left", index: 1 },
            }),
        ).toEqual({ left: ["b", "a"], right: ["x", "y"] });
        expect(
            swapBetween(lists, {
                source: { group: "left", index: 1 },
                target: { group: "right", index: 0 },
            }),
        ).toEqual({ left: ["a", "x"], right: ["b", "y"] });
        const source = { group: "left", index: 0 };
        expect(swapBetween(lists, { source })).toBe(lists);
        expect(
            swapBetween(lists, {
                source,
                target: { group: "right", index: 1 },
                canceled: true,
            }),
        ).toBe(lists);
        expect(swapBetween(lists, { source, target: source })).toBe(lists);
    });
});
