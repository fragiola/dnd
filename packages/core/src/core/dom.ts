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
