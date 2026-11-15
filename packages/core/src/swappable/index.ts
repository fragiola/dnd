// @fragiola/dnd/swappable: the swappable capability (S3). It imports only the shared core, never
// another capability. A swappable item is both a drag source and a drop target of its space: an
// item of a group that accepts the dragged one (its own group always) is a swap target, and the
// middleware sees a swap as a drop of the item on the target (`{ draggableId, droppableId }`).
// The preview moves only the target, into the source's place, by its `translate`, and marks it
// `data-dnd-swap-target`: both written by the core, so a preview never renders React. The app
// applies `onSwap` to its own data (`swapItems`, `swapBetween`).
import type { AutoScroll } from "../core/auto-scroll";
import type { Session, SourceEntry } from "../core/operation";
import { registerSource } from "../core/source";
import {
    DEFAULT_SCOPE,
    type DragSpace,
    type DroppableEntry,
    spaceOf,
    stateOf,
} from "../core/space";
import { createStore } from "../core/store";
import type {
    Activation,
    DraggableState,
    DragId,
    DragInput,
    DragOperation,
    DragSpaceEvent,
    Point,
    Rect,
    Registration,
} from "../core/types";
import { createWriter, type Writer } from "../core/writer";
import type { SwapPosition } from "./helpers";

export {
    type SwapPosition,
    type SwapResult,
    swapBetween,
    swapItems,
} from "./helpers";

/** The swappable item a group's `accepts` predicate is asked about. */
export interface SwapSource {
    readonly id: DragId;
    readonly group: string;
    readonly type?: string;
    readonly data?: unknown;
}

/** A swappable item in a swap event: its id, group and index. */
export interface SwapItem extends SwapPosition {
    readonly id: DragId;
}

/**
 * A swap ended: dropped on `target` (none: it swaps with nothing), or cancelled (no target).
 */
export interface SwapEvent {
    readonly type: "swap";
    readonly source: SwapItem;
    readonly target?: SwapItem | undefined;
    readonly canceled: boolean;
    readonly operation: DragOperation;
    readonly input: DragInput;
}

/** Options of {@link registerSwappable}. */
export interface SwappableOptions {
    /** unique within its scope */
    readonly id: DragId;
    /** its place in its group's list, from 0 (reported in the swap event) */
    readonly index: number;
    /** the items it may swap with, within its scope (its own group's always) */
    readonly group: string;
    /** what plain droppables with an `accepts` list match */
    readonly type?: string;
    /** anything the app wants back in the events */
    readonly data?: unknown;
    /** only swappables and droppables of the same scope meet it (default: the default scope) */
    readonly scope?: string;
    /** an explicit space from `createDragSpace` (default: the element's document's) */
    readonly space?: DragSpace;
    /** a disabled item neither drags nor swaps */
    readonly disabled?: boolean;
    /** the other groups whose items it swaps with: their names, or a predicate of the item */
    readonly accepts?: readonly string[] | ((source: SwapSource) => boolean);
    /** when a press becomes a drag (default: 3 px; touch: 200 ms within 5 px) */
    readonly activation?: Activation;
    /** the only element a drag starts from, inside the item (a drag handle) */
    readonly handle?: HTMLElement | null;
    /** opt-in auto-scroll of the nearest scroll containers (`autoScroll()`) */
    readonly autoScroll?: AutoScroll;
    /**
     * whether the item follows the pointer (default true); false when a drag overlay shows it,
     * and the item is moved to the target's place instead
     */
    readonly translate?: boolean;
    /** dropped (on a target or not) or cancelled: apply it with `swapItems` or `swapBetween` */
    readonly onSwap?: (event: SwapEvent) => void;
}

/** A swappable item's state (`data-dnd-dragging`, `data-dnd-disabled`). */
export type SwappableState = DraggableState;

/** What {@link registerSwappable} returns. */
export type SwappableRegistration = Registration<
    SwappableOptions,
    SwappableState
>;

/** A registered swappable item. */
interface Item {
    readonly element: HTMLElement;
    options(): SwappableOptions;
    /** its drop target entry */
    readonly target: DroppableEntry;
}

// created on first use, never on import (D4)
let items: WeakMap<object, Item> | undefined;

const info = (item: Item): SwapItem => {
    const { id, group, index } = item.options();
    return { id, group, index };
};

/** A box's corner a swap lines up: the inline-start one, at the top. */
const corner = (rect: Rect, rtl: boolean): Point => ({
    x: rtl ? rect.x + rect.width : rect.x,
    y: rect.y,
});

