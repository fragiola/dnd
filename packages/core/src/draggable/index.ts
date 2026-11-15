// @fragiola/dnd/draggable: the draggable capability (D3). It imports only the shared core, never
// another capability, so an app that uses only draggables ships no droppable code.
import type { AutoScroll } from "../core/auto-scroll";
import { type SourceEntry, startDrag } from "../core/operation";
import type { SensorContext } from "../core/sensors/context";
import { bindKeyboard } from "../core/sensors/keyboard";
import { bindPointer } from "../core/sensors/pointer";
import { DEFAULT_SCOPE, type DragSpace, spaceOf, stateOf } from "../core/space";
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
    let registered = true;
    const store = createStore<DraggableState>({
        dragging: false,
        disabled: !!options.disabled,
    });
    const entry: SourceEntry = {
        kind: "draggable",
        element,
        space: options.space,
        id: () => current.id,
        state: store.get,
        source: () => ({
            id: current.id,
            type: current.type,
            data: current.data,
        }),
        scope: () => current.scope ?? DEFAULT_SCOPE,
        collision: () => current.collision,
        autoScroll: () => current.autoScroll,
        translate: () => current.translate !== false,
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
        dragging: (dragging) => store.set({ dragging }),
    };
    /** this draggable's drag in progress, if any */
    const session = () => {
        const active = stateOf(spaceOf(entry)).session;
        return active?.entry === entry ? active : undefined;
    };
    const canStart = () =>
        registered && !current.disabled && !stateOf(spaceOf(entry)).session;
    const context: SensorContext = {
        element,
        canStart,
        // a touch held past its delay may find the draggable disabled since its press
        start: (origin, input) =>
            canStart()
                ? startDrag(spaceOf(entry), entry, origin, input)
                : undefined,
        dragging: () => store.get().dragging,
        activation: () => current.activation,
        keyboard: () => current.keyboard,
    };

    /** Listens on the activator: the handle when there is one, else the element. */
    function bind(): () => void {
        const handle = current.handle;
        const activator = handle ?? element;
        const unbindPointer = bindPointer(activator, context);
        const unbindKeyboard = bindKeyboard(activator, context);
        // a handle is where a touch drags, never scrolls (D7)
        const touchAction = handle?.style.touchAction;
        if (handle) handle.style.touchAction = "none";
        return () => {
            unbindPointer();
            unbindKeyboard();
            if (handle) handle.style.touchAction = touchAction ?? "";
        };
    }

    let remove = spaceOf(entry).adapter.register(entry);
    let unbind = bind();
    return {
        update(next) {
            if (!registered) return;
            const rebind = next.handle !== current.handle;
            current = next;
            if (next.space !== entry.space) {
                remove();
                entry.space = next.space;
                remove = spaceOf(entry).adapter.register(entry);
            }
            store.set({ disabled: !!next.disabled });
            if (next.disabled) session()?.cancel();
            if (rebind) {
                unbind();
                unbind = bind();
            }
        },
        unregister() {
            if (!registered) return;
            registered = false;
            session()?.cancel();
            unbind();
            remove();
        },
        getState: store.get,
        subscribe: store.subscribe,
    };
}
