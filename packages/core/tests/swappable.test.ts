// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { getDragSpace } from "../src";
import type { SwapEvent, SwappableOptions } from "../src/swappable";
import { type Box, flush, key, pointer, scroller, swappable } from "./harness";

// A swap in a drag: only the target moves, into the source's place, marked by the core; the
// event names both items; groups accept or refuse; the keyboard picks targets; a cancel and a
// veto swap nothing; nothing is left behind.

/** A row of 80×50 items 20 px apart at `y`, in group `group`. */
function row(
    group: string,
    y: number,
    options: Partial<SwappableOptions> = {},
    count = 4,
) {
    return Array.from({ length: count }, (_, index) =>
        swappable(
            { id: `${group}${index}`, index, group, ...options },
            { x: index * 100, y, width: 80, height: 50 },
        ),
    );
}

const translate = (items: { element: HTMLElement }[]) =>
    items.map((item) => item.element.style.translate);
const marked = (items: { element: HTMLElement }[]) =>
    items.map((item) => item.element.hasAttribute("data-dnd-swap-target"));

function grab(item: { element: HTMLElement & { box: Box } }) {
    const { x, y, width, height } = item.element.box;
    const at = { x: x + width / 2, y: y + height / 2 };
    const press = pointer(item.element, at.x, at.y);
    press.move(at.x + 4, at.y);
    return {
        by: (dx: number, dy: number) => press.move(at.x + dx, at.y + dy),
        drop: (dx: number, dy: number) => press.release(at.x + dx, at.y + dy),
    };
}

describe("a swap", () => {
    it("moves only the target into the source's place, then reports both", () => {
        const onSwap = vi.fn<(event: SwapEvent) => void>();
        const items = row("s", 0, { onSwap });
        const press = grab(items[0] as (typeof items)[0]);
        press.by(200, 0);
        expect(translate(items).slice(1)).toEqual(["", "-200px", ""]);
        expect(marked(items)).toEqual([false, false, true, false]);
        // on to the next one: the first is back, the next one moves
        press.by(300, 0);
        expect(translate(items).slice(1)).toEqual(["", "", "-300px"]);
        expect(marked(items)).toEqual([false, false, false, true]);
        press.drop(300, 0);
        expect(onSwap.mock.calls[0]?.[0]).toMatchObject({
            type: "swap",
            source: { id: "s0", group: "s", index: 0 },
            target: { id: "s3", group: "s", index: 3 },
            canceled: false,
        });
        expect(translate(items)).toEqual(["", "", "", ""]);
        expect(marked(items)).toEqual([false, false, false, false]);
    });

    it("over its own place, or nothing, swaps with nothing", () => {
        const onSwap = vi.fn<(event: SwapEvent) => void>();
        const items = row("s", 0, { onSwap });
        const press = grab(items[1] as (typeof items)[0]);
        press.by(0, 200);
        press.drop(0, 200);
        expect(onSwap.mock.calls[0]?.[0].target).toBeUndefined();
        expect(onSwap.mock.calls[0]?.[0].canceled).toBe(false);
    });

    it("cancels on Escape: everything restored, no target", () => {
        const onSwap = vi.fn<(event: SwapEvent) => void>();
        const items = row("s", 0, { onSwap });
        const press = grab(items[0] as (typeof items)[0]);
        press.by(100, 0);
        expect(marked(items)[1]).toBe(true);
        key("Escape", document.body);
        expect(translate(items)).toEqual(["", "", "", ""]);
        expect(marked(items)).toEqual([false, false, false, false]);
        expect(onSwap.mock.calls[0]?.[0]).toMatchObject({ canceled: true });
        expect(onSwap.mock.calls[0]?.[0].target).toBeUndefined();
        void press;
    });

    it("swaps across a group that accepts it, never into one that refuses", () => {
        const onSwap = vi.fn<(event: SwapEvent) => void>();
        const s = row("s", 0, { onSwap }, 2);
        const t = row("t", 100, { accepts: ["s"] }, 2);
        const u = row("u", 200, {}, 2);
        const press = grab(s[0] as (typeof s)[0]);
        press.by(0, 200);
        expect(marked(u)).toEqual([false, false]);
        expect(getDragSpace(document).get("operation")?.target).toBeUndefined();
        press.by(100, 100);
        expect(translate(t)).toEqual(["", "-100px -100px"]);
        press.drop(100, 100);
        expect(onSwap.mock.calls[0]?.[0].target).toEqual({
            id: "t1",
            group: "t",
            index: 1,
        });
    });

    it("goes through the middleware as a drop on the target; a veto swaps nothing", () => {
        const onSwap = vi.fn<(event: SwapEvent) => void>();
        const off = getDragSpace(document).use((ctx, next) =>
            ctx.payload.droppableId === "s2"
                ? { ok: false, error: { code: "vetoed" } }
                : next(),
        );
        const items = row("s", 0, { onSwap });
        expect(
            getDragSpace(document).can("drop", {
                draggableId: "s0",
                droppableId: "s1",
            }),
        ).toBe(true);
        const press = grab(items[0] as (typeof items)[0]);
        press.by(200, 0);
        expect(marked(items)[2]).toBe(false);
        press.drop(200, 0);
        off();
        expect(onSwap.mock.calls[0]?.[0].target).toBeUndefined();
    });

    it("moves the source to the target's place when an overlay shows it", () => {
        const items = row("s", 0, { translate: false });
        const press = grab(items[0] as (typeof items)[0]);
        press.by(100, 0);
        expect(translate(items)).toEqual(["100px", "-100px", "", ""]);
        press.drop(100, 0);
        expect(translate(items)).toEqual(["", "", "", ""]);
    });

    it("lines up the inline-start corners in RTL", () => {
        const a = swappable(
            { id: "a", index: 0, group: "r" },
            { x: 200, y: 0, width: 80, height: 50 },
        );
        const b = swappable(
            { id: "b", index: 1, group: "r" },
            { x: 0, y: 0, width: 120, height: 50 },
        );
        a.element.style.direction = "rtl";
        const press = grab(a);
        press.by(-180, 0);
        // b's right edge (120) to a's (280)
        expect(b.element.style.translate).toBe("160px");
        press.drop(-180, 0);
    });
});