/** A swap in progress: the preview of `source`'s drag in `space`. */
function createSwap(space: DragSpace, source: Item) {
    const view = source.element.ownerDocument.defaultView;
    const rtl = view?.getComputedStyle(source.element).direction === "rtl";
    let shown: Item | undefined;
    let writers: Writer[] = [];

    /** The item the drag would swap with now, and both boxes at rest. */
    function find(operation: DragOperation) {
        const session = stateOf(space).session as Session | undefined;
        const hit = session?.hovered();
        const item = hit && items?.get(hit.entry);
        if (!operation.target || !item || item === source) return undefined;
        const from =
            session
                ?.targets()
                .find((candidate) => candidate.entry === source.target)?.rect ??
            operation.rects.source;
        return { item, rect: hit.rect, from };
    }

    function clear(): void {
        for (const writer of writers) writer.clear();
        writers = [];
        shown?.element.removeAttribute("data-dnd-swap-target");
        shown = undefined;
    }

    /** Moves the target into the source's place (and the source into the target's, when it does not follow the pointer). */
    function apply(found: ReturnType<typeof find>): void {
        if (found?.item !== shown) {
            clear();
            if (!found) return;
            shown = found.item;
            shown.element.setAttribute("data-dnd-swap-target", "");
            writers = [createWriter(shown.element)];
            if (source.options().translate === false)
                writers.push(createWriter(source.element));
        }
        if (!found) return;
        const a = corner(found.from, rtl);
        const b = corner(found.rect, rtl);
        writers[0]?.write(a.x - b.x, a.y - b.y);
        writers[1]?.write(b.x - a.x, b.y - a.y);
    }

    return {
        emit(event: DragSpaceEvent) {
            if (event.type === "drag-move") apply(find(event.operation));
            else if (event.type === "drop" || event.type === "drag-cancel") {
                const canceled = event.type === "drag-cancel";
                const found = canceled ? undefined : find(event.operation);
                source.options().onSwap?.({
                    type: "swap",
                    source: info(source),
                    target: found && info(found.item),
                    canceled,
                    operation: event.operation,
                    input: event.input,
                });
            }
        },
        end: clear,
    };
}

/** The swappable options as a drag source's: the keyboard always moves target to target. */
const sourceOptions = (options: SwappableOptions) => ({
    ...options,
    keyboard: { mode: "targets" } as const,
});

/**
 * Makes `element` a swappable item of its group, by pointer and keyboard, in its document's drag
 * space (or the `space` given). Call `unregister` when the element goes away.
 */
export function registerSwappable(
    element: HTMLElement,
    options: SwappableOptions,
): SwappableRegistration {
    let current = options;
    const store = createStore<SwappableState>({
        dragging: false,
        disabled: !!options.disabled,
    });
    let swap: ReturnType<typeof createSwap> | undefined;
    const registered = registerSource(element, sourceOptions(options), store, {
        prepare(space) {
            const started = createSwap(space, item);
            swap = started;
            return () => {
                started.end();
                if (swap === started) swap = undefined;
            };
        },
        emit: (event) => swap?.emit(event),
    });
    const target: DroppableEntry = {
        kind: "droppable",
        element,
        space: options.space,
        id: () => current.id,
        scope: () => current.scope ?? DEFAULT_SCOPE,
        data: () => current.data,
        disabled: () => !!current.disabled,
        accepts(source, from) {
            const other = from && items?.get(from)?.options();
            if (!other) return false;
            const accepts = current.accepts;
            return (
                other.group === current.group ||
                (typeof accepts === "function"
                    ? accepts({ ...source, group: other.group })
                    : !!accepts?.includes(other.group))
            );
        },
        state: () => ({
            over: false,
            active: false,
            refused: false,
            disabled: !!current.disabled,
        }),
        start() {},
        hover() {},
        drop() {},
        end() {},
    };
    const item: Item = { element, options: () => current, target };
    items ??= new WeakMap();
    items.set(registered.entry satisfies SourceEntry, item);
    items.set(target, item);
    /** a drag in progress measures its targets again */
    const invalidate = () => stateOf(spaceOf(target)).session?.invalidate();
    let remove = spaceOf(target).adapter.register(target);
    let alive = true;
    invalidate();
    return {
        update(next) {
            if (!alive) return;
            invalidate();
            const moved = next.space !== target.space;
            current = next;
            if (moved) {
                remove();
                target.space = next.space;
                remove = spaceOf(target).adapter.register(target);
            }
            registered.update(sourceOptions(next));
            invalidate();
        },
        unregister() {
            alive = false;
            registered.unregister();
            remove();
            invalidate();
        },
        getState: registered.getState,
        subscribe: registered.subscribe,
    };
}
