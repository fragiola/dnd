// What a screen reader hears about a drag: the words are the app's (D6, D10), built here from the
// drag events an example receives (`useDragMonitor`), and spoken through a live region the
// example renders. The packages render no text, so none of this is theirs.

import { useCallback, useState } from "react";

/** The parts of a drag event an announcement reads. */
export interface DragEventLike {
    readonly type: string;
    readonly input: "pointer" | "keyboard";
    readonly operation: {
        readonly source: { readonly id: string | number };
        readonly target?: { readonly id: string | number } | undefined;
        readonly delta: { readonly x: number; readonly y: number };
    };
}

/** The sentence for a drag event, or `undefined` for one not worth saying (a move). */
export function describeDrag(
    event: DragEventLike,
    nameOf: (id: string | number) => string,
): string | undefined {
    const source = nameOf(event.operation.source.id);
    const target = event.operation.target;
    switch (event.type) {
        case "drag-start":
            return event.input === "keyboard"
                ? `Picked up ${source}. Use the arrow keys to move it, Space or Enter to drop it, Escape to cancel.`
                : `Picked up ${source}.`;
        case "drag-over":
            return target
                ? `${source} is over ${nameOf(target.id)}.`
                : `${source} is not over a drop zone.`;
        case "drop":
            return target
                ? `${source} dropped on ${nameOf(target.id)}.`
                : `${source} dropped outside any drop zone: it stays where it was.`;
        case "drag-cancel":
            return `Cancelled. ${source} is back where it was.`;
        default:
            return undefined;
    }
}

/**
 * `describeDrag` for one drag after another: the target a drag finds before it moved is the place
 * it starts from, not news, so that `drag-over` is not said (it would replace the "Picked up"
 * sentence before a screen reader reads it).
 */
export function createNarrator(
    nameOf: (id: string | number) => string,
): (event: DragEventLike) => string | undefined {
    let started = false;
    return (event) => {
        if (event.type === "drag-start") started = true;
        else if (event.type === "drag-over" && started) {
            started = false;
            const { x, y } = event.operation.delta;
            if (Math.hypot(x, y) < 8) return undefined;
        }
        return describeDrag(event, nameOf);
    };
}

/** A message for a live region, and the function that sets it (`undefined` keeps the last one). */
export function useAnnouncer(
    initial = "",
): [string, (message: string | undefined) => void] {
    const [message, setMessage] = useState(initial);
    const announce = useCallback((next: string | undefined) => {
        if (next !== undefined) setMessage(next);
    }, []);
    return [message, announce];
}
