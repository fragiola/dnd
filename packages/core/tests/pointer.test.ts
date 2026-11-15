// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { getDragSpace } from "../src";
import { registerDraggable } from "../src/draggable";
import { draggable, droppable, element, key, pointer } from "./harness";

const ZONE = { x: 100, y: 0, width: 100, height: 100 };
const dragging = () => getDragSpace(document).getOperation() !== undefined;

describe("the pointer sensor", () => {
    it("starts a mouse drag once the pointer moved 3 px, or the distance given", () => {
        const onDragStart = vi.fn();
        const { element: source, registration } = draggable({
            id: "c",
            onDragStart,
        });
        let press = pointer(source, 10, 10);
        press.move(12, 10);
        expect(onDragStart).not.toHaveBeenCalled();
        press.move(13, 10);
        expect(onDragStart).toHaveBeenCalledOnce();
        expect(source.hasPointerCapture(press.pointerId)).toBe(true);
        press.release(13, 10);
        expect(source.hasPointerCapture(press.pointerId)).toBe(false);

        registration.update({
            id: "c",
            onDragStart,
            activation: { distance: 20 },
        });
        press = pointer(source, 10, 10);
        press.move(25, 10);
        expect(onDragStart).toHaveBeenCalledOnce();
        press.move(30, 10);
        expect(onDragStart).toHaveBeenCalledTimes(2);
        press.release(30, 10);
    });

    it("starts a touch drag once held 200 ms, or lets the page scroll when it moves first", () => {
        vi.useFakeTimers();
        const onDragStart = vi.fn();
        const { element: source } = draggable({ id: "c", onDragStart });
        const touch = { pointerType: "touch" };
        let press = pointer(source, 10, 10, touch);
        press.move(14, 10); // within the 5 px tolerance
        vi.advanceTimersByTime(199);
        expect(onDragStart).not.toHaveBeenCalled();
        vi.advanceTimersByTime(1);
        expect(onDragStart).toHaveBeenCalledOnce();
        // a held touch drags, and never scrolls the page
        const scroll = new TouchEvent("touchmove", { cancelable: true });
        source.dispatchEvent(scroll);
        expect(scroll.defaultPrevented).toBe(true);
        press.release(14, 10);

        press = pointer(source, 10, 10, touch);
        press.move(10, 30); // a scroll
        vi.advanceTimersByTime(500);
        expect(onDragStart).toHaveBeenCalledOnce();
        const free = new TouchEvent("touchmove", { cancelable: true });
        source.dispatchEvent(free);
        expect(free.defaultPrevented).toBe(false);
    });

    it("takes the touch delay and tolerance given", () => {
        vi.useFakeTimers();
        const onDragStart = vi.fn();
        const { element: source } = draggable({
            id: "c",
            onDragStart,
            activation: { delay: 500, tolerance: 20 },
        });
        const press = pointer(source, 10, 10, { pointerType: "touch" });
        press.move(25, 10);
        vi.advanceTimersByTime(499);
        expect(onDragStart).not.toHaveBeenCalled();
        vi.advanceTimersByTime(1);
        expect(onDragStart).toHaveBeenCalledOnce();
        press.release(25, 10);
    });

    it("never starts a held touch whose draggable was disabled meanwhile", () => {
        vi.useFakeTimers();
        const onDragStart = vi.fn();
        const { element: source, registration } = draggable({
            id: "c",
            onDragStart,
        });
        pointer(source, 10, 10, { pointerType: "touch" });
        registration.update({ id: "c", onDragStart, disabled: true });
        vi.advanceTimersByTime(300);
        expect(onDragStart).not.toHaveBeenCalled();
    });

    it("never starts on a release before the activation, nor on a press another button made", () => {
        const onDragStart = vi.fn();
        const { element: source } = draggable({ id: "c", onDragStart });
        let press = pointer(source, 10, 10);
        press.release(10, 10);
        press.move(50, 50);
        press = pointer(source, 10, 10, { button: 2 });
        press.move(50, 50);
        expect(press.down.defaultPrevented).toBe(false);
        press = pointer(source, 10, 10, { isPrimary: false });
        press.move(50, 50);
        expect(onDragStart).not.toHaveBeenCalled();
    });

    it.each([
        ["Escape", () => key("Escape", document.body)],
        [
            "pointercancel",
            (press: ReturnType<typeof pointer>) => press.cancel(),
        ],
        [
            "a lost capture",
            (press: ReturnType<typeof pointer>, source: Element) =>
                press.loseCapture(source),
        ],
        [
            "a move with no button down",
            (press: ReturnType<typeof pointer>) => {
                document.dispatchEvent(
                    new PointerEvent("pointermove", {
                        pointerId: press.pointerId,
                        buttons: 0,
                    }),
                );
            },
        ],
    ])(
        "cancels on %s: onDragCancel, no onDrop, translate cleared",
        (_, end) => {
            const onDrop = vi.fn();
            droppable({ id: "z", onDrop }, ZONE);
            const onDragCancel = vi.fn();
            const onDragEnd = vi.fn();
            const { element: source } = draggable({
                id: "c",
                onDragCancel,
                onDragEnd,
            });
            const press = pointer(source, 10, 10);
            press.move(150, 50);
            expect(source.style.translate).toBe("140px 40px");
            end(press, source);
            expect(onDragCancel).toHaveBeenCalledOnce();
            expect(onDragCancel.mock.calls[0]?.[0].operation.phase).toBe(
                "idle",
            );
            expect(source.style.translate).toBe("");
            expect(dragging()).toBe(false);
            // the release after it is nothing
            press.release(150, 50);
            expect(onDrop).not.toHaveBeenCalled();
            expect(onDragEnd).not.toHaveBeenCalled();
            expect(source.hasPointerCapture(press.pointerId)).toBe(false);
        },
    );

    it("ignores a press another library already claimed (defaultPrevented)", () => {
        const onDragStart = vi.fn();
        const { element: source } = draggable({ id: "c", onDragStart });
        const inner = element({ x: 0, y: 0, width: 10, height: 10 }, source);
        inner.addEventListener("pointerdown", (event) =>
            event.preventDefault(),
        );
        const press = pointer(inner, 5, 5);
        press.move(50, 50);
        expect(onDragStart).not.toHaveBeenCalled();
    });

    it("claims its press on pointerdown, so an ancestor's gesture sees it defaultPrevented", () => {
        const ancestor = element({ x: 0, y: 0, width: 500, height: 500 });
        const seen: boolean[] = [];
        ancestor.addEventListener("pointerdown", (event) =>
            seen.push(event.defaultPrevented),
        );
        const { element: source } = draggable({ id: "c" }, undefined, ancestor);
        const press = pointer(source, 10, 10);
        press.move(50, 50);
        press.release(50, 50);
        // a press on the ancestor itself is not dnd's
        pointer(ancestor, 300, 300).release(300, 300);
        expect(seen).toEqual([true, false]);
    });

    it("lets a nested draggable take the press, not the one around it", () => {
        const outer = vi.fn();
        const inner = vi.fn();
        const { element: around } = draggable({
            id: "outer",
            onDragStart: outer,
        });
        const { element: within } = draggable(
            { id: "inner", onDragStart: inner },
            { x: 0, y: 0, width: 20, height: 20 },
            around,
        );
        const press = pointer(within, 5, 5);
        press.move(50, 50);
        press.release(50, 50);
        expect(inner).toHaveBeenCalledOnce();
        expect(outer).not.toHaveBeenCalled();
    });

    it.each([["input"], ["textarea"], ["select"], ["button"]])(
        "never starts from a native control (%s)",
        (tag) => {
            const onDragStart = vi.fn();
            const { element: source } = draggable({ id: "c", onDragStart });
            const control = element(
                { x: 0, y: 0, width: 10, height: 10 },
                source,
                tag,
            );
            const press = pointer(control, 5, 5);
            press.move(50, 50);
            expect(press.down.defaultPrevented).toBe(false);
            expect(onDragStart).not.toHaveBeenCalled();
        },
    );

    it("never starts from editable content or a data-dnd-no-drag subtree", () => {
        const onDragStart = vi.fn();
        const { element: source } = draggable({ id: "c", onDragStart });
        const editable = element({ x: 0, y: 0, width: 10, height: 10 }, source);
        editable.setAttribute("contenteditable", "true");
        const optOut = element({ x: 0, y: 0, width: 10, height: 10 }, source);
        optOut.setAttribute("data-dnd-no-drag", "");
        const deep = element({ x: 0, y: 0, width: 5, height: 5 }, optOut);
        for (const target of [editable, deep]) {
            const press = pointer(target, 5, 5);
            press.move(50, 50);
            press.release(50, 50);
        }
        const notEditable = element(
            { x: 0, y: 0, width: 10, height: 10 },
            source,
        );
        notEditable.setAttribute("contenteditable", "false");
        const press = pointer(notEditable, 5, 5);
        press.move(50, 50);
        press.release(50, 50);
        expect(onDragStart).toHaveBeenCalledOnce();
    });

    it("drags from its handle only, even a button handle, with touch-action none on it", () => {
        const onDragStart = vi.fn();
        const source = element({ x: 0, y: 0, width: 50, height: 50 });
        const handle = element(
            { x: 0, y: 0, width: 10, height: 10 },
            source,
            "button",
        );
        handle.style.touchAction = "pan-y";
        const registration = registerDraggable(source, {
            id: "c",
            handle,
            onDragStart,
        });
        expect(handle.style.touchAction).toBe("none");
        let press = pointer(source, 30, 30);
        press.move(60, 60);
        press.release(60, 60);
        expect(onDragStart).not.toHaveBeenCalled();
        press = pointer(handle, 5, 5);
        press.move(60, 60);
        press.release(60, 60);
        expect(onDragStart).toHaveBeenCalledOnce();
        // the handle goes: the element itself is the activator again
        registration.update({ id: "c", onDragStart });
        expect(handle.style.touchAction).toBe("pan-y");
        press = pointer(source, 30, 30);
        press.move(60, 60);
        press.release(60, 60);
        expect(onDragStart).toHaveBeenCalledTimes(2);
        registration.unregister();
    });

    it("swallows the click a drag's release makes, and only that one", () => {
        vi.useFakeTimers();
        const { element: source } = draggable({ id: "c" });
        const clicks = vi.fn();
        source.addEventListener("click", clicks);
        let press = pointer(source, 10, 10);
        press.move(50, 50);
        press.release(50, 50);
        source.click();
        expect(clicks).not.toHaveBeenCalled();
        // a press under the activation is a click
        press = pointer(source, 10, 10);
        press.release(10, 10);
        vi.runAllTimers();
        source.click();
        expect(clicks).toHaveBeenCalledOnce();
    });

    it("leaves no document listener once a press or drag ended", () => {
        const add = vi.spyOn(document, "addEventListener");
        const remove = vi.spyOn(document, "removeEventListener");
        const { element: source } = draggable({ id: "c" });
        let press = pointer(source, 10, 10);
        press.release(10, 10);
        press = pointer(source, 10, 10);
        press.move(50, 50);
        press.cancel();
        press = pointer(source, 10, 10);
        press.move(50, 50);
        press.release(50, 50);
        // the swallowed click removes its own listener on the click or a timer
        source.click();
        expect(remove.mock.calls.length).toBe(add.mock.calls.length);
    });
});
