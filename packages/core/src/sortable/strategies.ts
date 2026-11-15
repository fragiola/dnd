// The sort strategies (S2): pure functions over one group's items at rest, each its own export so
// an app ships only the ones it uses (`verticalList` is the default). A strategy answers two
// questions: where the source goes for the dragged box's centre (`index`), and how far every
// item shifts for a move (`shifts`). Rects are always the items' boxes at rest (the core measures
// them without the shifts it wrote), so a shift never feeds back into the index: the preview
// cannot oscillate. Between items (a gap, the end of a row) the index stays where it was.
import type { Point, Rect } from "../core/types";

/** What a strategy reads to place the source in a group. */
export interface SortIndexInput {
    /** the group's items at rest, in index order (the source too, when it is in this group) */
    readonly rects: readonly Rect[];
    /** the source's place in `rects`; undefined when it comes from another group */
    readonly from?: number | undefined;
    /** the centre of the dragged box */
    readonly probe: Point;
    /** the source's place in this group in the preview so far, if it is in this group */
    readonly previous?: number | undefined;
    readonly rtl: boolean;
}

/** What a strategy reads to shift a group's items for a move. */
export interface SortShiftInput {
    /** the group's items at rest, in index order (the source too, when it is in this group) */
    readonly rects: readonly Rect[];
    /** the source's place in `rects`; undefined when it comes from another group */
    readonly from?: number | undefined;
    /** where the source goes in this group; undefined when it leaves for another (its gap closes) */
    readonly to?: number | undefined;
    /** the source's box at rest */
    readonly source: Rect;
    readonly rtl: boolean;
}

/** A strategy's shifts for a move. */
export interface SortShifts {
    /** each item's shift, by its place in `rects` (the source's own is `landing`) */
    readonly shifts: readonly Point[];
    /** where the source lands, as a shift from its box at rest, when it goes into this group */
    readonly landing?: Point | undefined;
}

/** A sort strategy: pure, given a group at rest it places the source and shifts the items. */
export interface SortStrategy {
    /** the source's place in the group for the dragged box's centre */
    index(input: SortIndexInput): number;
    shifts(input: SortShiftInput): SortShifts;
}

const ZERO: Point = { x: 0, y: 0 };

/** Whether `point` is in `rect`, its top and bottom edges brought in by `inset`. */
const inside = (point: Point, rect: Rect, inset = 0) =>
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y + inset &&
    point.y <= rect.y + rect.height - inset;

/**
 * The place of the item the probe is over: in its own group, the source takes that item's place;
 * coming from another group, it goes before or after it, by which half of it the probe is in
 * along `axis` (the inline one is RTL aware). Over no item: where it was.
 */
function over(
    { rects, from, probe, previous, rtl }: SortIndexInput,
    axis: "x" | "y",
    inset: (rect: Rect) => number = () => 0,
): number {
    for (const [index, rect] of rects.entries()) {
        if (!inside(probe, rect, inset(rect))) continue;
        if (from !== undefined) return index;
        const after =
            axis === "y"
                ? probe.y > rect.y + rect.height / 2
                : probe.x > rect.x + rect.width / 2 !== rtl;
        return after ? index + 1 : index;
    }
    return previous ?? from ?? rects.length;
}

/** The order of a group after a move: item places, and -1 for the source. */
function reorder(rects: readonly Rect[], from?: number, to?: number): number[] {
    const order = rects.map((_, index) => index).filter((i) => i !== from);
    if (to !== undefined) order.splice(to, 0, -1);
    return order;
}

/**
 * A list's shifts: the items flow along the axis in their new order from the first one's edge,
 * each keeping its size and the gaps of the layout at rest, so items of any size line up. A
 * horizontal list in RTL flows from the right.
 */
function flow(
    { rects, from, to, source, rtl }: SortShiftInput,
    vertical: boolean,
): SortShifts {
    const mirror = !vertical && rtl;
    /** where a box starts along the flow (mirrored in RTL, so the flow always runs forward) */
    const lead = (rect: Rect) =>
        vertical ? rect.y : mirror ? -(rect.x + rect.width) : rect.x;
    const size = (rect: Rect) => (vertical ? rect.height : rect.width);
    const gap = (index: number) => {
        const a = rects[index];
        const b = rects[index + 1];
        return a && b ? lead(b) - lead(a) - size(a) : 0;
    };
    const shifts = rects.map(() => ZERO);
    const first = rects[0];
    if (!first) return { shifts };
    let at = lead(first);
    let landing: Point | undefined;
    for (const [place, item] of reorder(rects, from, to).entries()) {
        const rect = item < 0 ? source : (rects[item] ?? source);
        const along = at - lead(rect);
        const shift = vertical
            ? { x: 0, y: along }
            : { x: mirror ? -along : along, y: 0 };
        if (item < 0) {
            // across the flow, the source lines up with the group's items (from another group)
            landing = vertical
                ? {
                      x: rtl
                          ? first.x + first.width - source.x - source.width
                          : first.x - source.x,
                      y: along,
                  }
                : { x: shift.x, y: first.y - source.y };
        } else shifts[item] = shift;
        at += size(rect) + gap(Math.min(place, rects.length - 2));
    }
    return { shifts, landing };
}

/** A vertical list (the default): items of any height, top to bottom. */
export const verticalList: SortStrategy = {
    index: (input) => over(input, "y"),
    shifts: (input) => flow(input, true),
};

/** A horizontal list: items of any width, from the inline start (the right, in RTL). */
export const horizontalList: SortStrategy = {
    index: (input) => over(input, "x"),
    shifts: (input) => flow(input, false),
};

/**
 * A grid, in reading order (rows from the inline start): an item moved to another place takes
 * that place's corner, so it suits items of one size best; items of varied sizes keep their
 * order. Entering an item of another row than the current place needs the probe a quarter of
 * that item's height inside it (the hysteresis that keeps a row boundary from flickering).
 */
export const grid: SortStrategy = {
    index(input) {
        const now = input.previous ?? input.from;
        const current = now === undefined ? undefined : input.rects[now];
        const middle = current && current.y + current.height / 2;
        return over(input, "x", (rect) =>
            middle !== undefined &&
            (middle < rect.y || middle > rect.y + rect.height)
                ? rect.height / 4
                : 0,
        );
    },
    shifts({ rects, from, to, source, rtl }) {
        const corner = (rect: Rect): Point => ({
            x: rtl ? rect.x + rect.width : rect.x,
            y: rect.y,
        });
        /** a place's box: an item's, or one past the last, along its row */
        const place = (index: number): Rect | undefined => {
            const last = rects[rects.length - 1];
            const before = rects[rects.length - 2];
            if (index < rects.length || !last) return rects[index];
            const step =
                before && Math.abs(before.y - last.y) < last.height / 2
                    ? last.x - before.x
                    : rtl
                      ? -last.width
                      : last.width;
            return { ...last, x: last.x + step };
        };
        const shifts = rects.map(() => ZERO);
        let landing: Point | undefined;
        for (const [index, item] of reorder(rects, from, to).entries()) {
            const slot = place(index);
            if (!slot) continue;
            const rect = item < 0 ? source : (rects[item] ?? source);
            const shift = {
                x: corner(slot).x - corner(rect).x,
                y: slot.y - rect.y,
            };
            if (item < 0) landing = shift;
            else shifts[item] = shift;
        }
        return { shifts, landing };
    },
};
