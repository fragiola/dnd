// @fragiola/dnd/droppable: the droppable capability (D3). It imports only the shared core, never
// another capability, so an app that uses only droppables ships no draggable code.
import {
    addEntry,
    DEFAULT_SCOPE,
    type DragSpace,
    type DroppableEntry,
    moveEntry,
    removeEntry,
    spaceOf,
    stateOf,
} from "../core/space";
import { createStore } from "../core/store";
import type {
    DragId,
    DragSource,
    DroppableEvent,
    Registration,
} from "../core/types";

/** Options of {@link registerDroppable}. */
export interface DroppableOptions {
    /** unique within its scope */
    readonly id: DragId;
    /** anything the app wants back in the events (`operation.target.data`) */
    readonly data?: unknown;
    /** only draggables of the same scope meet it (default: the document's default scope) */
    readonly scope?: string;
    /** an explicit space from `createDragSpace` (default: the element's document's) */
    readonly space?: DragSpace;
    /**
     * what it takes (default: everything): a list of draggable `type`s, or a predicate. A refused
     * source hovering it marks it `refused` and never drops.
     */
    readonly accepts?: readonly string[] | ((source: DragSource) => boolean);
    /** a disabled droppable is never a target */
    readonly disabled?: boolean;
    readonly onDragEnter?: (event: DroppableEvent<"drag-enter">) => void;
    /** the drag moved over it (once per frame) */
    readonly onDragOver?: (event: DroppableEvent<"drag-over">) => void;
    readonly onDragLeave?: (event: DroppableEvent<"drag-leave">) => void;
    /** an accepted source was released over it, before the draggable's `onDragEnd` */
    readonly onDrop?: (event: DroppableEvent<"drop">) => void;
}

/**
 * A droppable's state, for rendering: `over` an accepted source hovers it (`data-dnd-over`), a
 * refused one does (`refused`, `data-dnd-refused`), `active` while a drag it would accept runs
 * (`data-dnd-active`).
 */
export interface DroppableState {
    readonly over: boolean;
    readonly active: boolean;
    readonly refused: boolean;
    readonly disabled: boolean;
}

/** What {@link registerDroppable} returns. */
export type DroppableRegistration = Registration<
    DroppableOptions,
    DroppableState
>;

/**
 * Makes `element` a drop target in its document's drag space (or the `space` given). Call
 * `unregister` when the element goes away.
 */
export function registerDroppable(
    element: HTMLElement,
    options: DroppableOptions,
): DroppableRegistration {
    let current = options;
    let registered = true;
    const store = createStore<DroppableState>({
        over: false,
        active: false,
        refused: false,
        disabled: !!options.disabled,
    });
    const entry: DroppableEntry = {
        droppable: true,
        element,
        space: options.space,
        id: () => current.id,
        data: () => current.data,
        scope: () => current.scope ?? DEFAULT_SCOPE,
        disabled: () => !!current.disabled,
        accepts(source) {
            const accepts = current.accepts;
            if (!accepts) return true;
            if (typeof accepts === "function") return accepts(source);
            return source.type !== undefined && accepts.includes(source.type);
        },
        start: (active) => store.set({ active }),
        hover(type, event, accepted) {
            const on = type !== "drag-leave";
            store.set({ over: on && accepted, refused: on && !accepted });
            if (type === "drag-enter")
                current.onDragEnter?.(event as DroppableEvent<"drag-enter">);
            else if (type === "drag-over")
                current.onDragOver?.(event as DroppableEvent<"drag-over">);
            else current.onDragLeave?.(event as DroppableEvent<"drag-leave">);
        },
        drop: (event) => current.onDrop?.(event),
        end: () => store.set({ over: false, active: false, refused: false }),
    };
    /** a drag in progress measures the droppables again */
    const invalidate = () => stateOf(spaceOf(entry)).session?.invalidate();
    addEntry(entry);
    invalidate();
    return {
        update(next) {
            if (!registered) return;
            const moved = next.space !== entry.space;
            if (moved) invalidate();
            current = next;
            moveEntry(entry, next.space);
            store.set({ disabled: !!next.disabled });
            invalidate();
        },
        unregister() {
            if (!registered) return;
            registered = false;
            removeEntry(entry);
            invalidate();
        },
        getState: store.get,
        subscribe: store.subscribe,
    };
}
