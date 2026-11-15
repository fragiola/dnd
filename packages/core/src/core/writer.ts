// The imperative writer (D7, D8): the dragged element's `translate`, the CSS individual transform
// property, never `transform`, so it composes with a host that owns `transform` (Grid Layout's
// items). The operation calls `write` from its animation frame only: one write per frame at most.

/** Writes an element's `translate` and puts the inline value it had back. */
export interface Writer {
    /** the offset written now, in px */
    readonly x: number;
    readonly y: number;
    write(x: number, y: number): void;
    /** back to the inline `translate` the element had before */
    clear(): void;
}

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
        },
    };
    return writer;
}
