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
