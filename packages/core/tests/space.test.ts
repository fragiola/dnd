// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { createDragSpace, getDragSpace, subscribe } from "../src";
import { entriesOf } from "../src/core/space";
import type { DragSpaceEvent } from "../src/core/types";
import { registerDraggable } from "../src/draggable";
import { registerDroppable } from "../src/droppable";
import { draggable, droppable, element, pointer } from "./harness";

const BOX = { x: 100, y: 0, width: 100, height: 100 };

/** Drags the harness draggable (at 0,0) onto (150, 50) and releases it there. */
function dragOnto(source: HTMLElement) {
    const press = pointer(source, 10, 10);
    press.move(150, 50);
    press.release(150, 50);
}

describe("the drag space", () => {
    it("is created once per document, on first use", () => {
        const other = document.implementation.createHTMLDocument();
        expect(getDragSpace(document)).toBe(getDragSpace(document));
        expect(getDragSpace(other)).not.toBe(getDragSpace(document));
        expect(getDragSpace(document).document).toBe(document);
        expect(getDragSpace(document).getOperation()).toBeUndefined();
    });

    it("lets a draggable and a droppable of one document meet with no other setup", () => {
        const onDrop = vi.fn();
        droppable({ id: "zone", onDrop }, BOX);
        const { element: source } = draggable({ id: "card" });
        dragOnto(source);
        expect(onDrop).toHaveBeenCalledOnce();
        expect(onDrop.mock.calls[0]?.[0].operation.target.id).toBe("zone");
    });

    it("never lets different scopes meet", () => {
        const onDrop = vi.fn();
        droppable({ id: "zone", scope: "b", onDrop }, BOX);
        const onDragEnd = vi.fn();
        const { element: source } = draggable({
            id: "card",
            scope: "a",
            onDragEnd,
        });
        dragOnto(source);
        expect(onDrop).not.toHaveBeenCalled();
        expect(onDragEnd.mock.calls[0]?.[0].operation.target).toBeUndefined();
        expect(onDragEnd.mock.calls[0]?.[0].operation.scope).toBe("a");
    });

    it("never lets different explicit spaces, or an explicit and the document's, meet", () => {
        const one = createDragSpace({ document });
        const two = createDragSpace({ document });
        const onDrop = vi.fn();
        droppable({ id: "two", space: two, onDrop }, BOX);
        droppable({ id: "page", onDrop }, BOX);
        const { element: source } = draggable({ id: "card", space: one });
        dragOnto(source);
        expect(onDrop).not.toHaveBeenCalled();

        const onOwnDrop = vi.fn();
        droppable({ id: "one", space: one, onDrop: onOwnDrop }, BOX);
        dragOnto(source);
        expect(onOwnDrop).toHaveBeenCalledOnce();
        expect(onDrop).not.toHaveBeenCalled();
    });

    it("is empty once everything unregistered, and a second unregister does nothing", () => {
        const space = createDragSpace({ document });
        const a = registerDraggable(element(BOX), { id: "a", space });
        const b = registerDroppable(element(BOX), { id: "b", space });
        const c = registerDraggable(element(BOX), { id: "c" });
        expect(entriesOf(space)).toHaveLength(2);
        expect(entriesOf(getDragSpace(document))).toHaveLength(1);
        a.unregister();
        b.unregister();
        c.unregister();
        expect(entriesOf(space)).toEqual([]);
        expect(entriesOf(getDragSpace(document))).toEqual([]);
        expect(() => {
            a.unregister();
            b.unregister();
        }).not.toThrow();
        expect(entriesOf(space)).toEqual([]);
    });

    it("keeps no listener after unregister: a press does nothing", () => {
        const onDragStart = vi.fn();
        const el = element({ x: 0, y: 0, width: 50, height: 50 });
        const registration = registerDraggable(el, { id: "a", onDragStart });
        registration.unregister();
        const press = pointer(el, 10, 10);
        press.move(100, 100);
        expect(press.down.defaultPrevented).toBe(false);
        expect(onDragStart).not.toHaveBeenCalled();
        expect(getDragSpace(document).getOperation()).toBeUndefined();
    });

    it("works after a StrictMode double register (register, unregister, register)", () => {
        const onDrop = vi.fn();
        const zone = element(BOX);
        registerDroppable(zone, { id: "zone" }).unregister();
        droppable({ id: "zone", onDrop }, BOX);
        const el = element({ x: 0, y: 0, width: 50, height: 50 });
        registerDraggable(el, { id: "card" }).unregister();
        const onDragStart = vi.fn();
        const registration = registerDraggable(el, { id: "card", onDragStart });
        dragOnto(el);
        registration.unregister();
        expect(onDragStart).toHaveBeenCalledOnce();
        expect(onDrop).toHaveBeenCalledOnce();
    });

    it("meets the droppables of the document an element was moved to (a popout)", () => {
        const popout = document.implementation.createHTMLDocument();
        const onDrop = vi.fn();
        droppable({ id: "there", onDrop }, BOX, popout.body);
        const { element: source } = draggable({ id: "card" });
        popout.body.append(popout.adoptNode(source));
        dragOnto(source);
        expect(onDrop).toHaveBeenCalledOnce();
    });

    it("reports every drag to subscribe, by document or space, filtered by scope", () => {
        const all: string[] = [];
        const scoped: string[] = [];
        const isolated: string[] = [];
        const space = createDragSpace({ document });
        const off = [
            subscribe((event) => all.push(event.type), { document }),
            subscribe((event) => scoped.push(event.type), {
                document,
                scope: "other",
            }),
            subscribe((event) => isolated.push(event.type), { space }),
        ];
        droppable({ id: "zone" }, BOX);
        const { element: source } = draggable({ id: "card" });
        dragOnto(source);
        expect(all).toEqual(["drag-start", "drag-over", "drag-move", "drop"]);
        expect(scoped).toEqual([]);
        expect(isolated).toEqual([]);
        for (const unsubscribe of off) unsubscribe();
        dragOnto(source);
        expect(all).toHaveLength(4);
    });

    it("carries the operation and the input in every event", () => {
        const events: DragSpaceEvent[] = [];
        const off = subscribe((event) => events.push(event), { document });
        droppable({ id: "zone", data: { kind: "zone" } }, BOX);
        const { element: source } = draggable({
            id: "card",
            type: "card",
            data: { n: 1 },
        });
        dragOnto(source);
        off();
        const drop = events.at(-1);
        expect(drop?.input).toBe("pointer");
        expect(drop?.operation).toMatchObject({
            phase: "dropping",
            scope: "default",
            source: { id: "card", type: "card", data: { n: 1 } },
            target: { id: "zone", data: { kind: "zone" } },
            pointer: { x: 150, y: 50 },
            delta: { x: 140, y: 40 },
            input: "pointer",
            rects: {
                source: { x: 0, y: 0, width: 50, height: 50 },
                drag: { x: 140, y: 40, width: 50, height: 50 },
                target: BOX,
            },
        });
    });
});
