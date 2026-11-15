// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { getDragSpace } from "../src";
import { registerDroppable } from "../src/droppable";
import {
    grid,
    horizontalList,
    type SortableOptions,
    type SortEndEvent,
} from "../src/sortable";
import {
    type Box,
    element,
    flush,
    key,
    pendingFrames,
    pointer,
    sortable,
    sortableGroup,
} from "./harness";

// A sortable in a drag: no wrapper around a list, the preview's shifts written by the core and
// cleared after `onSortEnd`, groups that accept each other or refuse, an empty group through its
// container, the middleware, the keyboard's slots, a cancel, a scroll, and nothing left behind.

/** A column of four 100×50 items 10 px apart at `x`, in group `group`. */
function column(
    group: string,
    x: number,
    options: Partial<SortableOptions> = {},
    count = 4,
) {
    return Array.from({ length: count }, (_, index) =>
        sortable(
            { id: `${group}${index}`, index, group, ...options },
            { x, y: index * 60, width: 100, height: 50 },
        ),
    );
}

/** Each item's `translate`; one written back to zero reads as none. */
const translate = (items: { element: HTMLElement }[]) =>
    items.map((item) => {
        const value = item.element.style.translate;
        return /^0px( 0px)?$/.test(value) ? "" : value;
    });

/** Presses `item` at its centre and moves past the activation. */
function grab(item: { element: HTMLElement & { box: Box } }) {
    const { x, y, width, height } = item.element.box;
    const at = { x: x + width / 2, y: y + height / 2 };
    const press = pointer(item.element, at.x, at.y);
    press.move(at.x, at.y + 4);
    return {
        ...press,
        /** moves the dragged box's centre by (dx, dy) from where it was grabbed */
        by: (dx: number, dy: number) => press.move(at.x + dx, at.y + dy),
        drop: (dx: number, dy: number) => press.release(at.x + dx, at.y + dy),
    };
}

describe("a sortable list", () => {
    it("shifts the items between, reports the move, and clears the shifts after onSortEnd", () => {
        const onSortOver = vi.fn();
        const seen: string[][] = [];
        const onSortEnd = vi.fn<(event: SortEndEvent) => void>(() => {
            seen.push(translate(items));
        });
        const items = column("a", 0);
        items[0]?.registration.update({
            id: "a0",
            index: 0,
            group: "a",
            onSortOver,
            onSortEnd,
        });
        const press = grab(items[0] as (typeof items)[0]);
        expect(onSortOver).not.toHaveBeenCalled();
        // the dragged box's centre into the third item at rest
        press.by(0, 130);
        expect(translate(items.slice(1))).toEqual([
            "0px -60px",
            "0px -60px",
            "",
        ]);
        expect(onSortOver).toHaveBeenCalledOnce();
        expect(onSortOver.mock.calls[0]?.[0].to).toEqual({
            group: "a",
            index: 2,
        });
        // the gap below it keeps the preview: nothing changes, nothing is reported
        press.by(0, 148);
        expect(onSortOver).toHaveBeenCalledOnce();
        press.drop(0, 148);
        const event = onSortEnd.mock.calls[0]?.[0];
        expect(event).toMatchObject({
            type: "sort-end",
            id: "a0",
            from: { group: "a", index: 0 },
            to: { group: "a", index: 2 },
            canceled: false,
            input: "pointer",
        });
        // still shifted while the app's callback ran, cleared after it
        expect(seen[0]?.slice(1)).toEqual(["0px -60px", "0px -60px", ""]);
        expect(translate(items)).toEqual(["", "", "", ""]);
    });

    it("never moves the app's DOM, and marks every item of the sort `sorting`", () => {
        const items = column("a", 0);
        const order = () => [...document.body.children];
        const before = order();
        const press = grab(items[3] as (typeof items)[0]);
        expect(
            items.map((item) => item.registration.getState().sorting),
        ).toEqual([true, true, true, true]);
        expect(items[3]?.registration.getState().dragging).toBe(true);
        press.by(0, -170);
        expect(translate(items.slice(0, 3))).toEqual([
            "0px 60px",
            "0px 60px",
            "0px 60px",
        ]);
        expect(order()).toEqual(before);
        press.drop(0, -170);
        expect(
            items.map((item) => item.registration.getState().sorting),
        ).toEqual([false, false, false, false]);
    });

    it("cancels on Escape: every shift restored, onSortEnd canceled, to = from", () => {
        const onSortEnd = vi.fn();
        const items = column("a", 0, { onSortEnd });
        const press = grab(items[1] as (typeof items)[0]);
        press.by(0, 120);
        expect(translate(items)[2]).toBe("0px -60px");
        key("Escape", document.body);
        expect(translate(items)).toEqual(["", "", "", ""]);
        expect(onSortEnd.mock.calls[0]?.[0]).toMatchObject({
            from: { group: "a", index: 1 },
            to: { group: "a", index: 1 },
            canceled: true,
        });
        expect(pendingFrames()).toBe(0);
    });

    it("leaves nothing in the space: its groups are drop targets only while a sort runs", () => {
        const space = getDragSpace(document);
        const items = column("a", 0);
        expect(space.get("droppable-ids")).toEqual([]);
        const press = grab(items[0] as (typeof items)[0]);
        expect(space.get("droppable-ids")).toEqual(["a"]);
        expect(space.get("operation")?.target?.id).toBe("a");
        press.drop(0, 0);
        expect(space.get("droppable-ids")).toEqual([]);
        for (const item of items) item.registration.unregister();
        expect(space.get("draggable-ids")).toEqual([]);
    });

    it("re-measures after a scroll without a jump: the same place, the same shifts", () => {
        const onSortOver = vi.fn();
        const items = column("a", 0, { onSortOver });
        const press = grab(items[0] as (typeof items)[0]);
        press.by(0, 130);
        const shifted = translate(items);
        // the list scrolls up by 10 px under a pointer that stays in the same item
        for (const item of items) item.element.box.y -= 10;
        document.dispatchEvent(new Event("scroll"));
        flush();
        expect(translate(items).slice(1)).toEqual(shifted.slice(1));
        expect(onSortOver).toHaveBeenCalledOnce();
        press.drop(0, 130);
    });

    it("shifts a source shown by an overlay to where it lands, as a placeholder", () => {
        const items = column("a", 0, { translate: false });
        const press = grab(items[0] as (typeof items)[0]);
        press.by(0, 130);
        expect(translate(items)).toEqual([
            "0px 120px",
            "0px -60px",
            "0px -60px",
            "",
        ]);
        press.drop(0, 130);
        expect(translate(items)).toEqual(["", "", "", ""]);
    });
});

