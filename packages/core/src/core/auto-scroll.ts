// From Grid Layout (fragiola/grid-layout, packages/core/src/engine/engine.ts), same author and licence.
//
// Auto-scroll (D9): an opt-in strategy given to a draggable. While it is dragged near an edge of
// a scroll container that holds the pointer, the nearest such container scrolls, a frame at a
// time through the element's `defaultView`, faster the deeper into the edge zone. An app that
// never imports `autoScroll` never ships it.
import type { Point } from "./types";

/** Options of {@link autoScroll}. */
export interface AutoScrollOptions {
    /** how deep the edge zones are, in px (default 40) */
    readonly threshold?: number;
    /** the fastest scroll, in px per frame (default 15) */
    readonly speed?: number;
}

/** A running auto-scroll: follows the pointer until stopped. */
export interface AutoScrollSession {
    move(pointer: Point): void;
    stop(): void;
}

/** An auto-scroll strategy, given to a draggable as `autoScroll`. */
export interface AutoScroll {
    /** starts scrolling around `element` (the dragged one) */
    start(element: HTMLElement): AutoScrollSession;
}

const SCROLLS = /auto|scroll|overlay/;

/** The scroll containers around `element`, nearest first, ending with the page's. */
function scrollersOf(element: HTMLElement): Element[] {
    const doc = element.ownerDocument;
    const view = doc.defaultView;
    const found: Element[] = [];
    for (let at = element.parentElement; at; at = at.parentElement) {
        if (at === doc.scrollingElement) break;
        const style = view?.getComputedStyle(at);
        if (style && SCROLLS.test(style.overflowX + style.overflowY))
            found.push(at);
    }
    if (doc.scrollingElement) found.push(doc.scrollingElement);
    return found;
}

/**
 * How far to scroll along one axis for a pointer at `at` between `start` and `end`: none
 * outside the edge zones (each at most half the box), more the deeper into one, toward it.
 */
function edgeStep(
    at: number,
    start: number,
    end: number,
    threshold: number,
    speed: number,
): number {
    const zone = Math.min(threshold, (end - start) / 2);
    if (zone <= 0 || at < start || at > end) return 0;
    const ramp = (depth: number) =>
        Math.ceil(speed * Math.min(1, Math.max(0, 1 - depth / zone)));
    if (at < start + zone) return -ramp(at - start);
    if (at > end - zone) return ramp(end - at);
    return 0;
}

/** Scrolls `scroller` by `delta` along `axis` at once; says whether it moved. */
function scrollAlong(scroller: Element, axis: "x" | "y", delta: number) {
    const key = axis === "y" ? "scrollTop" : "scrollLeft";
    const before = scroller[key];
    scroller[key] = before + delta;
    return scroller[key] !== before;
}

/** Auto-scroll near the edges of the nearest scroll containers, opt-in per draggable. */
export function autoScroll(options: AutoScrollOptions = {}): AutoScroll {
    const { threshold = 40, speed = 15 } = options;
    return {
        start(element) {
            const doc = element.ownerDocument;
            const view = doc.defaultView;
            const scrollers = scrollersOf(element);
            let pointer: Point | undefined;
            let frame: number | undefined;
            const tick = () => {
                frame = undefined;
                if (!pointer || !view) return;
                let moved = false;
                for (const axis of ["x", "y"] as const) {
                    for (const scroller of scrollers) {
                        // the page's box is the viewport, any other its own box
                        const box =
                            scroller === doc.scrollingElement
                                ? {
                                      left: 0,
                                      top: 0,
                                      right: view.innerWidth,
                                      bottom: view.innerHeight,
                                  }
                                : scroller.getBoundingClientRect();
                        const step =
                            axis === "x"
                                ? edgeStep(
                                      pointer.x,
                                      box.left,
                                      box.right,
                                      threshold,
                                      speed,
                                  )
                                : edgeStep(
                                      pointer.y,
                                      box.top,
                                      box.bottom,
                                      threshold,
                                      speed,
                                  );
                        // the nearest container that can still scroll that way
                        if (step && scrollAlong(scroller, axis, step)) {
                            moved = true;
                            break;
                        }
                    }
                }
                // at the end, or out of the zones: nothing until the pointer moves again
                if (moved) frame = view.requestAnimationFrame(tick);
            };
            return {
                move(next) {
                    pointer = next;
                    if (frame === undefined)
                        frame = view?.requestAnimationFrame(tick);
                },
                stop() {
                    pointer = undefined;
                    if (frame !== undefined) view?.cancelAnimationFrame(frame);
                    frame = undefined;
                },
            };
        },
    };
}
