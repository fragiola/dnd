// What every adapter does when a part's element attaches, written once: register it in its drag
// space, let the part's state slot follow the registration, follow option changes with `update`
// (never a re-register), and undo it all when the element goes. A drag source also links its
// handle (`./handle-link`), and a handle links itself to its source and shows that source's
// state. The adapter keeps the options of the moment and renders the state; nothing else.
// Adapter-only (`@fragiola/dnd/adapter`): an app never needs it.
import {
    addHandle,
    addOwner,
    type HandleLink,
    type HandleOwner,
    handleIn,
} from "./handle-link";
import type { StateSlot } from "./slot";
import type { DraggableState, Registration } from "./types";

/** A part's element connected to the core. */
export interface Connection {
    /** passes the options of the moment to the registration */
    update(): void;
    /** unregisters the element and detaches its slot (once: the connection is then spent) */
    disconnect(): void;
}

/** A capability's `register*` function. */
export type Register<Options, State> = (
    element: HTMLElement,
    options: Options,
) => Registration<Options, State>;

/** The options of a drag source: the handle it is dragged by. */
export interface HandleOption {
    readonly handle?: HTMLElement | null;
}

/**
 * Registers `element` with the options of the moment (`options()`, read again on each
 * `update`), and makes `slot` follow the registration until `disconnect`.
 */
export function connectPart<Options, State>(
    element: HTMLElement,
    register: Register<Options, State>,
    options: () => Options,
    slot: StateSlot<State>,
): Connection {
    const registration = register(element, options());
    const detach = slot.attach(registration);
    return {
        update: () => registration.update(options()),
        disconnect() {
            registration.unregister();
            detach();
        },
    };
}

/**
 * Registers a drag source's `element` as {@link connectPart} does, with its handle in the core's
 * options: the one inside it now, then whichever handle links to it. Its handles show the
 * source's state through `slot`.
 */
export function connectSource<Options, State extends DraggableState>(
    element: HTMLElement,
    register: Register<Options & HandleOption, State>,
    options: () => Options,
    slot: StateSlot<State>,
): Connection {
    let handle = handleIn(element);
    const part = connectPart(
        element,
        register,
        () => ({ ...options(), handle }),
        slot,
    );
    const removeOwner = addOwner(element, {
        setHandle(next) {
            if (handle === next) return;
            handle = next;
            part.update();
        },
        source: slot,
    });
    return {
        update: part.update,
        disconnect() {
            removeOwner();
            part.disconnect();
        },
    };
}

/** A handle's element connected to its drag source. */
export interface HandleConnection {
    /** whether it is linked to a source now (a handle outside one has no effect) */
    readonly linked: boolean;
    /** unlinks it from its source (once) */
    disconnect(): void;
}

/**
 * Links a handle's `element` to the drag source around it, now or when that source attaches,
 * and makes `slot` follow the source's state while they are linked.
 */
export function connectHandle(
    element: HTMLElement,
    slot: StateSlot<DraggableState>,
): HandleConnection {
    let owner: HandleOwner | undefined;
    let detach: (() => void) | undefined;
    const link: HandleLink = {
        connect(next) {
            if (owner === next) return;
            if (owner) link.disconnect(owner);
            owner = next;
            detach = slot.attach(next.source);
            next.setHandle(element);
        },
        disconnect(gone) {
            if (owner !== gone) return;
            owner = undefined;
            detach?.();
            gone.setHandle(null);
        },
    };
    const remove = addHandle(element, link);
    return {
        get linked() {
            return owner !== undefined;
        },
        disconnect() {
            remove();
            if (owner) link.disconnect(owner);
        },
    };
}
