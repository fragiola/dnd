// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { getDragSpace, subscribe } from "../src";
import type { DragSpaceEvent } from "../src/core/types";
import { registerDraggable } from "../src/draggable";
import { draggable, droppable, flush, key, pointer, scroller } from "./harness";

// three droppables in a row and one below, and a draggable left of them
const ROW = [
    { id: "a", box: { x: 100, y: 0, width: 100, height: 100 } },
    { id: "b", box: { x: 200, y: 0, width: 100, height: 100 } },
    { id: "c", box: { x: 300, y: 4, width: 100, height: 100 } },
    { id: "d", box: { x: 100, y: 200, width: 100, height: 100 } },
];

function setup(options: Parameters<typeof draggable>[0]) {
    for (const { id, box } of ROW) droppable({ id }, box);
    const events: DragSpaceEvent[] = [];
    const off = subscribe((event) => events.push(event), { document });
    const created = draggable(options);
    created.element.focus();
    return { ...created, events, off };
}

/** The keys pressed one by one, each followed by its frame. */
function press(...names: string[]) {
    for (const name of names) {
        key(name);
        flush();
    }
}

const target = () => getDragSpace(document).get("operation")?.target?.id;

describe("the keyboard sensor", () => {
    it("makes a non-focusable activator a tab stop while registered, and leaves a focusable one", () => {
        const plain = document.createElement("div");
        const button = document.createElement("button");
        const own = document.createElement("div");
        own.tabIndex = -1;
        document.body.append(plain, button, own);
        const registrations = [plain, button, own].map((element, id) =>
            registerDraggable(element, { id }),
        );
        expect(plain.getAttribute("tabindex")).toBe("0");
        expect(button.hasAttribute("tabindex")).toBe(false);
        expect(own.getAttribute("tabindex")).toBe("-1");
        // a handle becomes the tab stop instead
        const handle = document.createElement("span");
        plain.append(handle);
        registrations[0]?.update({ id: 0, handle });
        expect(plain.hasAttribute("tabindex")).toBe(false);
        expect(handle.getAttribute("tabindex")).toBe("0");
        for (const registration of registrations) registration.unregister();
        expect(handle.hasAttribute("tabindex")).toBe(false);
    });

    it.each([" ", "Enter"])(
        "grabs with %j, moves by 25 px steps, and drops with it",
        (grab) => {
            const onDragEnd = vi.fn();
            const { element, events, off } = setup({ id: "s", onDragEnd });
            press(grab);
            expect(getDragSpace(document).get("operation")?.input).toBe(
                "keyboard",
            );
            // from the centre of the draggable (25, 25)
            press("ArrowRight", "ArrowRight", "ArrowRight", "ArrowRight");
            expect(element.style.translate).toBe("100px");
            expect(target()).toBe("a");
            press("ArrowDown", "ArrowLeft", "ArrowUp");
            expect(element.style.translate).toBe("75px");
            press(grab);
            off();
            expect(onDragEnd).toHaveBeenCalledOnce();
            expect(onDragEnd.mock.calls[0]?.[0].operation.target.id).toBe("a");
            expect(element.style.translate).toBe("");
            expect(new Set(events.map((event) => event.type))).toEqual(
                new Set(["drag-start", "drag-move", "drag-over", "drop"]),
            );
            expect(events.every((event) => event.input === "keyboard")).toBe(
                true,
            );
        },
    );

    it("moves by the step given", () => {
        const { element } = setup({ id: "s", keyboard: { step: 10 } });
        press(" ", "ArrowDown");
        expect(element.style.translate).toBe("0px 10px");
        press("Escape");
    });

    it("produces the same events as the pointer for the same drag", () => {
        const types = (input: "pointer" | "keyboard") => {
            const { element, events, off, registration } = setup({ id: "s" });
            if (input === "pointer") {
                const drag = pointer(element, 25, 25);
                drag.move(150, 50);
                drag.release(150, 50);
            } else {
                press(
                    " ",
                    "ArrowRight",
                    "ArrowRight",
                    "ArrowRight",
                    "ArrowRight",
                    "ArrowRight",
                    " ",
                );
            }
            off();
            registration.unregister();
            document.body.innerHTML = "";
            return [...new Set(events.map((event) => event.type))].sort();
        };
        expect(types("keyboard")).toEqual(types("pointer"));
    });

    it("cancels with Escape and gives the focus back", () => {
        vi.useFakeTimers();
        const onDragCancel = vi.fn();
        const { element } = setup({ id: "s", onDragCancel });
        press(" ", "ArrowRight");
        const cancelKey = key("Escape");
        expect(cancelKey.defaultPrevented).toBe(true);
        expect(onDragCancel).toHaveBeenCalledOnce();
        expect(onDragCancel.mock.calls[0]?.[0].input).toBe("keyboard");
        expect(element.style.translate).toBe("");
        // the app's re-render moved the element: focus is lost, then restored
        document.body.append(element);
        element.blur();
        vi.runAllTimers();
        expect(document.activeElement).toBe(element);
    });

    it("cancels on Tab or when the focus leaves, and leaves the focus where it went", () => {
        vi.useFakeTimers();
        const onDragCancel = vi.fn();
        const { element } = setup({ id: "s", onDragCancel });
        press(" ");
        key("Tab");
        expect(onDragCancel).toHaveBeenCalledOnce();
        const elsewhere = document.createElement("button");
        document.body.append(elsewhere);
        element.focus();
        press(" ");
        elsewhere.focus();
        expect(onDragCancel).toHaveBeenCalledTimes(2);
        vi.runAllTimers();
        expect(document.activeElement).toBe(elsewhere);
    });

    it("never clicks a button activator: the Space and Enter it takes are prevented, keyup too", () => {
        for (const { id, box } of ROW) droppable({ id }, box);
        const button = document.createElement("button");
        document.body.append(button);
        const clicks = vi.fn();
        button.addEventListener("click", clicks);
        const registration = registerDraggable(button, { id: "b" });
        button.focus();
        const up = (name: string) => {
            const event = new KeyboardEvent("keyup", {
                key: name,
                bubbles: true,
                cancelable: true,
            });
            button.dispatchEvent(event);
            return event.defaultPrevented;
        };
        expect(key(" ").defaultPrevented).toBe(true);
        expect(up(" ")).toBe(true);
        expect(key("ArrowRight").defaultPrevented).toBe(true);
        expect(up("ArrowRight")).toBe(true);
        expect(key("Enter").defaultPrevented).toBe(true);
        expect(up("Enter")).toBe(true);
        // after the drop, keys are the button's again
        expect(up(" ")).toBe(false);
        registration.unregister();
        expect(clicks).not.toHaveBeenCalled();
    });

    it("grabs only from the activator itself, not a key from a field inside it", () => {
        const onDragStart = vi.fn();
        const { element } = setup({ id: "s", onDragStart });
        const field = document.createElement("input");
        element.append(field);
        key(" ", field);
        key("Enter", element, { repeat: true });
        expect(onDragStart).not.toHaveBeenCalled();
    });

    it("moves on from the droppable it starts over, with an arrow before the first frame (targets)", () => {
        // the draggable sits inside b: its first ArrowRight goes to c, not to a
        const { element } = setup({ id: "s", keyboard: { mode: "targets" } });
        element.getBoundingClientRect = () =>
            DOMRect.fromRect({ x: 225, y: 25, width: 50, height: 50 });
        key(" ");
        expect(target()).toBe("b");
        key("ArrowRight");
        flush();
        expect(target()).toBe("c");
        press("Escape");
    });

    it("moves droppable to droppable in reading order, with mode targets", () => {
        setup({ id: "s", keyboard: { mode: "targets" } });
        press(" ", "ArrowRight");
        expect(target()).toBe("a");
        press("ArrowRight");
        expect(target()).toBe("b");
        // c is 4 px lower, still the same row
        press("ArrowDown");
        expect(target()).toBe("c");
        press("ArrowRight");
        expect(target()).toBe("d");
        // at the end it stays
        press("ArrowRight");
        expect(target()).toBe("d");
        press("ArrowUp", "ArrowLeft");
        expect(target()).toBe("b");
        press("Enter");
    });

    it("keeps arrows visual in RTL: ArrowRight goes right, against the reading order", () => {
        const { element } = setup({ id: "s", keyboard: { mode: "targets" } });
        element.style.direction = "rtl";
        // reading order in RTL: c, b, a (right to left), then d
        press(" ", "ArrowDown");
        expect(target()).toBe("c");
        press("ArrowLeft");
        expect(target()).toBe("b");
        press("ArrowLeft");
        expect(target()).toBe("a");
        press("ArrowRight");
        expect(target()).toBe("b");
        press("ArrowDown", "ArrowDown");
        expect(target()).toBe("d");
        press("Escape");
    });

    it("scrolls the next droppable into view, and the pointer follows it there (targets)", () => {
        // a list 150 px tall showing a and b; c is below its fold
        const list = scroller({ x: 0, y: 0, width: 200, height: 150 }, 400);
        for (const [id, y] of [
            ["a", 0],
            ["b", 100],
            ["c", 250],
        ] as const)
            droppable({ id }, { x: 0, y, width: 200, height: 90 }, list);
        const { element } = draggable(
            { id: "s", keyboard: { mode: "targets" } },
            { x: 300, y: 0, width: 50, height: 50 },
        );
        element.focus();
        press(" ", "ArrowDown", "ArrowDown");
        expect(target()).toBe("b");
        expect(list.scrollTop).toBe(40);
        // c's bottom (340) to the list's bottom (150), the least that shows it
        press("ArrowDown");
        expect(list.scrollTop).toBe(190);
        expect(target()).toBe("c");
        expect(getDragSpace(document).get("operation")?.pointer).toEqual({
            x: 100,
            y: 105,
        });
        // back up: a scrolls in from the top
        press("ArrowUp", "ArrowUp");
        expect(target()).toBe("a");
        expect(list.scrollTop).toBe(0);
        press("Escape");
    });

    it("skips droppables that refuse the source, in targets mode", () => {
        droppable(
            { id: "photos", accepts: ["photo"] },
            { x: 0, y: 400, width: 50, height: 50 },
        );
        setup({ id: "s", type: "card", keyboard: { mode: "targets" } });
        press(" ", "ArrowUp");
        // the last accepting one in reading order, never "photos"
        expect(target()).toBe("d");
        press("Escape");
    });

    it("drops nowhere when nothing is under the dragged box", () => {
        const onDragEnd = vi.fn();
        setup({ id: "s", onDragEnd });
        press(" ", "ArrowLeft", " ");
        expect(onDragEnd.mock.calls[0]?.[0].operation.target).toBeUndefined();
    });
});
