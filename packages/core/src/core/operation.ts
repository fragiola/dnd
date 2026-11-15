// The drag lifecycle (D5, D8): one operation per space. It measures at the start and again after
// a scroll or a resize (never per frame), runs the collision, tells the droppables they are
// entered, hovered and left, reports the events and writes the source's `translate`, all once
// per animation frame through the document's `defaultView`. A drop runs the app's callbacks
// first, and only then clears `translate` and the states.
import type { AutoScroll } from "./auto-scroll";
import { pointerWithin } from "./collision";
import { guarded, listen, measure } from "./dom";
import {
    type ActiveSession,
    accepts,
    askDrop,
    type DraggableEntry,
    type DragSpace,
    type DroppableEntry,
    emit,
    entriesOf,
    stateOf,
} from "./space";
import type {
    CollisionCandidate,
    CollisionStrategy,
    DragEventType,
    DragInput,
    DragOperation,
    DragPhase,
    DragSpaceEvent,
    DroppableEventType,
    Point,
    Rect,
} from "./types";
import { createWriter, restRect } from "./writer";

/** A draggable, as the operation drives it. @internal */
export interface SourceEntry extends DraggableEntry {
    collision(): CollisionStrategy | undefined;
    autoScroll(): AutoScroll | undefined;
    /** whether the source itself follows the pointer (`translate`) */
    translate(): boolean;
    /** the draggable's own callbacks */
    emit(event: DragSpaceEvent): void;
    dragging(on: boolean): void;
}

/** A measured droppable of the operation's scope. @internal */
export interface Candidate extends CollisionCandidate {
    readonly entry: DroppableEntry;
    readonly accepted: boolean;
}

/** The operation in progress, as its sensor drives it. @internal */
export interface Session extends ActiveSession {
    operation: DragOperation;
    /** the pointer moved: the next frame follows it */
    move(pointer: Point): void;
    drop(): void;
    /** the droppables that accept the source, as measured */
    targets(): readonly Candidate[];
    /** the droppable under the drag after the last frame */
    hovered(): Candidate | undefined;
    /** runs `cleanup` once the operation ended, after the app's callbacks (now, if it has) */
    onEnd(...cleanup: (() => void)[]): void;
}

/**
 * Starts a drag of `entry` in `space` from `origin`, or nothing when one is in progress there (or
 * app code threw at its start, which cancels it). Every app callback runs guarded: a throw is
 * reported asynchronously and cancels the drag at the end of that frame, so the space is never
 * left stuck. @internal
 */
