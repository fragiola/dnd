// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDragSpace, subscribe } from "../src";
import type { DraggableOptions } from "../src/draggable";
import type { DroppableOptions } from "../src/droppable";
import { draggable, droppable, key, pointer } from "./harness";

// App code that throws never leaves the space stuck: every callback, listener and `accepts`
// predicate runs guarded. A throw during a drag cancels it cleanly (translate cleared, listeners
// removed, capture released, the space idle); the error is rethrown from a timer of the element's
// window, so the console and error trackers still see it; the next drag works.

const ZONE = { x: 100, y: 0, width: 100, height: 100 };
const boom = () => {
    throw new Error("boom");
};

beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
});
afterEach(() => {
    vi.useRealTimers();
});

const cases: [
    string,
    Partial<DraggableOptions>,
    Partial<DroppableOptions>,
    boolean,
][] = [
    // name, draggable options, droppable options, whether the throw happens before the release
    ["onDragStart", { onDragStart: boom }, {}, true],
    ["onDragMove", { onDragMove: boom }, {}, true],
    ["onDragEnd", { onDragEnd: boom }, {}, false],
    ["onDragEnter", {}, { onDragEnter: boom }, true],
    ["onDragOver", {}, { onDragOver: boom }, true],
    ["onDrop", {}, { onDrop: boom }, false],
];

describe("app code that throws", () => {
    it.each(cases)(
        "a throwing %s leaves the space idle, is reported, and the next drag works",
        (_name, source, target, during) => {
            const space = getDragSpace(document);
            const { element } = draggable({ id: "c", ...source });
            const onDrop = vi.fn();
            const zone = droppable({ id: "z", ...target }, ZONE);
            let press = pointer(element, 10, 10);
            press.move(20, 10);
            press.move(150, 50);
            press.move(160, 50);
            if (during) {
                expect(space.is("dragging")).toBe(false);
                expect(element.style.translate).toBe("");
                expect(element.hasPointerCapture(press.pointerId)).toBe(false);
            }
            press.release(160, 50);
            expect(space.is("dragging")).toBe(false);
            expect(element.style.translate).toBe("");
            expect(() => vi.runAllTimers()).toThrow("boom");

            // the next drag, without the throwing callbacks
            draggable({ id: "d" });
            zone.registration.update({ id: "z", onDrop });
            const next = draggable(
                { id: "e" },
                { x: 0, y: 200, width: 50, height: 50 },
            );
            press = pointer(next.element, 10, 210);
            press.move(20, 210);
            press.move(150, 50);
            press.release(150, 50);
            expect(onDrop).toHaveBeenCalledOnce();
            expect(space.is("dragging")).toBe(false);
        },
    );

    it("a throwing onDragLeave and onDragCancel still end the drag", () => {
        const space = getDragSpace(document);
        const { element } = draggable({ id: "c", onDragCancel: boom });
        droppable({ id: "z", onDragLeave: boom }, ZONE);
        const press = pointer(element, 10, 10);
        press.move(150, 50);
        press.move(400, 50);
        expect(space.is("dragging")).toBe(false);
        expect(() => vi.runAllTimers()).toThrow("boom");
        expect(element.style.translate).toBe("");
        press.release(400, 50);
    });

    it("a throwing subscribe listener cancels the drag; the other listeners still hear it", () => {
        const space = getDragSpace(document);
        const heard = vi.fn();
        const offBoom = subscribe(
            (event) => {
                if (event.type === "drag-move") boom();
            },
            { document },
        );
        const off = subscribe(heard, { document });
        const { element } = draggable({ id: "c" });
        const press = pointer(element, 10, 10);
        press.move(30, 10);
        expect(space.is("dragging")).toBe(false);
        expect(heard.mock.calls.map(([event]) => event.type)).toEqual([
            "drag-start",
            "drag-move",
            "drag-cancel",
        ]);
        expect(() => vi.runAllTimers()).toThrow("boom");
        press.release(30, 10);
        offBoom();
        off();
    });

    it("a throwing accepts predicate refuses, and the drag goes on", () => {
        const space = getDragSpace(document);
        const onDrop = vi.fn();
        const { element } = draggable({ id: "c" });
        const zone = droppable(
            { id: "z", accepts: () => boom(), onDrop },
            ZONE,
        );
        const press = pointer(element, 10, 10);
        press.move(150, 50);
        expect(space.is("dragging")).toBe(true);
        expect(zone.registration.getState().refused).toBe(true);
        press.release(150, 50);
        expect(onDrop).not.toHaveBeenCalled();
        expect(space.can("drop", { draggableId: "c", droppableId: "z" })).toBe(
            false,
        );
        expect(() => vi.runAllTimers()).toThrow("boom");
    });

    it("a throwing onDragStart on the keyboard never grabs", () => {
        const space = getDragSpace(document);
        const { element } = draggable({ id: "c", onDragStart: boom });
        element.focus();
        const grab = key(" ");
        expect(space.is("dragging")).toBe(false);
        expect(grab.defaultPrevented).toBe(false);
        expect(() => vi.runAllTimers()).toThrow("boom");
    });
});
