// The shared types of the core (D5): ids, geometry, the drag operation snapshot, events, the
// sensor options and the registration handle both capabilities return. Every field is readonly:
// a snapshot never changes, a new one replaces it.

/** The id of a draggable or a droppable, unique within its scope. */
export type DragId = string | number;

/** A point in viewport (client) coordinates, in px. */
export interface Point {
    readonly x: number;
    readonly y: number;
}

/** A box in viewport (client) coordinates, in px. */
export interface Rect {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
}

/** How a drag is driven: a pointer (mouse, touch, pen) or the keyboard. */
export type DragInput = "pointer" | "keyboard";

/**
 * Where an operation is: `dragging` while it moves, `dropping` while the drop callbacks run, and
 * `idle` once it ended without a drop (the snapshot a `drag-cancel` carries).
 */
export type DragPhase = "dragging" | "dropping" | "idle";

/** What is dragged: the draggable's id, type and data. */
export interface DragSource {
    readonly id: DragId;
    readonly type?: string;
    readonly data?: unknown;
}

/** Where it would drop: the hovered droppable that accepts the source. */
export interface DragTarget {
    readonly id: DragId;
    readonly data?: unknown;
}

/** The measured boxes of an operation. */
export interface DragRects {
    /** the source's box when the drag started */
    readonly source: Rect;
    /** the source's box where it is dragged now (`source` moved by `delta`) */
    readonly drag: Rect;
    /** the target's box, when there is a target */
    readonly target?: Rect;
}

/** A drag operation: an immutable snapshot, replaced on every change (D5). */
export interface DragOperation {
    readonly phase: DragPhase;
    /** the scope the source and its droppables share */
    readonly scope: string;
    readonly source: DragSource;
    /** the hovered droppable when it accepts the source; a refused hover is no target */
    readonly target?: DragTarget;
    /** the pointer now (for the keyboard: the centre of the dragged box) */
    readonly pointer: Point;
    /** how far the pointer moved since the drag started */
    readonly delta: Point;
    readonly rects: DragRects;
    readonly input: DragInput;
}

/** The page-wide event types `subscribe` reports. */
export type DragEventType =
    | "drag-start"
    | "drag-move"
    | "drag-over"
    | "drop"
    | "drag-cancel";

/** The event types a droppable reports to its own callbacks. */
export type DroppableEventType =
    | "drag-enter"
    | "drag-over"
    | "drag-leave"
    | "drop";

/** A drag event: its type, the operation at that moment and the input driving it. */
export interface DragSpaceEvent<Type extends string = DragEventType> {
    readonly type: Type;
    readonly operation: DragOperation;
    readonly input: DragInput;
}

/** A drag started (past the activation). */
export type DragStartEvent = DragSpaceEvent<"drag-start">;
/** The dragged box moved (at most once per animation frame). */
export type DragMoveEvent = DragSpaceEvent<"drag-move">;
/** The target changed (`operation.target` is the new one, or none). */
export type DragOverEvent = DragSpaceEvent<"drag-over">;
/** The drag was released; `operation.target` is where it dropped, if anywhere. */
export type DropEvent = DragSpaceEvent<"drop">;
/** The drag was cancelled: nothing dropped. */
export type DragCancelEvent = DragSpaceEvent<"drag-cancel">;
/** An event a droppable's callbacks receive. */
export type DroppableEvent<
    Type extends DroppableEventType = DroppableEventType,
> = DragSpaceEvent<Type>;

/** A page-wide listener of drag events. */
export type DragListener = (event: DragSpaceEvent) => void;

/**
 * When a press becomes a drag. Mouse and pen: once the pointer moved `distance` px (default 3).
 * Touch: once held `delay` ms (default 200) without moving more than `tolerance` px (default 5);
 * a touch that moves first scrolls the page.
 */
export interface Activation {
    readonly distance?: number;
    readonly delay?: number;
    readonly tolerance?: number;
}

/**
 * The keyboard: Space or Enter grabs and drops, Escape cancels, the arrows move the source by
 * `step` px (default 25) or, with `mode: "targets"`, to the next or previous droppable in reading
 * order.
 */
export interface KeyboardOptions {
    readonly step?: number;
    readonly mode?: "step" | "targets";
}

/** A droppable a collision strategy may pick: its id and its measured box. */
export interface CollisionCandidate {
    readonly id: DragId;
    readonly rect: Rect;
}

/** What a collision strategy reads: the pointer, the dragged box and the candidates. */
export interface CollisionInput<
    Candidate extends CollisionCandidate = CollisionCandidate,
> {
    readonly pointer: Point;
    readonly dragRect: Rect;
    readonly droppables: readonly Candidate[];
}

/** A pure function picking the droppable a drag is over, if any. */
export type CollisionStrategy = <Candidate extends CollisionCandidate>(
    input: CollisionInput<Candidate>,
) => Candidate | undefined;

/**
 * What `registerDraggable` and `registerDroppable` return: an external store of the
 * registration's state (stable snapshots, for `useSyncExternalStore`), and its lifecycle.
 */
export interface Registration<Options, State> {
    /** replaces the options (all of them: an option left out goes back to its default) */
    update(options: Options): void;
    /** removes the registration and its listeners; a second call does nothing */
    unregister(): void;
    /** the state now: the same object until a field changes */
    getState(): State;
    /** calls `listener` after each state change; returns the unsubscribe */
    subscribe(listener: () => void): () => void;
}
