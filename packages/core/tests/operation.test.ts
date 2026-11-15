// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import {
    closestCenter,
    getDragSpace,
    grabOffset,
    overlayStyle,
    subscribe,
} from "../src";
import { draggable, droppable, flush, pendingFrames, pointer } from "./harness";

const LEFT = { x: 100, y: 0, width: 100, height: 100 };
const RIGHT = { x: 300, y: 0, width: 100, height: 100 };

describe("the drag lifecycle", () => {
    it("runs start, enter, over, leave, drop and end in order", () => {
        const log: string[] = [];
        const zone = (id: string) => ({
            id,
            onDragEnter: () => log.push(`${id}:enter`),
            onDragOver: () => log.push(`${id}:over`),
            onDragLeave: () => log.push(`${id}:leave`),
            onDrop: () => log.push(`${id}:drop`),
        });
        droppable(zone("left"), LEFT);
        droppable(zone("right"), RIGHT);
        const { element } = draggable({
            id: "card",
            onDragStart: () => log.push("start"),
            onDragMove: () => log.push("move"),
            onDragEnd: (event) => log.push(`end:${event.operation.target?.id}`),
            onDragCancel: () => log.push("cancel"),
        });
        const press = pointer(element, 10, 10);
        press.move(150, 50);
        press.move(160, 50);
        press.move(350, 50);
        press.release(350, 50);
        expect(log).toEqual([
            "start",
            "left:enter",
            "move",
            "left:over",
            "move",
            "left:leave",
            "right:enter",
            "move",
            "right:drop",
            "end:right",
        ]);
    });

    it("exposes the operation while it runs, and none after", () => {
        const { element } = draggable({ id: "card" });
        const space = getDragSpace(document);
        const press = pointer(element, 10, 10);
        expect(space.get("operation")).toBeUndefined();
        press.move(20, 10);
        expect(space.get("operation")?.phase).toBe("dragging");
        expect(space.get("operation")?.delta).toEqual({ x: 10, y: 0 });
        press.release(20, 10);
        expect(space.get("operation")).toBeUndefined();
    });

    it("keeps one operation per space: a second press while dragging does nothing", () => {
        const first = draggable({ id: "a" });
        const onDragStart = vi.fn();
        const second = draggable(
            { id: "b", onDragStart },
            { x: 0, y: 100, width: 50, height: 50 },
        );
        const press = pointer(first.element, 10, 10);
        press.move(30, 30);
        const other = pointer(second.element, 10, 110);
        other.move(40, 140);
        expect(other.down.defaultPrevented).toBe(false);
        expect(onDragStart).not.toHaveBeenCalled();
        press.release(30, 30);
    });

    it("drops only on a droppable that accepts the source, by type list or predicate", () => {
        const byType = vi.fn();
        const byPredicate = vi.fn();
        droppable({ id: "types", accepts: ["photo"], onDrop: byType }, LEFT);
        droppable(
            {
                id: "predicate",
                accepts: (source) => source.id === "card",
                onDrop: byPredicate,
            },
            RIGHT,
        );
        const onDragEnd = vi.fn();
        const { element } = draggable({ id: "card", type: "note", onDragEnd });
        let press = pointer(element, 10, 10);
        press.move(150, 50);
        press.release(150, 50);
        expect(byType).not.toHaveBeenCalled();
        expect(onDragEnd.mock.calls[0]?.[0].operation.target).toBeUndefined();
        press = pointer(element, 10, 10);
        press.move(350, 50);
        press.release(350, 50);
        expect(byPredicate).toHaveBeenCalledOnce();
    });

    it("marks droppables active, over and refused, and puts them back after", () => {
        const accepting = droppable({ id: "a", accepts: ["card"] }, LEFT);
        const refusing = droppable({ id: "r", accepts: ["photo"] }, RIGHT);
        const { element, registration } = draggable({ id: "c", type: "card" });
        const press = pointer(element, 10, 10);
        press.move(150, 50);
        expect(registration.getState()).toEqual({
            dragging: true,
            disabled: false,
        });
        expect(accepting.registration.getState()).toEqual({
            over: true,
            active: true,
            refused: false,
            disabled: false,
        });
        expect(refusing.registration.getState()).toMatchObject({
            active: false,
            over: false,
        });
        press.move(350, 50);
        expect(accepting.registration.getState().over).toBe(false);
        expect(refusing.registration.getState()).toMatchObject({
            over: false,
            refused: true,
        });
        press.release(350, 50);
        expect(refusing.registration.getState()).toEqual({
            over: false,
            active: false,
            refused: false,
            disabled: false,
        });
        expect(registration.getState().dragging).toBe(false);
    });

    it("lets an accepting droppable take the drag over a refusing one nested in it", () => {
        const onDrop = vi.fn();
        const column = droppable(
            { id: "column", onDrop },
            { x: 0, y: 200, width: 300, height: 300 },
        );
        const card = droppable(
            { id: "card", accepts: ["card"] },
            { x: 50, y: 250, width: 100, height: 100 },
        );
        const { element } = draggable({ id: "col", type: "column" });
        const press = pointer(element, 10, 10);
        press.move(100, 300);
        expect(column.registration.getState().over).toBe(true);
        expect(card.registration.getState().refused).toBe(false);
        press.release(100, 300);
        expect(onDrop).toHaveBeenCalledOnce();
    });

    it("measures again on the first frame, after the app rendered the drag start", () => {
        const zone = droppable(
            { id: "z" },
            { x: 500, y: 0, width: 100, height: 100 },
        );
        const { element } = draggable({
            id: "c",
            // the app's render of the start moves the zone (a placeholder above it)
            onDragStart: () => {
                zone.element.box.x = 100;
            },
        });
        const press = pointer(element, 10, 10);
        press.move(150, 50);
        expect(zone.registration.getState().over).toBe(true);
        press.release(150, 50);
    });

    it("keeps a state snapshot's identity until a field changes, and tells subscribers", () => {
        const zone = droppable({ id: "a" }, LEFT);
        const { element } = draggable({ id: "c" });
        const listener = vi.fn();
        zone.registration.subscribe(listener);
        const rest = zone.registration.getState();
        const press = pointer(element, 10, 10);
        press.move(150, 50);
        const over = zone.registration.getState();
        expect(over).not.toBe(rest);
        const calls = listener.mock.calls.length;
        press.move(160, 60);
        press.move(170, 70);
        expect(zone.registration.getState()).toBe(over);
        expect(listener).toHaveBeenCalledTimes(calls);
        press.release(170, 70);
    });

    it("never targets a disabled droppable, nor drags a disabled draggable", () => {
        const onDrop = vi.fn();
        const zone = droppable({ id: "a", disabled: true, onDrop }, LEFT);
        expect(zone.registration.getState().disabled).toBe(true);
        const { element, registration } = draggable({ id: "c" });
        let press = pointer(element, 10, 10);
        press.move(150, 50);
        press.release(150, 50);
        expect(onDrop).not.toHaveBeenCalled();

        registration.update({ id: "c", disabled: true });
        expect(registration.getState().disabled).toBe(true);
        press = pointer(element, 10, 10);
        press.move(150, 50);
        expect(registration.getState().dragging).toBe(false);
    });

    it("cancels its drag when the draggable is disabled or unregistered mid-drag", () => {
        const onDragCancel = vi.fn();
        const { element, registration } = draggable({ id: "c", onDragCancel });
        let press = pointer(element, 10, 10);
        press.move(50, 50);
        registration.update({ id: "c", onDragCancel, disabled: true });
        expect(onDragCancel).toHaveBeenCalledOnce();
        expect(element.style.translate).toBe("");

        registration.update({ id: "c", onDragCancel });
        press = pointer(element, 10, 10);
        press.move(50, 50);
        registration.unregister();
        expect(onDragCancel).toHaveBeenCalledTimes(2);
        expect(getDragSpace(document).get("operation")).toBeUndefined();
    });

    it("meets a droppable registered during the drag, and forgets one removed", () => {
        const { element } = draggable({ id: "c" });
        const press = pointer(element, 10, 10);
        press.move(150, 50);
        const onDrop = vi.fn();
        const late = droppable({ id: "late", onDrop }, LEFT);
        flush();
        expect(late.registration.getState()).toMatchObject({
            over: true,
            active: true,
        });
        expect(getDragSpace(document).get("operation")?.target?.id).toBe(
            "late",
        );
        late.registration.unregister();
        flush();
        expect(getDragSpace(document).get("operation")?.target).toBeUndefined();
        press.release(150, 50);
        expect(onDrop).not.toHaveBeenCalled();
    });

    it("measures again after a scroll, never on a plain move", () => {
        const zone = droppable({ id: "a" }, LEFT);
        const measure = vi.spyOn(zone.element, "getBoundingClientRect");
        const { element } = draggable({ id: "c" });
        const press = pointer(element, 10, 10);
        press.move(150, 50);
        const measured = measure.mock.calls.length;
        press.move(160, 50);
        press.move(170, 50);
        expect(measure.mock.calls.length).toBe(measured);
        // the zone scrolls up under the pointer: the drag leaves it
        zone.element.box.y = -200;
        document.dispatchEvent(new Event("scroll"));
        expect(pendingFrames()).toBe(1);
        flush();
        expect(measure.mock.calls.length).toBe(measured + 1);
        expect(getDragSpace(document).get("operation")?.target).toBeUndefined();
        press.release(170, 50);
    });

    it("keeps the source under the pointer when its container scrolls", () => {
        const { element } = draggable({ id: "c" });
        const press = pointer(element, 10, 10);
        press.move(30, 10);
        expect(element.style.translate).toBe("20px");
        // scrolled 100px down: the element is 100px higher, the pointer is where it was
        element.box.y = -100;
        window.dispatchEvent(new Event("resize"));
        flush();
        expect(element.style.translate).toBe("20px 100px");
        press.release(30, 10);
    });

    it("uses the draggable's collision strategy", () => {
        const onDrop = vi.fn();
        droppable({ id: "near", onDrop }, LEFT);
        droppable({ id: "far" }, RIGHT);
        const { element } = draggable({ id: "c", collision: closestCenter });
        const press = pointer(element, 10, 10);
        // nowhere near a droppable's box, nearest the left one
        press.move(20, 400);
        press.release(20, 400);
        expect(onDrop).toHaveBeenCalledOnce();
    });

    it("reports drag-over to the page when the target changes, none included", () => {
        droppable({ id: "a" }, LEFT);
        const targets: unknown[] = [];
        const off = subscribe(
            (event) => {
                if (event.type === "drag-over")
                    targets.push(event.operation.target?.id);
            },
            { document },
        );
        const { element } = draggable({ id: "c" });
        const press = pointer(element, 10, 10);
        press.move(150, 50);
        press.move(160, 50);
        press.move(20, 400);
        press.release(20, 400);
        off();
        expect(targets).toEqual(["a", undefined]);
    });

    it("starts with the droppable it starts over as its target, and no drag-over repeats it", () => {
        const log: string[] = [];
        droppable(
            {
                id: "a",
                onDragEnter: (event) =>
                    log.push(`a:enter:${event.operation.target?.id}`),
                onDragLeave: () => log.push("a:leave"),
            },
            LEFT,
        );
        droppable({ id: "b" }, RIGHT);
        const off = subscribe(
            (event) => {
                if (event.type !== "drag-move")
                    log.push(`${event.type}:${event.operation.target?.id}`);
            },
            { document },
        );
        // the draggable sits inside a
        const { element } = draggable(
            { id: "c" },
            { x: 110, y: 10, width: 30, height: 30 },
        );
        const press = pointer(element, 120, 20);
        press.move(130, 20);
        press.move(140, 20);
        press.move(350, 50);
        press.release(350, 50);
        off();
        expect(log).toEqual([
            "drag-start:a",
            "a:enter:a",
            "a:leave",
            "drag-over:b",
            "drop:b",
        ]);
    });

    it("gives an overlay the dragged box and the grab offset", () => {
        const { element } = draggable(
            { id: "c" },
            { x: 10, y: 20, width: 40, height: 30 },
        );
        const press = pointer(element, 15, 30);
        press.move(115, 80);
        const operation = getDragSpace(document).get("operation");
        if (!operation) throw new Error("no operation");
        expect(grabOffset(operation)).toEqual({ x: 5, y: 10 });
        expect(overlayStyle(operation)).toEqual({
            position: "fixed",
            left: 110,
            top: 70,
            width: 40,
            height: 30,
            boxSizing: "border-box",
            pointerEvents: "none",
        });
        press.release(115, 80);
    });
});
