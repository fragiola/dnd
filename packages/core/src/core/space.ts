// The drag space (D4, D5): one per document, created lazily on first use, or an isolated one from
// `createDragSpace`. It is the library's engine (there is no domain model: the app's data stays
// the app's), so it speaks the five verbs of the Fragiola model API (`run`, `can`, `check`,
// `get`, `is`) with `use` (drop middleware) and `subscribe`; what only an adapter calls is under
// `adapter`. It holds the operation in progress (one at a time) and the page-wide listeners.
// Registrations without an explicit space live in one registry and belong to the space of their
// element's *current* document, read when a drag starts: an element Dockable carries into a
// popout meets the droppables of the popout.
import { guarded } from "./dom";
import type {
    CommandResult,
    DraggableState,
    DragId,
    DragListener,
    DragOperation,
    DragSource,
    DragSpaceCheckMap,
    DragSpaceEvent,
    DragSpaceGetMap,
    DragSpaceIsMap,
    DragSpaceRunMap,
    DropMiddleware,
    DropPayload,
    DroppableEventType,
    DroppableState,
    VerbArgs,
} from "./types";

/** The scope of a registration that names none. */
export const DEFAULT_SCOPE = "default";

/** A registered element, as the space keeps it. */
interface EntryBase {
    readonly element: HTMLElement;
    /** the explicit space it registered in, if any */
    space: DragSpace | undefined;
    id(): DragId;
    scope(): string;
}

/** A draggable, as the space keeps it (for adapters). */
export interface DraggableEntry extends EntryBase {
    readonly kind: "draggable";
    source(): DragSource;
    state(): DraggableState;
}

/** A droppable, as the space and the operation drive it (for adapters). */
export interface DroppableEntry extends EntryBase {
    readonly kind: "droppable";
    data(): unknown;
    disabled(): boolean;
    accepts(source: DragSource): boolean;
    state(): DroppableState;
    /** a drag it could meet began; `accepted` says whether it would take the source */
    start(accepted: boolean): void;
    hover(
        type: Exclude<DroppableEventType, "drop">,
        event: DragSpaceEvent<DroppableEventType>,
        accepted: boolean,
    ): void;
    drop(event: DragSpaceEvent<"drop">): void;
    /** the drag ended: back to rest */
    end(): void;
}

/** What an adapter registers in a space. */
export type DragEntry = DraggableEntry | DroppableEntry;

/** What only an adapter calls (`registerDraggable` and `registerDroppable` do). */
export interface DragSpaceAdapter {
    /** adds an entry to the space; returns its removal (idempotent) */
    register(entry: DragEntry): () => void;
}

/** A drag space: the engine where draggables and droppables of one document (or a group) meet. */
export interface DragSpace {
    /** does an engine action: `cancel` */
    run<K extends keyof DragSpaceRunMap>(
        key: K,
        ...args: VerbArgs<DragSpaceRunMap[K]["payload"]>
    ): CommandResult<DragSpaceRunMap[K]["result"]>;
    /** whether it would be allowed (`drop`): `check(...).ok` */
    can<K extends keyof DragSpaceCheckMap>(
        key: K,
        payload: DragSpaceCheckMap[K]["payload"],
    ): boolean;
    /** what would happen (`drop`), as a dry run through the middleware, with the reason when not */
    check<K extends keyof DragSpaceCheckMap>(
        key: K,
        payload: DragSpaceCheckMap[K]["payload"],
    ): CommandResult<DragSpaceCheckMap[K]["result"]>;
    /** reads a fact of the space */
    get<K extends keyof DragSpaceGetMap>(
        key: K,
        ...args: VerbArgs<DragSpaceGetMap[K]["payload"]>
    ): DragSpaceGetMap[K]["result"];
    /** asks a yes-or-no question */
    is<K extends keyof DragSpaceIsMap>(
        key: K,
        ...args: VerbArgs<DragSpaceIsMap[K]>
    ): boolean;
    /** adds a drop middleware; returns its removal */
    use(middleware: DropMiddleware): () => void;
    /** listens to this space's drag events, optionally of one scope; returns the unsubscribe */
    subscribe(
        listener: DragListener,
        options?: { readonly scope?: string },
    ): () => void;
    readonly adapter: DragSpaceAdapter;
}

