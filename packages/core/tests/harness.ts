// The core against a DOM jsdom cannot lay out, after Grid Layout's engine harness
// (grid-layout/packages/core/tests/engine/harness.ts): boxes, animation frames and pointer
// capture are faked. Frames run when a test says so (`flush`), so a test sees exactly what one
// frame does. Every registration made through the harness is undone after each test.
import { afterEach, beforeEach, vi } from "vitest";
import {
    type DraggableOptions,
    type DraggableRegistration,
    registerDraggable,
} from "../src/draggable";
import {
    type DroppableOptions,
    type DroppableRegistration,
    registerDroppable,
} from "../src/droppable";
import {
    registerSortable,
    registerSortableGroup,
    type SortableGroupOptions,
    type SortableOptions,
} from "../src/sortable";
import { registerSwappable, type SwappableOptions } from "../src/swappable";

let frames: (FrameRequestCallback | undefined)[] = [];
const registrations: { unregister(): void }[] = [];

/** How many frames are requested and not run yet. */
export function pendingFrames(): number {
    return frames.filter(Boolean).length;
}

/** Runs the animation frames requested so far (not those they request). */
export function flush(): void {
    const pending = frames;
    frames = [];
    for (const callback of pending) callback?.(0);
}

beforeEach(() => {
    frames = [];
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
        frames.push(callback);
        return frames.length;
    });
    vi.stubGlobal("cancelAnimationFrame", (id: number) => {
        frames[id - 1] = undefined;
    });
    const captured = new WeakMap<Element, Set<number>>();
    const proto = HTMLElement.prototype as unknown as Record<string, unknown>;
    proto.setPointerCapture = function (this: Element, id: number) {
        const set = captured.get(this) ?? new Set<number>();
        set.add(id);
        captured.set(this, set);
    };
    proto.hasPointerCapture = function (this: Element, id: number) {
        return captured.get(this)?.has(id) ?? false;
    };
    proto.releasePointerCapture = function (this: Element, id: number) {
        captured.get(this)?.delete(id);
    };
});

afterEach(() => {
    for (const registration of registrations.splice(0))
        registration.unregister();
    document.body.innerHTML = "";
    document.documentElement.removeAttribute("dir");
    vi.unstubAllGlobals();
    vi.useRealTimers();
});

/** The box an element reports, movable by a test (a scroll). */
export interface Box {
    x: number;
    y: number;
    width: number;
    height: number;
}

/**
 * An element in `parent` whose box is `box`, shifted by the `translate` the core wrote, as a
 * browser would report it.
 */
export function element(
    box: Box,
    parent: Element = document.body,
    tag = "div",
): HTMLElement & { box: Box } {
    const created = parent.ownerDocument.createElement(tag) as HTMLElement & {
        box: Box;
    };
    created.box = { ...box };
    created.getBoundingClientRect = () => {
        const [x = 0, y = 0] = (created.style.translate || "0px 0px")
            .split(" ")
            .map((value) => Number.parseFloat(value));
        return DOMRect.fromRect({
            x: created.box.x + x,
            y: created.box.y + (Number.isNaN(y) ? 0 : y),
            width: created.box.width,
            height: created.box.height,
        });
    };
    parent.append(created);
    return created;
}

/** A draggable registered on a new element at `box` (default 0,0 50×50). */
export function draggable(
    options: DraggableOptions,
    box: Box = { x: 0, y: 0, width: 50, height: 50 },
    parent?: Element,
) {
    const el = element(box, parent);
    el.tabIndex = 0;
    const registration: DraggableRegistration = registerDraggable(el, options);
    registrations.push(registration);
    return { element: el, registration };
}

/** A droppable registered on a new element at `box`. */
export function droppable(
    options: DroppableOptions,
    box: Box,
    parent?: Element,
) {
    const el = element(box, parent);
    const registration: DroppableRegistration = registerDroppable(el, options);
    registrations.push(registration);
    return { element: el, registration };
}

/** A sortable item registered on a new element at `box`. */
export function sortable(options: SortableOptions, box: Box, parent?: Element) {
    const el = element(box, parent);
    const registration = registerSortable(el, options);
    registrations.push(registration);
    return { element: el, registration };
}

/** A sortable group's container registered on a new element at `box`. */
export function sortableGroup(
    options: SortableGroupOptions,
    box: Box,
    parent?: Element,
) {
    const el = element(box, parent);
    const registration = registerSortableGroup(el, options);
    registrations.push(registration);
    return { element: el, registration };
}

/** A swappable item registered on a new element at `box`. */
export function swappable(
    options: SwappableOptions,
    box: Box,
    parent?: Element,
) {
    const el = element(box, parent);
    const registration = registerSwappable(el, options);
    registrations.push(registration);
    return { element: el, registration };
}

let nextPointer = 1;

/** A pointer pressed on `target` at (x, y); moves run their frame unless told not to. */
export function pointer(
    target: Element,
    x: number,
    y: number,
    init: PointerEventInit = {},
) {
    const pointerId = nextPointer++;
    const fire = (type: string, at: [number, number], buttons: number) => {
        const event = new PointerEvent(type, {
            bubbles: true,
            cancelable: true,
            isPrimary: true,
            pointerId,
            pointerType: "mouse",
            clientX: at[0],
            clientY: at[1],
            button: 0,
            buttons,
            ...init,
        });
        (type === "pointerdown" ? target : target.ownerDocument).dispatchEvent(
            event,
        );
        return event;
    };
    const down = fire("pointerdown", [x, y], 1);
    return {
        pointerId,
        down,
        /** moves to (x, y), then runs the frame */
        move(toX: number, toY: number) {
            fire("pointermove", [toX, toY], 1);
            flush();
        },
        /** moves without running the frame */
        moveOnly(toX: number, toY: number) {
            return fire("pointermove", [toX, toY], 1);
        },
        release(toX: number, toY: number) {
            return fire("pointerup", [toX, toY], 0);
        },
        cancel() {
            return fire("pointercancel", [x, y], 0);
        },
        loseCapture(on: Element) {
            on.dispatchEvent(
                new PointerEvent("lostpointercapture", {
                    bubbles: true,
                    pointerId,
                }),
            );
        },
    };
}

/** A key pressed on `target` (default: the focused element). */
export function key(
    name: string,
    target: Element = document.activeElement ?? document.body,
    init: KeyboardEventInit = {},
): KeyboardEvent {
    const event = new KeyboardEvent("keydown", {
        key: name,
        bubbles: true,
        cancelable: true,
        ...init,
    });
    target.dispatchEvent(event);
    return event;
}
