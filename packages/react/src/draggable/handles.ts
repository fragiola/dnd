// How a `DragHandle` and its draggable find each other without a context (D4): through the DOM.
// A draggable's element carries `data-dnd-part="draggable"`; a handle is linked to the closest
// one around it. Refs attach children first, so each side looks for the other when it attaches:
// a handle attached after its draggable finds it, and a draggable adopts the handles it already
// contains. A component boundary between them changes nothing.
import type { DraggableState } from "@fragiola/dnd/draggable";
import type { StateSource } from "../utils/useCoreState";

/** A draggable's element, as its handles see it. */
export interface HandleOwner {
    /** makes `handle` the only place a drag starts (null: the element again) */
    setHandle(handle: HTMLElement | null): void;
    /** the draggable's state, which its handle shows too */
    readonly source: StateSource<DraggableState>;
}

/** A mounted handle, as its draggable sees it. */
export interface HandleLink {
    connect(owner: HandleOwner): void;
    disconnect(owner: HandleOwner): void;
}

const DRAGGABLE = '[data-dnd-part~="draggable"]';

let owners: WeakMap<Element, HandleOwner> | undefined;
let links: WeakMap<Element, HandleLink> | undefined;
/** the handles linked to each owner, unlinked when it goes */
let linked: WeakMap<HandleOwner, Set<HandleLink>> | undefined;

function join(link: HandleLink, owner: HandleOwner): void {
    linked ??= new WeakMap();
    const set = linked.get(owner) ?? new Set();
    linked.set(owner, set);
    set.add(link);
    link.connect(owner);
}

/** The draggable element a handle belongs to: the closest one around it. */
function ownerElement(handle: Element): Element | null {
    return handle.parentElement?.closest(DRAGGABLE) ?? null;
}

/** The handle inside `element` that belongs to it (not to a draggable nested in it), if any. */
export function handleIn(element: HTMLElement): HTMLElement | null {
    for (const handle of element.querySelectorAll<HTMLElement>(
        '[data-dnd-part~="handle"]',
    )) {
        if (ownerElement(handle) === element) return handle;
    }
    return null;
}

/** Registers a draggable's element for its handles; returns the removal. */
export function addOwner(element: HTMLElement, owner: HandleOwner): () => void {
    owners ??= new WeakMap();
    links ??= new WeakMap();
    owners.set(element, owner);
    const handle = handleIn(element);
    const link = handle && links.get(handle);
    if (link) join(link, owner);
    return () => {
        if (owners?.get(element) === owner) owners.delete(element);
        for (const each of linked?.get(owner) ?? []) each.disconnect(owner);
        linked?.delete(owner);
    };
}

/** Registers a handle's element and links it to its draggable when there is one; the removal. */
export function addHandle(element: HTMLElement, link: HandleLink): () => void {
    owners ??= new WeakMap();
    links ??= new WeakMap();
    links.set(element, link);
    const around = ownerElement(element);
    const owner = around && owners.get(around);
    if (owner) join(link, owner);
    return () => {
        if (links?.get(element) === link) links.delete(element);
    };
}
