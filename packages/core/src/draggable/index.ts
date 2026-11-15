// @fragiola/dnd/draggable: the draggable capability (D3). It imports only the shared core, never
// another capability, so an app that uses only draggables ships no droppable code.
import type { AutoScroll } from "../core/auto-scroll";
import { registerSource } from "../core/source";
import type { DragSpace } from "../core/space";
import { createStore } from "../core/store";

export type { DraggableState } from "../core/types";

import type {
    Activation,
    CollisionStrategy,
    DragCancelEvent,
    DraggableState,
    DragId,
    DragMoveEvent,
    DragStartEvent,
    DropEvent,
    KeyboardOptions,
    Registration,
} from "../core/types";

/** Options of {@link registerDraggable}. */
export interface DraggableOptions {
    /** unique within its scope */
    readonly id: DragId;
    /** what droppables with an `accepts` list match */
    readonly type?: string;
    /** anything the app wants back in the events */
    readonly data?: unknown;
    /** only droppables of the same scope meet it (default: the document's default scope) */
    readonly scope?: string;
    /** an explicit space from `createDragSpace` (default: the element's document's) */
    readonly space?: DragSpace;
    readonly disabled?: boolean;
    /** when a press becomes a drag (default: 3 px; touch: 200 ms within 5 px) */
    readonly activation?: Activation;
    readonly keyboard?: KeyboardOptions;
    /** the only element a drag starts from, inside the draggable (a drag handle) */
    readonly handle?: HTMLElement | null;
    /** opt-in auto-scroll of the nearest scroll containers (`autoScroll()`) */
    readonly autoScroll?: AutoScroll;
    /** how the target is found (default: `pointerWithin`) */
    readonly collision?: CollisionStrategy;
    /**
     * whether the element itself follows the pointer through its `translate` (default true);
     * false when a drag overlay shows it instead
     */
    readonly translate?: boolean;
    readonly onDragStart?: (event: DragStartEvent) => void;
    readonly onDragMove?: (event: DragMoveEvent) => void;
    /** the drag was released, on a target or not (`event.operation.target`) */
    readonly onDragEnd?: (event: DropEvent) => void;
    readonly onDragCancel?: (event: DragCancelEvent) => void;
}

/** What {@link registerDraggable} returns. */
export type DraggableRegistration = Registration<
    DraggableOptions,
    DraggableState
>;

/**
 * Makes `element` draggable, by pointer and keyboard, in its document's drag space (or the
 * `space` given). Call `unregister` when the element goes away.
 */
export function registerDraggable(
    element: HTMLElement,
    options: DraggableOptions,
): DraggableRegistration {
    let current = options;
    const store = createStore<DraggableState>({
        dragging: false,
        disabled: !!options.disabled,
    });
    const source = registerSource(element, options, store, {
        emit(event) {
            if (event.type === "drag-start")
                current.onDragStart?.(event as DragStartEvent);
            else if (event.type === "drag-move")
                current.onDragMove?.(event as DragMoveEvent);
            else if (event.type === "drop")
                current.onDragEnd?.(event as DropEvent);
            else if (event.type === "drag-cancel")
                current.onDragCancel?.(event as DragCancelEvent);
        },
    });
    return {
        getState: source.getState,
        subscribe: source.subscribe,
        unregister: source.unregister,
        update(next) {
            current = next;
            source.update(next);
        },
    };
}