describe("groups", () => {
    it("moves an item into a group that accepts it: one closes its gap, the other opens one", () => {
        const onSortEnd = vi.fn();
        const a = column("a", 0, { onSortEnd });
        const b = column("b", 200, { accepts: ["a"] }, 3);
        const press = grab(a[1] as (typeof a)[0]);
        // into the upper half of b's second item
        press.by(200, 0);
        // the source is a1: a0 stays, a2 and a3 close its gap
        expect(translate(a).filter((_, i) => i !== 1)).toEqual([
            "",
            "0px -60px",
            "0px -60px",
        ]);
        expect(translate(b)).toEqual(["", "0px 60px", "0px 60px"]);
        expect(getDragSpace(document).get("operation")?.target?.id).toBe("b");
        press.drop(200, 0);
        expect(onSortEnd.mock.calls[0]?.[0]).toMatchObject({
            from: { group: "a", index: 1 },
            to: { group: "b", index: 1 },
        });
        expect(
            [...translate(a), ...translate(b)].every((value) => !value),
        ).toBe(true);
    });

    it("never enters a group that does not accept it", () => {
        const onSortEnd = vi.fn();
        const a = column("a", 0, { onSortEnd });
        const c = column("c", 200, {}, 3);
        const press = grab(a[0] as (typeof a)[0]);
        press.by(200, 60);
        expect(translate(c)).toEqual(["", "", ""]);
        expect(getDragSpace(document).get("operation")?.target?.id).toBe("a");
        expect(c.map((item) => item.registration.getState().sorting)).toEqual([
            false,
            false,
            false,
        ]);
        press.drop(200, 60);
        expect(onSortEnd.mock.calls[0]?.[0].to.group).toBe("a");
    });

    it("sorts into an empty group through its container, and to a container's end", () => {
        const onSortEnd = vi.fn();
        const a = column("a", 0, { onSortEnd });
        const empty = sortableGroup(
            { group: "d", accepts: ["a"] },
            { x: 400, y: 0, width: 120, height: 300 },
        );
        const press = grab(a[0] as (typeof a)[0]);
        press.by(410, 100);
        expect(empty.registration.getState().sorting).toBe(true);
        expect(translate(a).slice(1)).toEqual([
            "0px -60px",
            "0px -60px",
            "0px -60px",
        ]);
        press.drop(410, 100);
        expect(onSortEnd.mock.calls[0]?.[0].to).toEqual({
            group: "d",
            index: 0,
        });
        expect(empty.registration.getState().sorting).toBe(false);
    });

    it("goes through the middleware as a drop of the item on the group; a veto keeps it home", () => {
        const onSortEnd = vi.fn();
        const space = getDragSpace(document);
        const seen: unknown[] = [];
        const off = space.use((ctx, next) => {
            seen.push(ctx.payload);
            return ctx.payload.droppableId === "b"
                ? { ok: false, error: { code: "vetoed" } }
                : next();
        });
        const a = column("a", 0, { onSortEnd });
        const b = column("b", 200, { accepts: ["a"] }, 2);
        const press = grab(a[0] as (typeof a)[0]);
        press.by(200, 10);
        expect(seen).toContainEqual({ draggableId: "a0", droppableId: "b" });
        expect(translate(b)).toEqual(["", ""]);
        expect(translate(a).slice(1)).toEqual(["", "", ""]);
        press.drop(200, 10);
        expect(onSortEnd.mock.calls[0]?.[0].to).toEqual({
            group: "a",
            index: 0,
        });
        off();
    });

    it("lets a plain droppable of its scope take the item, the list back at rest", () => {
        const onDrop = vi.fn();
        const onSortEnd = vi.fn();
        const a = column("a", 0, { onSortEnd });
        const zone = element({ x: 0, y: 400, width: 100, height: 100 });
        const registration = registerDroppable(zone, { id: "trash", onDrop });
        const press = grab(a[0] as (typeof a)[0]);
        press.by(0, 130);
        press.by(0, 420);
        expect(translate(a).slice(1)).toEqual(["", "", ""]);
        press.drop(0, 420);
        expect(onDrop).toHaveBeenCalledOnce();
        expect(onSortEnd.mock.calls[0]?.[0].to).toEqual({
            group: "a",
            index: 0,
        });
        registration.unregister();
    });
});

