import { describe, expect, it } from "vitest";
import type { Rect } from "../src/core/types";
import {
    grid,
    horizontalList,
    type SortShiftInput,
    verticalList,
} from "../src/sortable";

// The sort strategies are pure: frozen input in, shifts and places out, in Node (no DOM).

const deep = <T>(value: T): T => {
    if (value && typeof value === "object") {
        for (const each of Object.values(value)) deep(each);
        Object.freeze(value);
    }
    return value;
};

const box = (x: number, y: number, width = 100, height = 50): Rect => ({
    x,
    y,
    width,
    height,
});

/** A column at x 0: heights 50, 100, 50, 10 px apart. */
const COLUMN = deep([
    box(0, 0),
    box(0, 60, 100, 100),
    box(0, 170),
    box(0, 230),
]);
/** A row of 80 px wide boxes, 20 px apart, from x 0. */
const ROW = deep([box(0, 0, 80), box(100, 0, 80), box(200, 0, 80)]);
/** The same row in RTL: index 0 is the rightmost. */
const ROW_RTL = deep([box(200, 0, 80), box(100, 0, 80), box(0, 0, 80)]);

const ys = (input: SortShiftInput) =>
    verticalList.shifts(deep(input)).shifts.map((shift) => shift.y);

describe("verticalList", () => {
    it("moves the items between `from` and `to`, keeping each size and the gaps", () => {
        // the first item (50 px) to the third place: the 100 px item and the next go up 60
        const source = COLUMN[0] as Rect;
        const result = verticalList.shifts(
            deep({ rects: COLUMN, from: 0, to: 2, source, rtl: false }),
        );
        expect(result.shifts.map((shift) => shift.y)).toEqual([0, -60, -60, 0]);
        // it lands where the third item started once the others moved up: 110 + 60
        expect(result.landing).toEqual({ x: 0, y: 170 });
        // up: the third item to the top pushes the first two down by its size and a gap
        expect(
            ys({
                rects: COLUMN,
                from: 2,
                to: 0,
                source: COLUMN[2] as Rect,
                rtl: false,
            }),
        ).toEqual([60, 60, 0, 0]);
        // no move, no shift
        expect(
            ys({
                rects: COLUMN,
                from: 1,
                to: 1,
                source: COLUMN[1] as Rect,
                rtl: false,
            }),
        ).toEqual([0, 0, 0, 0]);
    });

    it("closes the gap the source leaves for another group, and opens one where it comes in", () => {
        const source = box(300, 0, 100, 40);
        expect(
            ys({
                rects: COLUMN,
                from: 1,
                source: COLUMN[1] as Rect,
                rtl: false,
            }),
        ).toEqual([0, 0, -110, -110]);
        const into = verticalList.shifts(
            deep({ rects: COLUMN, to: 1, source, rtl: false }),
        );
        // 40 px and a 10 px gap from the second item on; lands at the second item's top
        expect(into.shifts.map((shift) => shift.y)).toEqual([0, 50, 50, 50]);
        expect(into.landing).toEqual({ x: -300, y: 60 });
        // at the end: after the last one, a gap below it
        expect(
            verticalList.shifts(
                deep({ rects: COLUMN, to: 4, source, rtl: false }),
            ).landing,
        ).toEqual({ x: -300, y: 290 });
        // in RTL it lines up with the items' right edges
        expect(
            verticalList.shifts(
                deep({
                    rects: COLUMN,
                    to: 0,
                    source: box(300, 0, 60, 40),
                    rtl: true,
                }),
            ).landing,
        ).toEqual({ x: -260, y: 0 });
    });

    it("places the source over an item at that item's place, and keeps it between items", () => {
        const at = (y: number, previous?: number) =>
            verticalList.index(
                deep({
                    rects: COLUMN,
                    from: 0,
                    probe: { x: 50, y },
                    previous,
                    rtl: false,
                }),
            );
        expect(at(25)).toBe(0);
        expect(at(100)).toBe(1);
        expect(at(200)).toBe(2);
        // a gap, or past the end: where it was
        expect(at(165, 1)).toBe(1);
        expect(at(400, 3)).toBe(3);
        expect(at(400)).toBe(0);
        // from another group: before or after the item, by its half
        const into = (y: number) =>
            verticalList.index(
                deep({ rects: COLUMN, probe: { x: 50, y }, rtl: false }),
            );
        expect(into(10)).toBe(0);
        expect(into(40)).toBe(1);
        expect(into(260)).toBe(4);
        expect(into(500)).toBe(4);
    });
});

