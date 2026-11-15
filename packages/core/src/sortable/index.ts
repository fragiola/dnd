// @fragiola/dnd/sortable: the sortable capability (S2). It imports only the shared core, never
// another capability. A sortable item is a drag source; the items of one `group` (in the space's
// `scope`) are one list, ordered by `index`, and need no wrapper around them. When an item's drag
// starts, each group of its scope becomes a drop target of that drag (an entry in the space,
// removed when it ends), so the middleware sees a sort as a drop of the item on a group
// (`{ draggableId: item, droppableId: group }`) and plain droppables of the scope still take the
// item. The preview is written by the core: every shifted item's `translate`, from its box at
// rest, never a DOM move and never a React render; the app applies `onSortEnd` to its own data.

import type { AutoScroll } from "../core/auto-scroll";
import { center, measure } from "../core/dom";
import type { Candidate, Session } from "../core/operation";
import type { KeyStep } from "../core/sensors/context";
import { readingOrder } from "../core/sensors/keyboard";
import { registerSource } from "../core/source";
import {
    DEFAULT_SCOPE,
    type DragSpace,
    type DroppableEntry,
    entriesOf,
    getDragSpace,
    stateOf,
} from "../core/space";
import { createStore, type Store } from "../core/store";
import type {
    Activation,
    CollisionInput,
    CollisionStrategy,
    DraggableState,
    DragId,
    DragInput,
    DragOperation,
    DragSpaceEvent,
    Point,
    Rect,
    Registration,
} from "../core/types";
import { createWriter, restRect, type Writer } from "../core/writer";
import type { SortPosition } from "./helpers";
import { type SortStrategy, verticalList } from "./strategies";

export {
    arrayMove,
    moveBetween,
    type SortMove,
    type SortPosition,
} from "./helpers";
export {
    grid,
    horizontalList,
    type SortIndexInput,
    type SortShiftInput,
    type SortShifts,
    type SortStrategy,
    verticalList,
} from "./strategies";

/** The sortable item a group's `accepts` predicate is asked about. */
export interface SortSource {
    readonly id: DragId;
    readonly group: string;
    readonly type?: string;
    readonly data?: unknown;
}

/** What a group takes from other groups: their names, or a predicate of the item. */
export type SortAccepts = readonly string[] | ((source: SortSource) => boolean);

/** A sort event: the item, where it was, where it goes now, and the drag operation. */
export interface SortEvent<
    Type extends "sort-start" | "sort-over" | "sort-end" =
        | "sort-start"
        | "sort-over"
        | "sort-end",
> {
    readonly type: Type;
    readonly id: DragId;
    readonly from: SortPosition;
    /** where the preview puts it now (`from` at the start, and when it would not move) */
    readonly to: SortPosition;
    readonly operation: DragOperation;
    readonly input: DragInput;
}

/** A sort ended: dropped (`to` is where it goes) or cancelled (`to` is `from`). */
export interface SortEndEvent extends SortEvent<"sort-end"> {
    readonly canceled: boolean;
}

/** Options of {@link registerSortable}. */
export interface SortableOptions {
    /** unique within its scope */
    readonly id: DragId;
    /** its place in its group's list, from 0 */
    readonly index: number;
    /** the list it belongs to, within its scope (a group name, also the group's drop target id) */
    readonly group: string;
    /** what plain droppables with an `accepts` list match */
    readonly type?: string;
    /** anything the app wants back in the events */
    readonly data?: unknown;
    /** only sortables and droppables of the same scope meet it (default: the default scope) */
    readonly scope?: string;
    /** an explicit space from `createDragSpace` (default: the element's document's) */
    readonly space?: DragSpace;
    readonly disabled?: boolean;
    /** the other groups whose items its group takes (its own always) */
    readonly accepts?: SortAccepts;
    /** how its group places and shifts items (default: `verticalList`) */
    readonly strategy?: SortStrategy;
    /** when a press becomes a drag (default: 3 px; touch: 200 ms within 5 px) */
    readonly activation?: Activation;
    /** the only element a drag starts from, inside the item (a drag handle) */
    readonly handle?: HTMLElement | null;
    /** opt-in auto-scroll of the nearest scroll containers (`autoScroll()`) */
    readonly autoScroll?: AutoScroll;
    /**
     * whether the item follows the pointer (default true); false when a drag overlay shows it,
     * and the item is shifted to where it lands instead, as a placeholder
     */
    readonly translate?: boolean;
    readonly onSortStart?: (event: SortEvent<"sort-start">) => void;
    /** the preview changed: `to` is where it would go now */
    readonly onSortOver?: (event: SortEvent<"sort-over">) => void;
    /** dropped or cancelled: apply `from` → `to` to the app's data (`arrayMove`, `moveBetween`) */
    readonly onSortEnd?: (event: SortEndEvent) => void;
}

