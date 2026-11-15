// A drag source's registration, shared by every capability whose element is dragged (the
// draggable, a sortable item, a swappable item): its entry in the space, its pointer and keyboard
// sensors on the activator (the element or its handle), its tab stop, and its lifecycle (option
// updates, a move to another space, a cancel when it is disabled or goes). The capability adds
// its own rules through `hooks`.
import type { AutoScroll } from "./auto-scroll";
import { type Session, type SourceEntry, startDrag } from "./operation";
import type { SensorContext } from "./sensors/context";
import { bindKeyboard } from "./sensors/keyboard";
import { bindPointer } from "./sensors/pointer";
import { DEFAULT_SCOPE, type DragSpace, spaceOf, stateOf } from "./space";
import type { Store } from "./store";
import type {
    Activation,
    CollisionStrategy,
    DraggableState,
    DragId,
    DragSpaceEvent,
    KeyboardOptions,
    Registration,
} from "./types";

/** The options every drag source has. @internal */
export interface SourceOptions {
    readonly id: DragId;
    readonly type?: string;
    readonly data?: unknown;
    readonly scope?: string;
    readonly space?: DragSpace;
    readonly disabled?: boolean;
    readonly activation?: Activation;
    readonly keyboard?: KeyboardOptions;
    readonly handle?: HTMLElement | null;
    readonly autoScroll?: AutoScroll;
    readonly collision?: CollisionStrategy;
    readonly translate?: boolean;
}

/** What a capability adds to a drag source. @internal */
export interface SourceHooks {
    /** the drag events of the source, for its own callbacks */
    emit(event: DragSpaceEvent): void;
    /**
     * a drag of it is about to start in `space`: what the capability prepares (its preview); the
     * returned cleanup runs when the drag ends, or at once when it does not start
     */
    prepare?(space: DragSpace): () => void;
    /** where an arrow moves a keyboard drag in the "targets" mode (a sortable's slots) */
    step?: SensorContext["step"];
    /** the capability's own collision, over the option's */
    collision?(): CollisionStrategy | undefined;
}

/** A registered drag source: its registration, and its entry for the capability. @internal */
export interface Source<Options, State> extends Registration<Options, State> {
    readonly entry: SourceEntry;
    /** its drag in progress, if any */
    session(): Session | undefined;
}

/**
 * Registers `element` as a drag source in its document's space (or `options.space`), with
 * `store` holding its state (`dragging`, `disabled` and the capability's own). @internal
 */
export function registerSource<
    Options extends SourceOptions,
    State extends DraggableState,
>(
    element: HTMLElement,
    options: Options,
    store: Store<State>,
    hooks: SourceHooks,
): Source<Options, State> {
    let current = options;
    let registered = true;
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
        collision: () => hooks.collision?.() ?? current.collision,
        autoScroll: () => current.autoScroll,
        translate: () => current.translate !== false,
        emit: hooks.emit,
        dragging: (dragging) => store.set({ dragging } as Partial<State>),
    };
    const session = () => {
        const active = stateOf(spaceOf(entry)).session;
        return active?.entry === entry ? (active as Session) : undefined;
    };
    const canStart = () =>
        registered && !current.disabled && !stateOf(spaceOf(entry)).session;
    const context: SensorContext = {
        element,
        canStart,
        // a touch held past its delay may find the source disabled since its press
        start(origin, input) {
            if (!canStart()) return undefined;
            const space = spaceOf(entry);
            const cleanup = hooks.prepare?.(space);
            const started = startDrag(space, entry, origin, input);
            if (cleanup) {
                if (started) started.onEnd(cleanup);
                else cleanup();
            }
            return started;
        },
        dragging: () => store.get().dragging,
        activation: () => current.activation,
        keyboard: () => current.keyboard,
        step: hooks.step,
    };

    /** Listens on the activator: the handle when there is one, else the element. */
    function bind(): () => void {
        const handle = current.handle;
        const activator = handle ?? element;
        const unbindPointer = bindPointer(activator, context);
        const unbindKeyboard = bindKeyboard(activator, context);
        // the activator is a tab stop (D10): given one when it is not focusable already
        const tabStop =
            activator.tabIndex < 0 && !activator.hasAttribute("tabindex");
        if (tabStop) activator.tabIndex = 0;
        // a handle is where a touch drags, never scrolls (D7)
        const touchAction = handle?.style.touchAction;
        if (handle) handle.style.touchAction = "none";
        return () => {
            unbindPointer();
            unbindKeyboard();
            if (tabStop) activator.removeAttribute("tabindex");
            if (handle) handle.style.touchAction = touchAction ?? "";
        };
    }

    let remove = spaceOf(entry).adapter.register(entry);
    let unbind = bind();
    return {
        entry,
        session,
        update(next) {
            if (!registered) return;
            const rebind = next.handle !== current.handle;
            current = next;
            if (next.space !== entry.space) {
                remove();
                entry.space = next.space;
                remove = spaceOf(entry).adapter.register(entry);
            }
            store.set({ disabled: !!next.disabled } as Partial<State>);
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
