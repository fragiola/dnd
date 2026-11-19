// What a screen reader hears about a drag: the words are the app's (D6, D10), built here from the
// drag events an example receives (`injectDragMonitor`), and spoken through a live region the
// example renders. The packages render no text, so none of this is theirs.

import { type Signal, signal } from "@angular/core";

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

/** A message for a live region, and the function that sets it (`undefined` keeps the last one). */
export function createAnnouncer(
    initial = "",
): [Signal<string>, (message: string | undefined) => void] {
    const message = signal(initial);
    const announce = (next: string | undefined) => {
        if (next !== undefined) message.set(next);
    };
    return [message.asReadonly(), announce];
}

/** The parts of a sort event an announcement reads (`(sortStart)`, `(sortOver)`, `(sortEnd)`). */
export interface SortEventLike {
    readonly type: "sort-start" | "sort-over" | "sort-end";
    readonly id: string | number;
    readonly from: { readonly group: string; readonly index: number };
    readonly to: { readonly group: string; readonly index: number };
    readonly input: "pointer" | "keyboard";
    readonly canceled?: boolean;
}

/** How the app names a sort's places: an item, a group, and how many items a group holds. */
export interface SortNames {
    readonly item: (id: string | number) => string;
    readonly group: (group: string) => string;
    readonly size: (group: string) => number;
}

/**
 * The sentence for a sort event: the item, and its place as a position out of the group's size
 * ("position 2 of 4 in Today"). Moving into another group makes that group one item longer.
 */
export function describeSort(event: SortEventLike, names: SortNames): string {
    const item = names.item(event.id);
    const place = ({ group, index }: SortEventLike["to"]) => {
        const size = names.size(group) + (group === event.from.group ? 0 : 1);
        return `position ${index + 1} of ${size} in ${names.group(group)}`;
    };
    switch (event.type) {
        case "sort-start":
            return event.input === "keyboard"
                ? `Picked up ${item}, at ${place(event.from)}. Use the arrow keys to move it, Space or Enter to drop it, Escape to cancel.`
                : `Picked up ${item}, at ${place(event.from)}.`;
        case "sort-over":
            return `${item} is at ${place(event.to)}.`;
        case "sort-end":
            if (event.canceled)
                return `Cancelled. ${item} is back at ${place(event.from)}.`;
            return event.to.group === event.from.group &&
                event.to.index === event.from.index
                ? `${item} dropped where it was, at ${place(event.from)}.`
                : `${item} dropped at ${place(event.to)}.`;
    }
}