/** A sortable item's state: `dragging` it, `sorting` while a sort it takes part in runs. */
export interface SortableState extends DraggableState {
    readonly sorting: boolean;
}

/** What {@link registerSortable} returns. */
export type SortableRegistration = Registration<SortableOptions, SortableState>;

/** Options of {@link registerSortableGroup}. */
export interface SortableGroupOptions {
    /** the group whose container it is */
    readonly group: string;
    readonly scope?: string;
    readonly space?: DragSpace;
    /** what the middleware sees as the drop target's data */
    readonly data?: unknown;
    /** a disabled group is never sorted into, nor within */
    readonly disabled?: boolean;
    /** the other groups whose items it takes, with its items' own */
    readonly accepts?: SortAccepts;
    /** how the group places and shifts items (default: its items', else `verticalList`) */
    readonly strategy?: SortStrategy;
}

/** A sortable group container's state: `sorting` while a sort it takes part in runs. */
export interface SortableGroupState {
    readonly sorting: boolean;
    readonly disabled: boolean;
}

/** What {@link registerSortableGroup} returns. */
export type SortableGroupRegistration = Registration<
    SortableGroupOptions,
    SortableGroupState
>;

/** A registered sortable item. */
interface Item {
    readonly element: HTMLElement;
    options(): SortableOptions;
    readonly store: Store<SortableState>;
    readonly space: () => DragSpace;
}

/** A registered group container. */
interface Container {
    readonly element: HTMLElement;
    options(): SortableGroupOptions;
    readonly store: Store<SortableGroupState>;
}

// created on first use, never on import (D4)
let items: WeakMap<object, Item> | undefined;
let containers: Set<Container> | undefined;

const scopeOf = (options: { readonly scope?: string }) =>
    options.scope ?? DEFAULT_SCOPE;

/** Whether `accepts` takes `source`. */
const admits = (accepts: SortAccepts | undefined, source: SortSource) =>
    typeof accepts === "function"
        ? accepts(source)
        : !!accepts?.includes(source.group);

/** A group in a sort: its drop target, its items at rest, and its container. */
interface Group {
    readonly name: string;
    readonly entry: DroppableEntry;
    items: Item[];
    rects: Rect[];
    container: Container | undefined;
    /** the container's box */
    area: Rect | undefined;
    strategy: SortStrategy;
    accepting: boolean;
}

/** Where the source is in the preview: a group and its place there. */
interface Place {
    readonly group: Group;
    readonly index: number;
}

/** A sort in progress: what the source's drag runs through. */
interface Sort {
    emit(event: DragSpaceEvent): void;
    collide: CollisionStrategy;
    step(session: Session, forward: boolean): KeyStep | undefined;
    end(): void;
}

