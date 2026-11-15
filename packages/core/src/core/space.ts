// The drag space (D4): one per document, created lazily on first use, or an isolated one from
// `createDragSpace`. It holds the operation in progress (one at a time) and the page-wide
// listeners. Registrations without an explicit space live in one registry and belong to the
// space of their element's *current* document, read when a drag starts: an element Dockable
// carries into a popout meets the droppables of the popout.
import type {
    DragId,
    DragListener,
    DragOperation,
    DragSource,
    DragSpaceEvent,
    DroppableEventType,
} from "./types";

/** The scope of a registration that names none. */
export const DEFAULT_SCOPE = "default";

/** A drag space: where draggables and droppables of one document (or an explicit group) meet. */
export interface DragSpace {
    /** the document its drags run in */
    readonly document: Document;
    /** the operation in progress, if any */
    getOperation(): DragOperation | undefined;
    /** listens to this space's drag events, optionally of one scope; returns the unsubscribe */
    subscribe(
        listener: DragListener,
        options?: { readonly scope?: string },
    ): () => void;
}

/** A registered element, as the space keeps it. @internal */
export interface Entry {
    readonly element: HTMLElement;
    /** the explicit space it registered in, if any */
    space: DragSpace | undefined;
}

/** A droppable, as the operation drives it. @internal */
export interface DroppableEntry extends Entry {
    readonly droppable: true;
    id(): DragId;
    data(): unknown;
    scope(): string;
    disabled(): boolean;
    accepts(source: DragSource): boolean;
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

/** What the operation in progress exposes to the space and the registrations. @internal */
export interface ActiveSession {
    readonly operation: DragOperation;
    /** the droppables changed (registered, removed, disabled): measure them again */
    invalidate(): void;
    readonly entry: Entry;
    cancel(): void;
}

interface SpaceState extends DragSpace {
    session: ActiveSession | undefined;
    readonly listeners: Set<{
        readonly listener: DragListener;
        readonly scope?: string;
    }>;
    /** the entries of an explicit space; a document's space reads the shared registry */
    readonly entries: Set<Entry> | undefined;
}

// created on first use, never on import (D4)
let spaces: WeakMap<Document, DragSpace> | undefined;
let implicit: Set<Entry> | undefined;

function makeSpace(doc: Document, entries?: Set<Entry>): DragSpace {
    const space: SpaceState = {
        document: doc,
        session: undefined,
        listeners: new Set(),
        entries,
        getOperation: () => space.session?.operation,
        subscribe(listener, options) {
            const record = { listener, scope: options?.scope };
            space.listeners.add(record);
            return () => {
                space.listeners.delete(record);
            };
        },
    };
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
    return space as SpaceState;
}

/** The space an entry meets others in now. @internal */
export function spaceOf(entry: Entry): DragSpace {
    return entry.space ?? getDragSpace(entry.element.ownerDocument);
}

/** The entries registered in `space`. @internal */
export function entriesOf(space: DragSpace): Entry[] {
    const own = stateOf(space).entries;
    if (own) return [...own];
    return [...(implicit ?? [])].filter(
        (entry) =>
            !entry.space && entry.element.ownerDocument === space.document,
    );
}

/** Adds an entry to its space's registry. @internal */
export function addEntry(entry: Entry): void {
    if (entry.space) stateOf(entry.space).entries?.add(entry);
    else {
        implicit ??= new Set();
        implicit.add(entry);
    }
}

/** Removes an entry from its space's registry (idempotent). @internal */
export function removeEntry(entry: Entry): void {
    if (entry.space) stateOf(entry.space).entries?.delete(entry);
    else implicit?.delete(entry);
}

/** Moves an entry to another explicit space, or to its document's (`undefined`). @internal */
export function moveEntry(entry: Entry, space: DragSpace | undefined): void {
    if (entry.space === space) return;
    removeEntry(entry);
    entry.space = space;
    addEntry(entry);
}

/** Tells `space`'s listeners of `event`, those of its scope or of none. @internal */
export function emit(space: DragSpace, event: DragSpaceEvent): void {
    for (const { listener, scope } of [...stateOf(space).listeners]) {
        if (scope === undefined || scope === event.operation.scope)
            listener(event);
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
