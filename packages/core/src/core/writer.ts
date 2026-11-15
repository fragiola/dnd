// The imperative writer (D7, D8): an element's `translate`, the CSS individual transform property,
// never `transform`, so it composes with a host that owns `transform` (Grid Layout's items). The
// operation calls `write` from its animation frame only: one write per frame at most. A sort or a
// swap preview writes its neighbours' shifts through writers too, so every element the core moves
// can be measured where it rests (`restRect`), whatever offset it shows.
import { measure } from "./dom";
import type { Rect } from "./types";

/** Writes an element's `translate` and puts the inline value it had back. */
export interface Writer {
    /** the offset written now, in px */
    readonly x: number;
    readonly y: number;
    write(x: number, y: number): void;
    /** back to the inline `translate` the element had before */
    clear(): void;
}

// the writers alive, by element: created with the first writer, never on import (D4)
let writers: WeakMap<Element, Writer> | undefined;

/** A writer for `element`'s `translate`. */
export function createWriter(element: HTMLElement): Writer {
    const style = element.style;
    const before = style.translate;
    const writer = {
        x: 0,
        y: 0,
        write(x: number, y: number) {
            if (x === writer.x && y === writer.y) return;
            writer.x = x;
            writer.y = y;
            style.translate = `${x}px ${y}px`;
        },
        clear() {
            writer.x = writer.y = 0;
            style.translate = before;
            if (writers?.get(element) === writer) writers.delete(element);
        },
    };
    writers ??= new WeakMap();
    writers.set(element, writer);
    return writer;
}

/**
 * An element's box without the offset a writer gave it: where it rests in the layout. The offset
 * is the computed `translate` (mid-way through the app's transition, it is what shows), or the
 * written one where the computed style does not say.
 */
export function restRect(element: HTMLElement): Rect {
    const rect = measure(element);
    const writer = writers?.get(element);
    if (!writer) return rect;
    const computed = element.ownerDocument.defaultView
        ?.getComputedStyle(element)
        .translate?.split(" ")
        .map(Number.parseFloat);
    const known = computed && !Number.isNaN(computed[0]);
    const x = known ? (computed[0] ?? 0) : writer.x;
    const y = known ? (computed[1] ?? 0) || 0 : writer.y;
    return { ...rect, x: rect.x - x, y: rect.y - y };
}
