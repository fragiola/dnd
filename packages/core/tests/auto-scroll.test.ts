// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { autoScroll } from "../src";
import { draggable, element, flush, pendingFrames, pointer } from "./harness";

/** A scroll container at 0,0 200×200 with `size.height` px of content (1000), scrolled to `top`. */
function container() {
    const box = element({ x: 0, y: 0, width: 200, height: 200 });
    box.style.overflowY = "auto";
    let top = 0;
    const size = { height: 1000 };
    Object.defineProperty(box, "scrollTop", {
        get: () => top,
        set: (value: number) => {
            top = Math.max(0, Math.min(size.height - 200, value));
        },
    });
    Object.defineProperty(box, "clientHeight", { get: () => 200 });
    Object.defineProperty(box, "scrollHeight", { get: () => size.height });
    return Object.assign(box, { size });
}

describe("autoScroll", () => {
    it("scrolls the nearest scroll container near its edge, a frame at a time, until the end", () => {
        const scroller = container();
        const { element: source } = draggable(
            { id: "c", autoScroll: autoScroll() },
            { x: 0, y: 0, width: 50, height: 50 },
            scroller,
        );
        const press = pointer(source, 10, 10);
        // the middle: no scroll
        press.move(100, 100);
        flush();
        expect(scroller.scrollTop).toBe(0);
        // at the bottom edge: full speed (15 px a frame)
        press.move(100, 199);
        flush();
        expect(scroller.scrollTop).toBe(15);
        flush();
        expect(scroller.scrollTop).toBe(30);
        // half-way into the zone: about half the speed
        press.move(100, 180);
        const before = scroller.scrollTop;
        flush();
        expect(scroller.scrollTop - before).toBe(8);
        // at the end it stops asking for frames
        scroller.scrollTop = 800;
        flush();
        flush();
        expect(pendingFrames()).toBe(0);
        press.move(100, 20);
        flush();
        expect(scroller.scrollTop).toBeLessThan(800);
        press.release(100, 20);
        expect(pendingFrames()).toBe(0);
    });

    it("takes the zone depth and speed given, and does nothing without it", () => {
        const scroller = container();
        const { element: source, registration } = draggable(
            { id: "c", autoScroll: autoScroll({ threshold: 10, speed: 5 }) },
            { x: 0, y: 0, width: 50, height: 50 },
            scroller,
        );
        let press = pointer(source, 10, 10);
        press.move(100, 185);
        flush();
        expect(scroller.scrollTop).toBe(0);
        press.move(100, 199);
        flush();
        expect(scroller.scrollTop).toBe(5);
        press.release(100, 199);

        registration.update({ id: "c" });
        press = pointer(source, 10, 10);
        press.move(100, 199);
        flush();
        expect(scroller.scrollTop).toBe(5);
        press.release(100, 199);
    });

    it("never scrolls past the range measured at the start: the dragged element's translate never grows it", () => {
        const scroller = container();
        const { element: source } = draggable(
            { id: "c", autoScroll: autoScroll({ speed: 100 }) },
            { x: 0, y: 0, width: 50, height: 50 },
            scroller,
        );
        const press = pointer(source, 10, 10);
        press.move(100, 199);
        // the translated element now reaches past the content: the browser's range grows
        scroller.size.height = 5000;
        for (let i = 0; i < 20; i++) flush();
        expect(scroller.scrollTop).toBe(800);
        expect(pendingFrames()).toBe(0);
        press.release(100, 199);
    });
});