describe("the keyboard", () => {
    it("moves slot by slot, across accepting groups, with Space to drop", () => {
        const onSortEnd = vi.fn();
        const a = column("a", 0, { onSortEnd }, 3);
        const b = column("b", 200, { accepts: ["a"] }, 2);
        const source = a[0] as (typeof a)[0];
        source.element.focus();
        const press = (...names: string[]) => {
            for (const name of names) {
                key(name);
                flush();
            }
        };
        press(" ", "ArrowDown", "ArrowDown");
        expect(translate(a)).toEqual(["0px 120px", "0px -60px", "0px -60px"]);
        // past the end of its own group: into the next one, at its top
        press("ArrowDown");
        expect(translate(a).slice(1)).toEqual(["0px -60px", "0px -60px"]);
        expect(translate(b)).toEqual(["0px 60px", "0px 60px"]);
        expect(source.element.style.translate).toBe("200px");
        // up again, then Space drops
        press("ArrowUp", "ArrowUp", " ");
        expect(onSortEnd.mock.calls[0]?.[0]).toMatchObject({
            to: { group: "a", index: 1 },
            input: "keyboard",
        });
        expect(
            [...translate(a), ...translate(b)].every((value) => !value),
        ).toBe(true);
    });

    it("reads its arrows visually in RTL: ArrowLeft moves toward the inline end", () => {
        document.documentElement.setAttribute("dir", "rtl");
        const onSortEnd = vi.fn();
        // a horizontal list from the right: index 0 at x 300
        const items = [0, 1, 2].map((index) =>
            sortable(
                {
                    id: `h${index}`,
                    index,
                    group: "h",
                    strategy: horizontalList,
                    onSortEnd,
                },
                { x: 300 - index * 100, y: 0, width: 80, height: 50 },
            ),
        );
        for (const item of items) item.element.style.direction = "rtl";
        items[0]?.element.focus();
        for (const name of [" ", "ArrowLeft", "ArrowLeft", "Enter"]) {
            key(name);
            flush();
        }
        expect(onSortEnd.mock.calls[0]?.[0].to).toEqual({
            group: "h",
            index: 2,
        });
    });
});

describe("a grid", () => {
    it("moves items to the places between, across rows", () => {
        const onSortEnd = vi.fn();
        const cells = Array.from({ length: 6 }, (_, index) =>
            sortable(
                {
                    id: `g${index}`,
                    index,
                    group: "g",
                    strategy: grid,
                    onSortEnd,
                },
                {
                    x: (index % 3) * 100,
                    y: Math.floor(index / 3) * 70,
                    width: 80,
                    height: 50,
                },
            ),
        );
        const press = grab(cells[0] as (typeof cells)[0]);
        // the centre (40, 25) into the second row's middle cell, well inside it
        press.by(100, 70);
        expect(translate(cells)).toEqual([
            expect.any(String),
            "-100px",
            "-100px",
            "200px -70px",
            "-100px",
            "",
        ]);
        press.drop(100, 70);
        expect(onSortEnd.mock.calls[0]?.[0].to).toEqual({
            group: "g",
            index: 4,
        });
    });
});