/** What the operation in progress exposes to the space and the registrations. @internal */
export interface ActiveSession {
    readonly operation: DragOperation;
    /** the droppables changed (registered, removed, disabled): measure them again */
    invalidate(): void;
    readonly entry: DraggableEntry;
    cancel(): void;
}

interface SpaceState {
    readonly document: Document;
    session: ActiveSession | undefined;
    readonly listeners: Set<{
        readonly listener: DragListener;
        readonly scope?: string;
    }>;
    readonly middleware: DropMiddleware[];
    /** the entries of an explicit space; a document's space reads the shared registry */
    readonly entries: Set<DragEntry> | undefined;
}

// created on first use, never on import (D4)
let spaces: WeakMap<Document, DragSpace> | undefined;
let implicit: Set<DragEntry> | undefined;
let states: WeakMap<DragSpace, SpaceState> | undefined;

const fail = (
    code: "not_found" | "refused",
    message: string,
): CommandResult<never> => ({ ok: false, error: { code, message } });

function makeSpace(doc: Document, entries?: Set<DragEntry>): DragSpace {
    const state: SpaceState = {
        document: doc,
        session: undefined,
        listeners: new Set(),
        middleware: [],
        entries,
    };
    const find = <Kind extends DragEntry["kind"]>(kind: Kind, id: unknown) =>
        entriesOf(space).find(
            (entry) => entry.kind === kind && entry.id() === id,
        ) as Extract<DragEntry, { kind: Kind }> | undefined;
    const ids = (kind: DragEntry["kind"]) =>
        entriesOf(space)
            .filter((entry) => entry.kind === kind)
            .map((entry) => entry.id());
    // the registries are plain switches: one key, one case
    type Payload = Partial<DropPayload>;
    const space: DragSpace = {
        run() {
            const session = state.session;
            if (!session) return fail("not_found", "No drag is in progress.");
            session.cancel();
            return { ok: true, value: {} };
        },
        can: (key, payload) => space.check(key, payload).ok,
        check(_key, payload) {
            // ids are unique within a scope only: the pair that shares one, if any
            const all = entriesOf(space);
            const of = <Kind extends DragEntry["kind"]>(
                kind: Kind,
                id: unknown,
            ) =>
                all.filter(
                    (entry): entry is Extract<DragEntry, { kind: Kind }> =>
                        entry.kind === kind && entry.id() === id,
                );
            const sources = of("draggable", payload.draggableId);
            const targets = of("droppable", payload.droppableId);
            const source =
                sources.find((each) =>
                    targets.some((other) => other.scope() === each.scope()),
                ) ?? sources[0];
            const target =
                targets.find((each) => each.scope() === source?.scope()) ??
                targets[0];
            if (!source || !target)
                return fail("not_found", "No such draggable or droppable.");
            if (
                target.scope() !== source.scope() ||
                target.disabled() ||
                !accepts(target, source.source())
            )
                return fail("refused", "The droppable does not take it.");
            return askDrop(space, source.source(), target, true);
        },
        get(key, ...[payload]) {
            const { draggableId, droppableId } = (payload ?? {}) as Payload;
            switch (key) {
                case "document":
                    return state.document;
                case "operation":
                    return state.session?.operation;
                case "draggable-ids":
                    return ids("draggable");
                case "droppable-ids":
                    return ids("droppable");
                case "draggable-state-by":
                    return find("draggable", draggableId)?.state();
                default:
                    return find("droppable", droppableId)?.state();
            }
        },
        is(key, ...[payload]) {
            const { draggableId, droppableId } = (payload ?? {}) as Payload;
            switch (key) {
                case "dragging":
                    return !!state.session;
                case "draggable-dragging":
                    return state.session?.entry.id() === draggableId;
                default:
                    return !!find("droppable", droppableId)?.state().over;
            }
        },
        use(middleware) {
            state.middleware.push(middleware);
            return () => {
                const index = state.middleware.indexOf(middleware);
                if (index >= 0) state.middleware.splice(index, 1);
            };
        },
        subscribe(listener, options) {
            const record = { listener, scope: options?.scope };
            state.listeners.add(record);
            return () => {
                state.listeners.delete(record);
            };
        },
        adapter: {
            register(entry) {
                implicit ??= new Set();
                const set = state.entries ?? implicit;
                set.add(entry);
                return () => {
                    set.delete(entry);
                };
            },
        },
    };
    states ??= new WeakMap();
    states.set(space, state);
    return space;
}