/** Starts the sort of `source` in `space`: its groups, their drop targets, the preview. */
function createSort(space: DragSpace, source: Item): Sort {
    const options = source.options();
    const scope = scopeOf(options);
    const view = source.element.ownerDocument.defaultView;
    const rtl = view?.getComputedStyle(source.element).direction === "rtl";
    const groups = new Map<string, Group>();
    const byEntry = new Map<DroppableEntry, Group>();
    const sorting = new Set<Store<{ sorting: boolean }>>();
    const sourceInfo: SortSource = {
        id: options.id,
        group: options.group,
        type: options.type,
        data: options.data,
    };
    let from = 0;
    /** the place the collision found last (none: over a plain droppable) */
    let at: Place | undefined;
    /** the place the keyboard moved to */
    let keyed: Place | undefined;
    /** what the preview shows now, as a key, and the measure it was computed on */
    let shown = "";
    let measured = 0;
    let applied = -1;
    const writers = new Map<HTMLElement, Writer>();

    /** The sortable items and containers of the group named `name` in this space, now. */
    function members(group: Group): void {
        const found: Item[] = [];
        for (const entry of entriesOf(space)) {
            const item = items?.get(entry);
            const each = item?.options();
            if (
                item &&
                each &&
                scopeOf(each) === scope &&
                each.group === group.name
            )
                found.push(item);
        }
        group.items = found.sort(
            (a, b) => a.options().index - b.options().index,
        );
        group.container = [...(containers ?? [])].find((container) => {
            const each = container.options();
            return (
                each.group === group.name &&
                scopeOf(each) === scope &&
                (each.space ??
                    getDragSpace(container.element.ownerDocument)) === space
            );
        });
    }

    function groupOf(name: string): Group {
        const known = groups.get(name);
        if (known) return known;
        const group: Group = {
            name,
            items: [],
            rects: [],
            container: undefined,
            area: undefined,
            strategy: verticalList,
            accepting: false,
            entry: {
                kind: "droppable",
                get element() {
                    return (
                        group.container?.element ??
                        group.items[0]?.element ??
                        source.element
                    );
                },
                space: options.space,
                id: () => name,
                scope: () => scope,
                data: () => group.container?.options().data,
                // the source's own disabled group is measured (its item leaves from it), and
                // refuses the item instead: never sorted within
                disabled: () =>
                    name !== sourceInfo.group &&
                    !!group.container?.options().disabled,
                // the item asked about (the sort's source, or another in `check("drop")`)
                accepts(_, from) {
                    const each = from && items?.get(from)?.options();
                    if (!each || group.container?.options().disabled)
                        return false;
                    const asked: SortSource = {
                        id: each.id,
                        group: each.group,
                        type: each.type,
                        data: each.data,
                    };
                    return (
                        name === asked.group ||
                        [group.container, ...group.items].some((member) =>
                            admits(member?.options().accepts, asked),
                        )
                    );
                },
                rect() {
                    members(group);
                    group.rects = group.items.map((item) =>
                        restRect(item.element),
                    );
                    group.area =
                        group.container && measure(group.container.element);
                    group.strategy =
                        group.container?.options().strategy ??
                        group.items
                            .find((item) => item.options().strategy)
                            ?.options().strategy ??
                        verticalList;
                    if (name === sourceInfo.group)
                        from = Math.max(0, group.items.indexOf(source));
                    measured++;
                    return group.area ?? union(group.rects);
                },
                state: () => ({
                    over: false,
                    active: group.accepting,
                    refused: false,
                    disabled: !!group.container?.options().disabled,
                }),
                start(accepted) {
                    group.accepting = accepted;
                    if (!accepted) return;
                    for (const store of [
                        ...group.items.map((item) => item.store),
                        ...(group.container ? [group.container.store] : []),
                    ]) {
                        sorting.add(store);
                        store.set({ sorting: true });
                    }
                },
                hover() {},
                drop() {},
                end() {
                    group.accepting = false;
                },
            },
        };
        members(group);
        groups.set(name, group);
        byEntry.set(group.entry, group);
        return group;
    }

    // every group of the scope in this space: its items' and its containers'
    for (const entry of entriesOf(space)) {
        const each = items?.get(entry)?.options();
        if (each && scopeOf(each) === scope) groupOf(each.group);
    }
    for (const container of containers ?? []) {
        const each = container.options();
        if (
            scopeOf(each) === scope &&
            (each.space ?? getDragSpace(container.element.ownerDocument)) ===
                space
        )
            groupOf(each.group);
    }
    const home = groupOf(sourceInfo.group);
    // measured again with its group's rects, unless the group is disabled (never measured)
    from = Math.max(0, home.items.indexOf(source));
    const removals = [...groups.values()].map((group) =>
        space.adapter.register(group.entry),
    );

    const position = (place: Place | undefined): SortPosition =>
        place
            ? { group: place.group.name, index: place.index }
            : { group: home.name, index: from };

    /** The place the preview shows for `operation`: none when it has no group as its target. */
    const showing = (operation: DragOperation) =>
        at && operation.target?.id === at.group.name ? at : undefined;

    /** Every item's shift for the source at `place` (at home when none). */
    function shiftsFor(place: Place | undefined): Map<HTMLElement, Point> {
        const shifts = new Map<HTMLElement, Point>();
        const rect = home.rects[from];
        if (!place || !rect) return shifts;
        const into = place.group;
        const add = (group: Group, to: number | undefined) => {
            const result = group.strategy.shifts({
                rects: group.rects,
                from: group === home ? from : undefined,
                to,
                source: rect,
                rtl,
            });
            for (const [index, shift] of result.shifts.entries()) {
                const item = group.items[index];
                if (item && item !== source) shifts.set(item.element, shift);
            }
            return result.landing;
        };
        if (into !== home) add(home, undefined);
        const landing = add(into, place.index) ?? landingIn(into, rect);
        // shown by an overlay, the item itself is the placeholder, where it lands
        if (options.translate === false) shifts.set(source.element, landing);
        return shifts;
    }

    /** Where the source lands in an empty group: its container's inline-start corner. */
    function landingIn(group: Group, rect: Rect): Point {
        const area = group.area ?? rect;
        return {
            x: rtl
                ? area.x + area.width - rect.x - rect.width
                : area.x - rect.x,
            y: area.y - rect.y,
        };
    }

    /** Writes the shifts of the preview, once it changed. */
    function apply(place: Place | undefined): boolean {
        const key = place ? `${place.group.name}\u0000${place.index}` : "";
        const moved = (place ? key : `${home.name}\u0000${from}`) !== shown;
        if (!moved && applied === measured) return false;
        shown = place ? key : `${home.name}\u0000${from}`;
        applied = measured;
        const shifts = shiftsFor(place);
        for (const [element, writer] of writers) {
            if (!element.isConnected) {
                writer.clear();
                writers.delete(element);
            } else {
                const shift = shifts.get(element);
                writer.write(shift?.x ?? 0, shift?.y ?? 0);
            }
        }
        for (const [element, shift] of shifts) {
            if (writers.has(element) || (!shift.x && !shift.y)) continue;
            const writer = createWriter(element);
            writers.set(element, writer);
            writer.write(shift.x, shift.y);
        }
        return moved;
    }

    const event = <Type extends "sort-start" | "sort-over" | "sort-end">(
        type: Type,
        to: SortPosition,
        { operation, input }: DragSpaceEvent,
    ): SortEvent<Type> => ({
        type,
        id: sourceInfo.id,
        from: position(undefined),
        to,
        operation,
        input,
    });

    return {
        emit(drag) {
            const own = source.options();
            if (drag.type === "drag-start") {
                shown = `${home.name}\u0000${from}`;
                own.onSortStart?.(
                    event("sort-start", position(undefined), drag),
                );
            } else if (drag.type === "drag-move") {
                const place = showing(drag.operation);
                if (apply(place))
                    own.onSortOver?.(event("sort-over", position(place), drag));
            } else if (drag.type === "drop" || drag.type === "drag-cancel") {
                const canceled = drag.type === "drag-cancel";
                own.onSortEnd?.({
                    ...event(
                        "sort-end",
                        position(
                            canceled ? undefined : showing(drag.operation),
                        ),
                        drag,
                    ),
                    canceled,
                });
            }
        },
        collide: (({
            pointer,
            dragRect,
            droppables,
        }: CollisionInput<Candidate>) => {
            // a plain droppable under the pointer (a trash zone) takes the item, unless an
            // accepting group's box under it is smaller (a droppable around the list)
            let inner: Candidate | undefined;
            const open: Candidate[] = [];
            for (const candidate of droppables) {
                const group = byEntry.get(candidate.entry);
                if (group && candidate.accepted) open.push(candidate);
                if (
                    (!group || candidate.accepted) &&
                    inside(pointer, candidate.rect) &&
                    (!inner ||
                        candidate.rect.width * candidate.rect.height <
                            inner.rect.width * inner.rect.height)
                )
                    inner = candidate;
            }
            const plain =
                inner && !byEntry.has(inner.entry) ? inner : undefined;
            if (plain) {
                at = undefined;
                return plain;
            }
            const probe = center(dragRect);
            const places = open.map((candidate) =>
                byEntry.get(candidate.entry),
            );
            let place = keyed;
            if (!place) {
                const group =
                    places.find((each) =>
                        each?.rects.some((rect) => inside(probe, rect)),
                    ) ??
                    places.find(
                        (each) => each?.area && inside(probe, each.area),
                    ) ??
                    (at && places.includes(at.group) ? at.group : undefined) ??
                    (places.includes(home) ? home : undefined);
                if (!group) return undefined;
                place = {
                    group,
                    index: group.strategy.index({
                        rects: group.rects,
                        from: group === home ? from : undefined,
                        probe,
                        previous: at?.group === group ? at.index : undefined,
                        rtl,
                    }),
                };
            }
            const found = place;
            at = found;
            return open.find(
                (candidate) => candidate.entry === found.group.entry,
            );
        }) as CollisionStrategy,
        step(session, forward) {
            const order = readingOrder(
                session
                    .targets()
                    .filter((candidate) => byEntry.has(candidate.entry)),
                rtl,
            ).flatMap((candidate) => byEntry.get(candidate.entry) ?? []);
            const now = keyed ?? at ?? { group: home, index: from };
            const last = (group: Group) =>
                group.rects.length - (group === home ? 1 : 0);
            let group: Group | undefined = now.group;
            let index = now.index + (forward ? 1 : -1);
            const ordered = order.indexOf(now.group);
            // out of its group's end, or out of a group that refuses it (its own, disabled)
            if (index < 0 || index > last(now.group) || ordered < 0) {
                group =
                    order[
                        ordered < 0
                            ? forward
                                ? 0
                                : order.length - 1
                            : ordered + (forward ? 1 : -1)
                    ];
                if (!group) return undefined;
                index = forward ? 0 : last(group);
            }
            keyed = { group, index };
            const rect = home.rects[from];
            if (!rect) return undefined;
            const landing =
                group.strategy.shifts({
                    rects: group.rects,
                    from: group === home ? from : undefined,
                    to: index,
                    source: rect,
                    rtl,
                }).landing ?? landingIn(group, rect);
            // the slot's box now; the dragged box sits where the pointer puts it, from the box
            // it had at the start (the page may have scrolled since)
            const slot = {
                ...rect,
                x: rect.x + landing.x,
                y: rect.y + landing.y,
            };
            const { pointer, delta, rects } = session.operation;
            return {
                point: {
                    x: pointer.x - delta.x + slot.x - rects.source.x,
                    y: pointer.y - delta.y + slot.y - rects.source.y,
                },
                rect: slot,
                element: group.entry.element,
            };
        },
        end() {
            for (const writer of writers.values()) writer.clear();
            writers.clear();
            for (const store of sorting) store.set({ sorting: false });
            for (const remove of removals) remove();
        },
    };
}

