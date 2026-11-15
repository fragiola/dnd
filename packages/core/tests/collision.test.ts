import { describe, expect, it } from "vitest";
import { closestCenter, pointerWithin, rectIntersection } from "../src";

// pure functions: they run in Node, with no DOM

const outer = { id: "outer", rect: { x: 0, y: 0, width: 300, height: 300 } };
const inner = { id: "inner", rect: { x: 50, y: 50, width: 100, height: 100 } };
const right = { id: "right", rect: { x: 400, y: 0, width: 100, height: 100 } };
const droppables = [outer, inner, right];
const box = (x: number, y: number) => ({ x, y, width: 40, height: 40 });

describe("pointerWithin", () => {
    it("picks the droppable under the pointer, the smallest when nested", () => {
        expect(
            pointerWithin({
                pointer: { x: 10, y: 10 },
                dragRect: box(0, 0),
                droppables,
            }),
        ).toBe(outer);
        expect(
            pointerWithin({
                pointer: { x: 60, y: 60 },
                dragRect: box(0, 0),
                droppables,
            }),
        ).toBe(inner);
        expect(
            pointerWithin({
                pointer: { x: 350, y: 10 },
                dragRect: box(340, 0),
                droppables,
            }),
        ).toBeUndefined();
        expect(
            pointerWithin({
                pointer: { x: 0, y: 0 },
                dragRect: box(0, 0),
                droppables: [],
            }),
        ).toBeUndefined();
    });
});

describe("closestCenter", () => {
    it("picks the droppable whose centre is nearest the dragged box's, wherever the pointer", () => {
        expect(
            closestCenter({
                pointer: { x: 0, y: 0 },
                dragRect: box(80, 80),
                droppables,
            }),
        ).toBe(inner);
        expect(
            closestCenter({
                pointer: { x: 0, y: 0 },
                dragRect: box(600, 600),
                droppables,
            }),
        ).toBe(right);
        expect(
            closestCenter({
                pointer: { x: 0, y: 0 },
                dragRect: box(0, 0),
                droppables: [],
            }),
        ).toBeUndefined();
    });
});

describe("rectIntersection", () => {
    it("picks the droppable the dragged box overlaps most, none when it overlaps none", () => {
        // all inside both outer and inner: inner is the closer fit
        expect(
            rectIntersection({
                pointer: { x: 0, y: 0 },
                dragRect: box(60, 60),
                droppables,
            }),
        ).toBe(inner);
        // across outer's edge and right's: more of it on right
        expect(
            rectIntersection({
                pointer: { x: 0, y: 0 },
                dragRect: box(390, 10),
                droppables,
            }),
        ).toBe(right);
        expect(
            rectIntersection({
                pointer: { x: 0, y: 0 },
                dragRect: box(320, 200),
                droppables,
            }),
        ).toBeUndefined();
    });
});