export function startDrag(
    space: DragSpace,
    entry: SourceEntry,
    origin: Point,
    input: DragInput,
): Session | undefined {
    const state = stateOf(space);
    if (state.session) return undefined;
    const doc = stateOf(space).document;
    const view = doc.defaultView;
    const element = entry.element;
    const scope = entry.scope();
    const source = entry.source();
    const writer = entry.translate() ? createWriter(element) : undefined;
    const scroller = entry.autoScroll()?.start(element);
    const start = measure(element);
    /** the source's box now, without its `translate` (it moves when its container scrolls) */
    let base: Rect = start;
    let pointer = origin;
    let accepting: Candidate[] = [];
    let refusing: Candidate[] = [];
    let hovered: Candidate | undefined;
    let target: Candidate | undefined;
    /** whether the hovered droppable takes the drop: its `accepts`, then the middleware */
    let allowed = false;
    /** the droppables met, and whether each accepts the source (asked once) */
    const met = new Map<DroppableEntry, boolean>();
    // measured again on the first frame too: the app's render of the drag start (placeholders,
    // active droppables) may have moved things
    let dirty = true;
    let frameId: number | undefined;
    let done = false;
    let ended = false;
    const cleanups: (() => void)[] = [];

    function collect(): void {
        const next: Candidate[] = [];
        const refused: Candidate[] = [];
        for (const other of entriesOf(space)) {
            if (
                other.kind !== "droppable" ||
                other.scope() !== scope ||
                other.disabled()
            )
                continue;
            let accepted = met.get(other);
            if (accepted === undefined) {
                accepted = accepts(other, entry);
                met.set(other, accepted);
                other.start(accepted);
            }
            (accepted ? next : refused).push({
                id: other.id(),
                rect: other.rect?.() ?? restRect(other.element),
                entry: other,
                accepted,
            });
        }
        // gone or disabled since: back to rest, and no longer hovered
        for (const other of met.keys()) {
            if (
                next.some((candidate) => candidate.entry === other) ||
                refused.some((candidate) => candidate.entry === other)
            )
                continue;
            met.delete(other);
            other.end();
            if (hovered?.entry === other) hovered = undefined;
        }
        accepting = next;
        refusing = refused;
    }

    function snapshot(phase: DragPhase, delta: Point, drag: Rect) {
        return {
            phase,
            scope,
            source,
            target: target && { id: target.id, data: target.entry.data() },
            pointer,
            delta,
            rects: { source: start, drag, target: target?.rect },
            input,
        };
    }

    function event<Type extends DragEventType | DroppableEventType>(
        type: Type,
    ): DragSpaceEvent<Type> {
        return { type, operation: session.operation, input };
    }

    /** whether app code threw during the drag: the drag is cancelled at the next safe point */
    let broken = false;
    /** runs app code; a throw is reported and breaks the drag */
    function app(call: () => void): void {
        if (!guarded(view, call)) broken = true;
    }

    function send(type: DragEventType): DragSpaceEvent<DragEventType> {
        const sent = event(type);
        app(() => entry.emit(sent));
        if (!emit(space, sent)) broken = true;
        return sent;
    }

    /** What a collision changed, for {@link tell}. */
    interface Located {
        readonly hit: Candidate | undefined;
        readonly entered: boolean;
        readonly left: Candidate | undefined;
        readonly leftAllowed: boolean;
        /** whether the target is another droppable (or none) than before */
        readonly changed: boolean;
    }

    /** Runs the collision for the pointer now: the hovered droppable, the target, the snapshot. */
    function locate(): Located {
        const delta = { x: pointer.x - origin.x, y: pointer.y - origin.y };
        const drag = { ...start, x: start.x + delta.x, y: start.y + delta.y };
        const collide = entry.collision() ?? pointerWithin;
        // an accepting droppable first (a column around a card that refuses the drag), a refused
        // one only to mark it refused
        const hit =
            collide({ pointer, dragRect: drag, droppables: accepting }) ??
            collide({ pointer, dragRect: drag, droppables: refusing });
        const before = target;
        const entered = hit?.entry !== hovered?.entry;
        const left = entered ? hovered : undefined;
        const leftAllowed = allowed;
        // a new target: the middleware is asked again, as a dry run; a veto marks it refused
        if (entered)
            allowed =
                !!hit?.accepted && askDrop(space, source, hit.entry, true).ok;
        hovered = hit;
        target = allowed ? hit : undefined;
        session.operation = snapshot("dragging", delta, drag);
        return {
            hit,
            entered,
            left,
            leftAllowed,
            changed: target?.entry !== before?.entry,
        };
    }

    /** Tells the droppables of a collision that they are left, entered or hovered. */
    function tell({ hit, entered, left, leftAllowed }: Located): void {
        if (left)
            app(() =>
                left.entry.hover(
                    "drag-leave",
                    event("drag-leave"),
                    leftAllowed,
                ),
            );
        if (hit)
            app(() =>
                hit.entry.hover(
                    entered ? "drag-enter" : "drag-over",
                    event(entered ? "drag-enter" : "drag-over"),
                    allowed,
                ),
            );
    }

    function frame(): void {
        if (frameId !== undefined) view?.cancelAnimationFrame(frameId);
        frameId = undefined;
        if (dirty) {
            dirty = false;
            collect();
            const now = measure(element);
            base = {
                ...now,
                x: now.x - (writer?.x ?? 0),
                y: now.y - (writer?.y ?? 0),
            };
        }
        const located = locate();
        tell(located);
        // the page hears of a target change only: the start target came with `drag-start`
        if (located.changed) send("drag-over");
        send("drag-move");
        // a callback threw: the drag ends here, cleanly, as a cancel
        if (broken) {
            session.cancel();
            return;
        }
        scroller?.move(pointer);
        // under the pointer wherever its container scrolled to
        const delta = session.operation.delta;
        writer?.write(start.x - base.x + delta.x, start.y - base.y + delta.y);
    }

    function schedule(): void {
        if (done || frameId !== undefined) return;
        if (view) frameId = view.requestAnimationFrame(frame);
        else frame();
    }

    function runCleanups(): void {
        for (const cleanup of cleanups.splice(0)) cleanup();
    }

    function finish(): void {
        if (frameId !== undefined) view?.cancelAnimationFrame(frameId);
        frameId = undefined;
        scroller?.stop();
        writer?.clear();
        state.session = undefined;
        for (const other of met.keys()) other.end();
        entry.dragging(false);
        ended = true;
        runCleanups();
    }

    const session: Session = {
        entry,
        operation: snapshot("dragging", { x: 0, y: 0 }, start),
        onEnd(...cleanup) {
            cleanups.push(...cleanup);
            if (ended) runCleanups();
        },
        move(next) {
            if (done || (next.x === pointer.x && next.y === pointer.y)) return;
            pointer = next;
            schedule();
        },
        invalidate() {
            if (done) return;
            dirty = true;
            schedule();
        },
        targets: () => accepting,
        hovered: () => hovered,
        drop() {
            if (done) return;
            if (frameId !== undefined) frame();
            // that last frame's app code threw: the drag was cancelled, nothing drops
            if (done) return;
            done = true;
            // a refused hover never reports a drop (D5); the middleware runs for real, first, and
            // a veto drops nowhere: no onDrop, and onDragEnd sees no target
            const into =
                target &&
                met.has(target.entry) &&
                askDrop(space, source, target.entry, false).ok
                    ? target
                    : undefined;
            if (!into) target = undefined;
            session.operation = {
                ...session.operation,
                phase: "dropping",
                target: into && session.operation.target,
                rects: { ...session.operation.rects, target: into?.rect },
            };
            const dropped = event("drop");
            if (into) app(() => into.entry.drop(dropped));
            app(() => entry.emit(dropped));
            emit(space, dropped);
            finish();
        },
        cancel() {
            if (done) return;
            done = true;
            session.operation = { ...session.operation, phase: "idle" };
            send("drag-cancel");
            finish();
        },
    };
    state.session = session;
    collect();
    session.onEnd(
        listen(doc, "scroll", session.invalidate, {
            capture: true,
            passive: true,
        }),
    );
    if (view) session.onEnd(listen(view, "resize", session.invalidate));
    entry.dragging(true);
    // the place it starts from is resolved now, not on the first frame: `drag-start` carries it
    // as its target (no `drag-over` repeats it), and a key pressed before that frame (the
    // keyboard's first arrow) moves on from it
    const located = locate();
    send("drag-start");
    // a throwing `onDragStart` (or listener, or the start droppable's `onDragEnter`) cancels the
    // drag before it follows anything
    if (!broken) tell(located);
    if (broken) {
        session.cancel();
        return undefined;
    }
    schedule();
    return session;
}