/** The drag space of `document`, created on first use. */
export function getDragSpace(doc: Document): DragSpace {
    spaces ??= new WeakMap();
    let space = spaces.get(doc);
    if (!space) {
        space = makeSpace(doc);
        spaces.set(doc, space);
    }
    return space;
}

/** Options of {@link createDragSpace}. */
export interface CreateDragSpaceOptions {
    /** the document its drags run in */
    readonly document: Document;
}

/** An isolated drag space: only registrations given it as `space` meet in it. */
export function createDragSpace(options: CreateDragSpaceOptions): DragSpace {
    return makeSpace(options.document, new Set());
}

/** A space's internal state. @internal */
export function stateOf(space: DragSpace): SpaceState {
    return states?.get(space) as SpaceState;
}

/** The space an entry meets others in now. @internal */
export function spaceOf(entry: DragEntry): DragSpace {
    return entry.space ?? getDragSpace(entry.element.ownerDocument);
}

/** The entries registered in `space`. @internal */
export function entriesOf(space: DragSpace): DragEntry[] {
    const { entries, document: doc } = stateOf(space);
    if (entries) return [...entries];
    return [...(implicit ?? [])].filter(
        (entry) => !entry.space && entry.element.ownerDocument === doc,
    );
}

/**
 * Tells `space`'s listeners of `event`, those of its scope or of none; false when one threw (it
 * is reported, and the others still hear it). @internal
 */
export function emit(space: DragSpace, event: DragSpaceEvent): boolean {
    const { listeners, document: doc } = stateOf(space);
    let ok = true;
    for (const { listener, scope } of [...listeners]) {
        if (scope === undefined || scope === event.operation.scope)
            ok = guarded(doc.defaultView, () => listener(event)) && ok;
    }
    return ok;
}

/** Whether `target` takes `source`, by its `accepts`; one that throws refuses. @internal */
export function accepts(target: DroppableEntry, source: DragSource): boolean {
    let accepted = false;
    guarded(target.element.ownerDocument.defaultView, () => {
        accepted = target.accepts(source);
    });
    return accepted;
}

/**
 * Asks the middleware chain whether `source` may drop on `target`, outermost first; a dry run
 * for `can`/`check` and a hover, the real one on a release. Never throws. @internal
 */
export function askDrop(
    space: DragSpace,
    source: DragSource,
    target: DroppableEntry,
    dryRun: boolean,
): CommandResult<DropPayload> {
    const chain = [...stateOf(space).middleware];
    const payload = { draggableId: source.id, droppableId: target.id() };
    const ctx = {
        command: "drop" as const,
        payload,
        source,
        target: { id: payload.droppableId, data: target.data() },
        dryRun,
    };
    const next = (index: number): CommandResult<DropPayload> => {
        const middleware = chain[index];
        return middleware
            ? middleware(ctx, () => next(index + 1))
            : { ok: true, value: payload };
    };
    try {
        return next(0);
    } catch (error) {
        return {
            ok: false,
            error: { code: "middleware_error", message: String(error) },
        };
    }
}

/** Where {@link subscribe} listens: an explicit space, or a document's. */
export type SubscribeOptions = {
    /** only the events of this scope */
    readonly scope?: string;
} & ({ readonly space: DragSpace } | { readonly document: Document });

/**
 * Listens to every drag of a document (or of an explicit space), optionally of one scope: the
 * only page-wide API (D4). Returns the unsubscribe.
 */
export function subscribe(
    listener: DragListener,
    options: SubscribeOptions,
): () => void {
    const space =
        "space" in options ? options.space : getDragSpace(options.document);
    return space.subscribe(listener, { scope: options.scope });
}
