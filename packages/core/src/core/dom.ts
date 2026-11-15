// DOM helpers shared by the sensors and the operation. Nothing here reaches a global: every
// target is an element, its ownerDocument or that document's defaultView (D5).
import type { Point, Rect } from "./types";

/** Adds an event listener and returns its removal. */
export function listen<Type extends keyof GlobalEventHandlersEventMap>(
    target: EventTarget,
    type: Type,
    handler: (event: GlobalEventHandlersEventMap[Type]) => void,
    options?: AddEventListenerOptions,
): () => void {
    target.addEventListener(type, handler as EventListener, options);
    return () =>
        target.removeEventListener(type, handler as EventListener, options);
}

/** An element's box on screen, as a plain rect. */
export function measure(element: Element): Rect {
    const { x, y, width, height } = element.getBoundingClientRect();
    return { x, y, width, height };
}

/** The centre of a box. */
export function center(rect: Rect): Point {
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

/**
 * Calls app code (a callback, a listener, an `accepts` predicate) so that a throw never leaves the
 * core half-way: the throw is caught, reported asynchronously through `view` (rethrown from a
 * timer, so the console and error trackers still see it) and `false` is returned for the caller
 * to end or clean up deterministically.
 */
export function guarded(view: Window | null, call: () => void): boolean {
    try {
        call();
        return true;
    } catch (error) {
        if (view)
            view.setTimeout(() => {
                throw error;
            }, 0);
        else void Promise.reject(error);
        return false;
    }
}

const SCROLLS = /auto|scroll|overlay/;

/** How far to scroll a box's `[start, start + size]` span so it shows in `[edge, edge + room]`. */
function nearest(start: number, size: number, edge: number, room: number) {
    const end = start + size;
    // already in view, or larger than the view and over all of it: nothing to do
    if (
        (start >= edge && end <= edge + room) ||
        (start < edge && end > edge + room)
    )
        return 0;
    return start < edge
        ? start - edge
        : Math.min(end - edge - room, start - edge);
}

/**
 * Scrolls the scroll containers around `element` (itself included, the page last) by the least
 * that shows `rect`, as `scrollIntoView({ block: "nearest", inline: "nearest" })` does, through
 * the element's own document. It sets `scrollTop`/`scrollLeft`, so it is instant unless the app's
 * CSS asks for `scroll-behavior: smooth`. Returns how far `rect` moves on screen once scrolled.
 */
export function reveal(element: Element, rect: Rect): Point {
    const doc = element.ownerDocument;
    const view = doc.defaultView;
    const page = doc.scrollingElement;
    const moved = { x: 0, y: 0 };
    for (let at: Element | null = element; at; at = at.parentElement) {
        const style = view?.getComputedStyle(at);
        if (
            at !== page &&
            !(style && SCROLLS.test(style.overflowX + style.overflowY))
        )
            continue;
        // the page's view is the viewport, any other container's its padding box
        const own = at === page ? { x: 0, y: 0 } : measure(at);
        const box = { x: own.x + at.clientLeft, y: own.y + at.clientTop };
        const rtl = style?.direction === "rtl";
        const width = Math.max(0, at.scrollWidth - at.clientWidth);
        const height = Math.max(0, at.scrollHeight - at.clientHeight);
        const x = nearest(rect.x - moved.x, rect.width, box.x, at.clientWidth);
        const y = nearest(
            rect.y - moved.y,
            rect.height,
            box.y,
            at.clientHeight,
        );
        // in RTL, `scrollLeft` runs from `-width` to 0
        const left = Math.max(
            rtl ? -width : 0,
            Math.min(rtl ? 0 : width, at.scrollLeft + x),
        );
        const top = Math.max(0, Math.min(height, at.scrollTop + y));
        if (left !== at.scrollLeft) {
            moved.x += left - at.scrollLeft;
            at.scrollLeft = left;
        }
        if (top !== at.scrollTop) {
            moved.y += top - at.scrollTop;
            at.scrollTop = top;
        }
        if (at === page) break;
    }
    return moved;
}
