// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import {
    connectHandle,
    connectPart,
    connectSource,
    type Register,
} from "../../src/core/connect";
import { createSlot } from "../../src/core/slot";
import type { DraggableState } from "../../src/core/types";
import { type DraggableOptions, registerDraggable } from "../../src/draggable";
import { registerDroppable } from "../../src/droppable";
import { element, pointer } from "../harness";

const REST: DraggableState = { dragging: false, disabled: false };

/** `registerDraggable`, recording the handle of each options it is given. */
function recording() {
    const handles: (HTMLElement | null | undefined)[] = [];
    const register: Register<DraggableOptions, DraggableState> = (
        target,
        options,
    ) => {
        handles.push(options.handle);
        const registration = registerDraggable(target, options);
        return {
            ...registration,
            update(next) {
                handles.push(next.handle);
                registration.update(next);
            },
        };
    };
    return { register, handles };
}

const BOX = { x: 0, y: 0, width: 100, height: 100 };

/** An element marked as a drag source (its adapter renders the part attribute). */
function sourceElement(parent?: Element) {
    const el = element(BOX, parent);
    el.setAttribute("data-dnd-part", "draggable");
    return el;
}

/** An element marked as a handle, inside `parent`. */
function handleElement(parent: Element) {
    const el = element({ x: 10, y: 10, width: 20, height: 20 }, parent);
    el.setAttribute("data-dnd-part", "handle");
    return el;
}

describe("connectPart", () => {
    it("registers the element, follows its state in the slot, updates and disconnects", () => {
        const el = element(BOX);
        const slot = createSlot(() => ({
            over: false,
            active: false,
            refused: false,
            disabled: false,
        }));
        let disabled = false;
        const connection = connectPart(
            el,
            registerDroppable,
            () => ({ id: "zone", disabled }),
            slot,
        );
        expect(slot.getState().disabled).toBe(false);
        disabled = true;
        connection.update();
        expect(slot.getState().disabled).toBe(true);
        const listener = vi.fn();
        slot.subscribe(listener);
        connection.disconnect();
        expect(listener).toHaveBeenCalled();
        // back to the fallback: the registration is gone
        expect(slot.getState().disabled).toBe(false);
    });
});

describe("connectSource and connectHandle: the handle link", () => {
    it("adopts the handle already inside the source when the source attaches last", () => {
        const source = sourceElement();
        const handle = handleElement(source);
        const handleSlot = createSlot(() => REST);
        const link = connectHandle(handle, handleSlot);
        expect(link.linked).toBe(false);
        const { register, handles } = recording();
        const connection = connectSource(
            source,
            register,
            () => ({ id: "card" }),
            createSlot(() => REST),
        );
        expect(handles[0]).toBe(handle);
        expect(link.linked).toBe(true);
        connection.disconnect();
        link.disconnect();
    });

    it("links a handle attached after its source, and gives the source its element back when it goes", () => {
        const source = sourceElement();
        const { register, handles } = recording();
        const connection = connectSource(
            source,
            register,
            () => ({ id: "card" }),
            createSlot(() => REST),
        );
        expect(handles).toEqual([null]);
        const handle = handleElement(source);
        const link = connectHandle(
            handle,
            createSlot(() => REST),
        );
        expect(link.linked).toBe(true);
        expect(handles.at(-1)).toBe(handle);
        link.disconnect();
        expect(link.linked).toBe(false);
        expect(handles.at(-1)).toBeNull();
        connection.disconnect();
    });

    it("keeps the handle on an option update, and unlinks its handles when the source goes", () => {
        const source = sourceElement();
        const handle = handleElement(source);
        const { register, handles } = recording();
        let disabled = false;
        const connection = connectSource(
            source,
            register,
            () => ({ id: "card", disabled }),
            createSlot(() => REST),
        );
        const link = connectHandle(
            handle,
            createSlot(() => REST),
        );
        disabled = true;
        connection.update();
        expect(handles.at(-1)).toBe(handle);
        connection.disconnect();
        expect(link.linked).toBe(false);
        link.disconnect();
    });

    it("links a handle to the closest source around it, never to an outer one", () => {
        const outer = sourceElement();
        const inner = sourceElement(outer);
        const handle = handleElement(inner);
        const outerRecord = recording();
        const innerRecord = recording();
        const a = connectSource(
            outer,
            outerRecord.register,
            () => ({ id: "outer" }),
            createSlot(() => REST),
        );
        const b = connectSource(
            inner,
            innerRecord.register,
            () => ({ id: "inner" }),
            createSlot(() => REST),
        );
        const link = connectHandle(
            handle,
            createSlot(() => REST),
        );
        expect(outerRecord.handles).toEqual([null]);
        expect(innerRecord.handles.at(-1)).toBe(handle);
        link.disconnect();
        b.disconnect();
        a.disconnect();
    });

    it("leaves a handle outside any source unlinked", () => {
        const handle = handleElement(element(BOX));
        const slot = createSlot(() => REST);
        const link = connectHandle(handle, slot);
        expect(link.linked).toBe(false);
        expect(slot.getState()).toBe(slot.getState());
        expect(slot.getState()).toEqual(REST);
        link.disconnect();
    });

    it("shows the source's state in the handle's slot, and drags from the handle only", () => {
        const source = sourceElement();
        source.tabIndex = 0;
        const handle = handleElement(source);
        const onDragStart = vi.fn();
        const sourceSlot = createSlot(() => REST);
        const connection = connectSource(
            source,
            registerDraggable,
            () => ({ id: "card", onDragStart }),
            sourceSlot,
        );
        const handleSlot = createSlot(() => REST);
        const link = connectHandle(handle, handleSlot);
        // a press on the source outside its handle starts nothing
        const outside = pointer(source, 80, 80);
        outside.move(120, 120);
        outside.release(120, 120);
        expect(onDragStart).not.toHaveBeenCalled();
        const press = pointer(handle, 15, 15);
        press.move(60, 60);
        expect(onDragStart).toHaveBeenCalledTimes(1);
        expect(sourceSlot.getState().dragging).toBe(true);
        expect(handleSlot.getState().dragging).toBe(true);
        press.release(60, 60);
        expect(handleSlot.getState().dragging).toBe(false);
        link.disconnect();
        connection.disconnect();
    });
});
