import { describe, expect, it, vi } from "vitest";
import { followOverlay } from "../../src/core/follow-overlay";
import type { DragSpace } from "../../src/core/space";
import type {
    DragListener,
    DragOperation,
    DragSpaceEvent,
} from "../../src/core/types";

/** An operation of `scope` whose dragged box is at (`x`, `y`). */
function operation(x: number, y: number, scope = "default"): DragOperation {
    const box = { x, y, width: 40, height: 20 };
    return {
        source: { id: "card" },
        pointer: { x, y },
        delta: { x: 0, y: 0 },
        rects: { source: box, drag: box },
        input: "pointer",
        scope,
    } as unknown as DragOperation;
}

/** A space stand-in: the running operation, and the listeners `subscribe` adds. */
function space(running?: DragOperation) {
    const listeners: { listener: DragListener; scope?: string }[] = [];
    const fake = {
        get: (key: string) => (key === "operation" ? running : undefined),
        subscribe(listener: DragListener, options?: { scope?: string }) {
            const record = { listener, scope: options?.scope };
            listeners.push(record);
            return () => {
                listeners.splice(listeners.indexOf(record), 1);
            };
        },
    } as unknown as DragSpace;
    const emit = (type: DragSpaceEvent["type"], op: DragOperation) => {
        for (const { listener } of [...listeners])
            listener({ type, operation: op } as DragSpaceEvent);
    };
    return { space: fake, listeners, emit };
}

function view(element: HTMLElement | null = null) {
    return { show: vi.fn(), move: vi.fn(), element: () => element };
}

describe("followOverlay", () => {
    it("shows a drag on its start and target changes, and nothing at its end", () => {
        const { space: s, emit } = space();
        const v = view();
        followOverlay(s, v);
        const start = operation(0, 0);
        emit("drag-start", start);
        expect(v.show).toHaveBeenLastCalledWith(start);
        const over = operation(5, 5);
        emit("drag-over", over);
        expect(v.show).toHaveBeenLastCalledWith(over);
        emit("drop", over);
        expect(v.show).toHaveBeenLastCalledWith(undefined);
    });

    it("places the element on a move without showing (no render), and tells the view the latest", () => {
        const { space: s, emit } = space();
        const el = { style: {} } as HTMLElement;
        const v = view(el);
        followOverlay(s, v);
        emit("drag-start", operation(0, 0));
        v.show.mockClear();
        const moved = operation(30, 12);
        emit("drag-move", moved);
        expect(v.show).not.toHaveBeenCalled();
        expect(v.move).toHaveBeenCalledWith(moved);
        expect(el.style.left).toBe("30px");
        expect(el.style.top).toBe("12px");
        // before the element is rendered, a move writes nothing
        const empty = view(null);
        followOverlay(s, empty);
        expect(() => emit("drag-move", moved)).not.toThrow();
    });

    it("shows a drag already running when it starts following, of its scope only", () => {
        const running = operation(0, 0, "board");
        const v = view();
        followOverlay(space(running).space, v);
        expect(v.show).toHaveBeenCalledWith(running);
        const other = view();
        followOverlay(space(running).space, other, "list");
        expect(other.show).not.toHaveBeenCalled();
        const same = view();
        followOverlay(space(running).space, same, "board");
        expect(same.show).toHaveBeenCalledWith(running);
    });

    it("subscribes with its scope, and on stop unsubscribes and shows nothing", () => {
        const { space: s, listeners } = space();
        const v = view();
        const stop = followOverlay(s, v, "board");
        expect(listeners).toHaveLength(1);
        expect(listeners[0]?.scope).toBe("board");
        stop();
        expect(listeners).toHaveLength(0);
        expect(v.show).toHaveBeenLastCalledWith(undefined);
    });
});
