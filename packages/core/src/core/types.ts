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

/** A draggable's state, for rendering (`data-dnd-dragging`, `data-dnd-disabled`). */
export interface DraggableState {
    readonly dragging: boolean;
    readonly disabled: boolean;
}

/**
 * A droppable's state, for rendering: `over` an accepted source hovers it (`data-dnd-over`), a
 * refused or vetoed one does (`refused`, `data-dnd-refused`), `active` while a drag it would
 * accept runs (`data-dnd-active`).
 */
export interface DroppableState {
    readonly over: boolean;
    readonly active: boolean;
    readonly refused: boolean;
    readonly disabled: boolean;
}

// ─── the five verbs (the drag space is the engine) ─────────────────────────────────────────

/** The payload of a key that takes none. */
export type NoPayload = Record<never, never>;

/** The payload argument of a verb: optional when the payload has no required field. */
export type VerbArgs<Payload> = NoPayload extends Payload
    ? [payload?: Payload]
    : [payload: Payload];

/**
 * Why a verb said no: `not_found` (an unknown id, no drag), `refused` (the droppable's `accepts`,
 * its scope or its `disabled`), `vetoed` (a middleware said no), `middleware_error` (one threw).
 */
export interface DragError {
    readonly code: "not_found" | "refused" | "vetoed" | "middleware_error";
    readonly message?: string;
}

/** What `run` and `check` return: never a throw. */
export type CommandResult<Value> =
    | { readonly ok: true; readonly value: Value }
    | { readonly ok: false; readonly error: DragError };

/** Who would drop where: the payload of `can`/`check("drop")` and of a drop middleware's `ctx`. */
export interface DropPayload {
    readonly draggableId: DragId;
    readonly droppableId: DragId;
}

/** What `space.get(key, payload)` reads. */
export interface DragSpaceGetMap {
    /** the document the space's drags run in (where an overlay portals) */
    document: { payload: NoPayload; result: Document };
    /** the drag in progress, if any */
    operation: { payload: NoPayload; result: DragOperation | undefined };
    /** the ids of the draggables registered in the space */
    "draggable-ids": { payload: NoPayload; result: readonly DragId[] };
    /** the ids of the droppables registered in the space */
    "droppable-ids": { payload: NoPayload; result: readonly DragId[] };
    /** a draggable's state, undefined for an unknown id */
    "draggable-state-by": {
        payload: { readonly draggableId: DragId };
        result: DraggableState | undefined;
    };
    /** a droppable's state, undefined for an unknown id */
    "droppable-state-by": {
        payload: { readonly droppableId: DragId };
        result: DroppableState | undefined;
    };
}

/** What `space.is(key, payload)` asks: each question's payload. */
export interface DragSpaceIsMap {
    /** a drag runs in the space */
    dragging: NoPayload;
    /** that draggable is the one dragged */
    "draggable-dragging": { readonly draggableId: DragId };
    /** an accepted source hovers that droppable */
    "droppable-over": { readonly droppableId: DragId };
}

/** What `space.run(action, payload)` does: each engine action's payload and result. */
export interface DragSpaceRunMap {
    /** cancels the drag in progress (`not_found` when there is none) */
    cancel: { payload: NoPayload; result: NoPayload };
}

/** What `space.can`/`space.check(key, payload)` answer, as a dry run. */
export interface DragSpaceCheckMap {
    /** whether that draggable may drop on that droppable: its `accepts`, then the middleware */
    drop: { payload: DropPayload; result: DropPayload };
}

/** What a drop middleware sees. */
export interface DropContext {
    readonly command: "drop";
    readonly payload: DropPayload;
    readonly source: DragSource;
    readonly target: DragTarget;
    /** true for `can`/`check` and a hover: no side effects then */
    readonly dryRun: boolean;
}

/**
 * A middleware of `space.use`: synchronous, outermost (first added) first. It returns `next()`
 * to let the drop through, or `{ ok: false, error: { code: "vetoed" } }` to forbid it.
 */
export type DropMiddleware = (
    ctx: DropContext,
    next: () => CommandResult<DropPayload>,
) => CommandResult<DropPayload>;