describe("its own place", () => {
    it("is never a target of its own drag: the middleware never sees it, the drop swaps nothing", () => {
        const space = getDragSpace(document);
        const seen: unknown[] = [];
        const off = space.use((ctx, next) => {
            seen.push(ctx.payload.droppableId);
            return next();
        });
        const onSwap = vi.fn<(event: SwapEvent) => void>();
        const items = row("s", 0, { onSwap }, 3);
        const press = grab(items[1] as (typeof items)[0]);
        press.by(4, 4);
        press.drop(4, 4);
        expect(seen).not.toContain("s1");
        expect(onSwap.mock.calls[0]?.[0].target).toBeUndefined();
        expect(onSwap.mock.calls[0]?.[0].operation.target).toBeUndefined();
        off();
    });
});

describe("the keyboard", () => {
    it("counts its arrows from the item's own place, and back to it swaps nothing", () => {
        const onSwap = vi.fn<(event: SwapEvent) => void>();
        const items = row("s", 0, { onSwap }, 3);
        items[1]?.element.focus();
        key(" ");
        flush();
        key("ArrowRight");
        flush();
        expect(marked(items)).toEqual([false, false, true]);
        key("ArrowLeft");
        flush();
        expect(marked(items)).toEqual([false, false, false]);
        key("ArrowLeft");
        flush();
        expect(marked(items)).toEqual([true, false, false]);
        key("ArrowRight");
        flush();
        key("Enter");
        expect(onSwap.mock.calls[0]?.[0].target).toBeUndefined();
    });

    it("picks the targets in reading order, and Enter swaps", () => {
        const onSwap = vi.fn<(event: SwapEvent) => void>();
        const items = row("s", 0, { onSwap }, 3);
        items[0]?.element.focus();
        for (const name of [" ", "ArrowRight", "ArrowRight"]) {
            key(name);
            flush();
        }
        expect(marked(items)).toEqual([false, false, true]);
        key("Enter");
        expect(onSwap.mock.calls[0]?.[0]).toMatchObject({
            target: { id: "s2" },
            input: "keyboard",
        });
    });

    it("scrolls the target into view", () => {
        // a column of four in a list 150 px tall: the last one is below the fold
        const list = scroller({ x: 0, y: 0, width: 100, height: 150 }, 240);
        const onSwap = vi.fn<(event: SwapEvent) => void>();
        const items = [0, 1, 2, 3].map((index) =>
            swappable(
                { id: `v${index}`, index, group: "v", onSwap },
                { x: 0, y: index * 60, width: 100, height: 50 },
                list,
            ),
        );
        items[0]?.element.focus();
        for (const name of [" ", "ArrowDown", "ArrowDown", "ArrowDown"]) {
            key(name);
            flush();
        }
        expect(list.scrollTop).toBe(80);
        expect(marked(items)).toEqual([false, false, false, true]);
        key("Enter");
        expect(onSwap.mock.calls[0]?.[0].target).toMatchObject({ id: "v3" });
    });
});
