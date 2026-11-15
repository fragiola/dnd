// The collision strategies (D5): pure functions over the pointer, the dragged box and the
// measured droppables, each its own export so an app ships only the one it uses.
import { center } from "./dom";
import type { CollisionStrategy, Rect } from "./types";

const area = (rect: Rect) => rect.width * rect.height;

/**
 * The droppable under the pointer (the default). Nested droppables: the smallest box wins, so a
 * list inside a column takes the drop, not the column.
 */
export const pointerWithin: CollisionStrategy = ({ pointer, droppables }) => {
    let best: (typeof droppables)[number] | undefined;
    for (const candidate of droppables) {
        const { x, y, width, height } = candidate.rect;
        if (
            pointer.x >= x &&
            pointer.x <= x + width &&
            pointer.y >= y &&
            pointer.y <= y + height &&
            (!best || area(candidate.rect) < area(best.rect))
        ) {
            best = candidate;
        }
    }
    return best;
};

/** The droppable whose centre is nearest the dragged box's centre, wherever the pointer is. */
export const closestCenter: CollisionStrategy = ({ dragRect, droppables }) => {
    const from = center(dragRect);
    let best: (typeof droppables)[number] | undefined;
    let nearest = Number.POSITIVE_INFINITY;
    for (const candidate of droppables) {
        const to = center(candidate.rect);
        const distance = Math.hypot(to.x - from.x, to.y - from.y);
        if (distance < nearest) {
            nearest = distance;
            best = candidate;
        }
    }
    return best;
};

/**
 * The droppable the dragged box overlaps most, by intersection over union (the overlap's share of
 * both boxes together); none when it overlaps none.
 */
export const rectIntersection: CollisionStrategy = ({
    dragRect,
    droppables,
}) => {
    let best: (typeof droppables)[number] | undefined;
    let most = 0;
    for (const candidate of droppables) {
        const { rect } = candidate;
        const width =
            Math.min(dragRect.x + dragRect.width, rect.x + rect.width) -
            Math.max(dragRect.x, rect.x);
        const height =
            Math.min(dragRect.y + dragRect.height, rect.y + rect.height) -
            Math.max(dragRect.y, rect.y);
        if (width <= 0 || height <= 0) continue;
        const overlap = width * height;
        const share = overlap / (area(dragRect) + area(rect) - overlap);
        if (share > most) {
            most = share;
            best = candidate;
        }
    }
    return best;
};