describe("horizontalList", () => {
    it("flows from the inline start, the left in LTR and the right in RTL", () => {
        const ltr = horizontalList.shifts(
            deep({
                rects: ROW,
                from: 0,
                to: 2,
                source: ROW[0] as Rect,
                rtl: false,
            }),
        );
        expect(ltr.shifts.map((shift) => shift.x)).toEqual([0, -100, -100]);
        expect(ltr.landing).toEqual({ x: 200, y: 0 });
        const rtl = horizontalList.shifts(
            deep({
                rects: ROW_RTL,
                from: 0,
                to: 2,
                source: ROW_RTL[0] as Rect,
                rtl: true,
            }),
        );
        // index 0 is the rightmost: the others move right, the source lands on the left
        expect(rtl.shifts.map((shift) => shift.x)).toEqual([0, 100, 100]);
        expect(rtl.landing).toEqual({ x: -200, y: 0 });
    });

    it("splits an item by its inline half, RTL aware", () => {
        const into = (x: number, rtl: boolean) =>
            horizontalList.index(
                deep({ rects: rtl ? ROW_RTL : ROW, probe: { x, y: 25 }, rtl }),
            );
        expect(into(10, false)).toBe(0);
        expect(into(70, false)).toBe(1);
        // in RTL the rightmost item is the first, and its right half is before it
        expect(into(270, true)).toBe(0);
        expect(into(210, true)).toBe(1);
        expect(into(10, true)).toBe(3);
    });
});

describe("grid", () => {
    // two rows of three 80×50 boxes, 20 px apart
    const CELLS = deep([
        box(0, 0, 80),
        box(100, 0, 80),
        box(200, 0, 80),
        box(0, 70, 80),
        box(100, 70, 80),
        box(200, 70, 80),
    ]);

    it("moves each item to its new place's corner, the inline-start one", () => {
        const result = grid.shifts(
            deep({
                rects: CELLS,
                from: 1,
                to: 4,
                source: CELLS[1] as Rect,
                rtl: false,
            }),
        );
        expect(result.shifts).toEqual([
            { x: 0, y: 0 },
            { x: 0, y: 0 },
            { x: -100, y: 0 },
            { x: 200, y: -70 },
            { x: -100, y: 0 },
            { x: 0, y: 0 },
        ]);
        expect(result.landing).toEqual({ x: 0, y: 70 });
        // a wider source lines up with the right edges in RTL
        const rtl = grid.shifts(
            deep({ rects: CELLS, to: 0, source: box(400, 0, 120), rtl: true }),
        );
        expect(rtl.landing).toEqual({ x: 80 - 520, y: 0 });
        // after the last one: one more step along its row
        expect(
            grid.shifts(
                deep({
                    rects: CELLS,
                    to: 6,
                    source: box(400, 0, 80),
                    rtl: false,
                }),
            ).landing,
        ).toEqual({ x: -100, y: 70 });
    });

    it("needs the probe well inside an item of another row (hysteresis), not of its own", () => {
        const at = (x: number, y: number, previous: number) =>
            grid.index(
                deep({
                    rects: CELLS,
                    from: 0,
                    probe: { x, y },
                    previous,
                    rtl: false,
                }),
            );
        // just inside the top edge of the next row: it stays
        expect(at(140, 75, 1)).toBe(1);
        // a quarter into it: it goes
        expect(at(140, 85, 1)).toBe(4);
        // within its own row, an edge is enough
        expect(at(205, 2, 1)).toBe(2);
        // the gap between rows keeps it
        expect(at(140, 60, 1)).toBe(1);
    });
});
