// The geometry of a drag overlay (D7, D9): a fixed-position box the app renders under the
// pointer, where the source would be, keeping the point it was grabbed by. No DOM is created
// here; the React `DragOverlay` renders the box.
import type { DragOperation, Point } from "./types";

/** Where the pointer grabbed the source, from its top-left corner, in px. */
export function grabOffset(operation: DragOperation): Point {
    const { pointer, delta, rects } = operation;
    return {
        x: pointer.x - delta.x - rects.source.x,
        y: pointer.y - delta.y - rects.source.y,
    };
}

/** The structural inline style of an overlay: fixed, sized as the source, inert to the pointer. */
export interface OverlayStyle {
    readonly position: "fixed";
    readonly left: number;
    readonly top: number;
    readonly width: number;
    readonly height: number;
    readonly boxSizing: "border-box";
    readonly pointerEvents: "none";
}

/** The overlay's style for `operation`: the dragged box, following the pointer. */
export function overlayStyle(operation: DragOperation): OverlayStyle {
    const { x, y, width, height } = operation.rects.drag;
    return {
        position: "fixed",
        left: x,
        top: y,
        width,
        height,
        boxSizing: "border-box",
        pointerEvents: "none",
    };
}