/** Whether `point` is in `rect`. */
const inside = (point: Point, rect: Rect) =>
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height;

/** The box around `rects` (none: an empty box). */
function union(rects: readonly Rect[]): Rect {
    if (!rects.length) return { x: 0, y: 0, width: 0, height: 0 };
    const x = Math.min(...rects.map((rect) => rect.x));
    const y = Math.min(...rects.map((rect) => rect.y));
    const right = Math.max(...rects.map((rect) => rect.x + rect.width));
    const bottom = Math.max(...rects.map((rect) => rect.y + rect.height));
    return { x, y, width: right - x, height: bottom - y };
}

/** The sortable options as a drag source's: the keyboard always moves slot to slot. */
const sourceOptions = (options: SortableOptions) => ({
    ...options,
    keyboard: { mode: "targets" } as const,
});

/**
 * Makes `element` a sortable item of its group, by pointer and keyboard, in its document's drag
 * space (or the `space` given). Call `unregister` when the element goes away.
 */
export function registerSortable(
    element: HTMLElement,
    options: SortableOptions,
): SortableRegistration {
    let current = options;
    const store = createStore<SortableState>({
        dragging: false,
        sorting: false,
        disabled: !!options.disabled,
    });
    let sort: Sort | undefined;
    const registered = registerSource(element, sourceOptions(options), store, {
        prepare(space) {
            const started = createSort(space, item);
            sort = started;
            return () => {
                started.end();
                if (sort === started) sort = undefined;
            };
        },
        emit: (event) => sort?.emit(event),
        collision: () => sort?.collide,
        step: (session, forward) => sort?.step(session, forward),
    });
    const item: Item = {
        element,
        options: () => current,
        store,
        space: () => current.space ?? getDragSpace(element.ownerDocument),
    };
    items ??= new WeakMap();
    items.set(registered.entry, item);
    /** a sort in progress measures its groups again */
    const invalidate = () => stateOf(item.space()).session?.invalidate();
    invalidate();
    return {
        update(next) {
            invalidate();
            current = next;
            registered.update(sourceOptions(next));
            invalidate();
        },
        unregister() {
            registered.unregister();
            invalidate();
        },
        getState: registered.getState,
        subscribe: registered.subscribe,
    };
}

/**
 * Marks `element` as the container of a sortable group: only needed to sort into the group while
 * it is empty, or to the end of the container. Call `unregister` when the element goes away.
 */
export function registerSortableGroup(
    element: HTMLElement,
    options: SortableGroupOptions,
): SortableGroupRegistration {
    let current = options;
    const store = createStore<SortableGroupState>({
        sorting: false,
        disabled: !!options.disabled,
    });
    const container: Container = { element, options: () => current, store };
    containers ??= new Set();
    containers.add(container);
    const invalidate = () =>
        stateOf(
            current.space ?? getDragSpace(element.ownerDocument),
        ).session?.invalidate();
    invalidate();
    return {
        update(next) {
            invalidate();
            current = next;
            store.set({ disabled: !!next.disabled });
            invalidate();
        },
        unregister() {
            containers?.delete(container);
            invalidate();
        },
        getState: store.get,
        subscribe: store.subscribe,
    };
}
