// What a drag overlay shows, decided once for every adapter (D8, D9): the drag of its space (and
// scope) from its start, a drag already running when the overlay mounts included, a new operation
// on each target change, and nothing once it ends. The pointer's moves never render: the core
// writes the overlay element's `left`/`top` (its `overlayStyle`) directly. Adapter-only
// (`@fragiola/dnd/adapter`): an app renders the adapter's overlay part.
import { overlayStyle } from "./overlay";
import type { DragSpace } from "./space";
import type { DragOperation } from "./types";

/** An adapter's overlay, as the core drives it. */
export interface OverlayView {
    /** the drag to render, or none: called on its start, its target changes and its end */
    show(operation: DragOperation | undefined): void;
    /** the pointer moved: the latest operation, rendered on the next `show` (no render now) */
    move(operation: DragOperation): void;
    /** the overlay's element, once rendered: the core places it on each move */
    element(): HTMLElement | null;
}

/** Writes an overlay element's position for `operation`, outside the framework. */
function place(element: HTMLElement | null, operation: DragOperation): void {
    if (!element) return;
    const { left, top } = overlayStyle(operation);
    element.style.left = `${left}px`;
    element.style.top = `${top}px`;
}

/**
 * Drives `view` from the drags of `space` (only those of `scope`, when given); returns the stop,
 * which also shows nothing.
 */
export function followOverlay(
    space: DragSpace,
    view: OverlayView,
    scope?: string,
): () => void {
    const running = space.get("operation");
    if (running && (scope === undefined || running.scope === scope))
        view.show(running);
    const off = space.subscribe(
        (event) => {
            if (event.type === "drag-move") {
                view.move(event.operation);
                place(view.element(), event.operation);
            } else if (
                event.type === "drag-start" ||
                event.type === "drag-over"
            )
                view.show(event.operation);
            else view.show(undefined);
        },
        { scope },
    );
    return () => {
        off();
        view.show(undefined);
    };
}
