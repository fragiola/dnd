// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { draggable, droppable, flush, pendingFrames, pointer } from "./harness";

/** Counts the writes of `translate` (and of `transform`) on `element`'s inline style. */
function spyStyle(element: HTMLElement) {
    const writes = { translate: 0, transform: 0 };
    const style = element.style;
    for (const name of ["translate", "transform"] as const) {
        const own = Object.getOwnPropertyDescriptor(
            Object.getPrototypeOf(style),
            name,
        );
        Object.defineProperty(style, name, {
            configurable: true,
            get: () => own?.get?.call(style),
            set: (value: string) => {
                writes[name]++;
                own?.set?.call(style, value);
            },
        });
    }
    const setProperty = style.setProperty.bind(style);
    style.setProperty = (name: string, ...rest: [string, string?]) => {
        if (name === "transform") writes.transform++;
        setProperty(name, ...rest);
    };
    return writes;
}

describe("the translate writer", () => {
    it("writes at most once per animation frame, however many moves it got", () => {
        const { element } = draggable({ id: "c" });
        const writes = spyStyle(element);
        const press = pointer(element, 10, 10);
        for (let x = 20; x < 120; x += 10) press.moveOnly(x, 10);
        expect(writes.translate).toBe(0);
        expect(pendingFrames()).toBe(1);
        flush();
        expect(writes.translate).toBe(1);
        expect(element.style.translate).toBe("100px");
        // a frame with nothing new writes nothing
        press.moveOnly(110, 10);
        press.moveOnly(110.5, 10);
        press.moveOnly(110, 10);
        flush();
        expect(writes.translate).toBe(1);
        press.release(110, 10);
        expect(element.style.translate).toBe("");
    });

    it("never writes transform, and leaves a host's transform alone", () => {
        const { element } = draggable({ id: "c" });
        element.style.transform = "scale(2)";
        const writes = spyStyle(element);
        const press = pointer(element, 10, 10);
        press.move(60, 30);
        expect(element.style.transform).toBe("scale(2)");
        press.release(60, 30);
        expect(writes.transform).toBe(0);
        expect(element.style.transform).toBe("scale(2)");
        expect(element.getAttribute("style")).not.toContain("translate");
    });

    it("puts the element's own inline translate back after the drag", () => {
        const { element } = draggable({ id: "c" });
        element.style.translate = "5px 5px";
        const press = pointer(element, 10, 10);
        press.move(60, 10);
        press.release(60, 10);
        expect(element.style.translate).toBe("5px 5px");
    });

    it("clears translate only after onDrop and onDragEnd ran", () => {
        const seen: string[] = [];
        droppable(
            {
                id: "z",
                onDrop: (event) =>
                    seen.push(
                        `drop ${event.operation.phase} ${source.style.translate}`,
                    ),
            },
            { x: 100, y: 0, width: 100, height: 100 },
        );
        const { element: source } = draggable({
            id: "c",
            onDragEnd: () => seen.push(`end ${source.style.translate}`),
        });
        const press = pointer(source, 10, 10);
        press.moveOnly(150, 50);
        // released before the frame ran: the release's position still counts
        press.release(160, 60);
        expect(seen).toEqual(["drop dropping 150px 50px", "end 150px 50px"]);
        expect(source.style.translate).toBe("");
        expect(pendingFrames()).toBe(0);
    });

    it("writes nothing with translate false (a drag overlay shows the source)", () => {
        const onDragMove = vi.fn();
        const { element } = draggable({
            id: "c",
            translate: false,
            onDragMove,
        });
        const writes = spyStyle(element);
        const press = pointer(element, 10, 10);
        press.move(60, 10);
        press.release(60, 10);
        expect(onDragMove).toHaveBeenCalled();
        expect(writes.translate).toBe(0);
    });
});
