// The app's side of a swap (S3, D14): pure helpers that apply what `onSwap` reports to the app's
// own lists. They never mutate their input: each returns new arrays, or the input itself when
// nothing swaps (so a state setter given it renders nothing).

/** Where a swappable item is: its group and its index in it. */
export interface SwapPosition {
    readonly group: string;
    readonly index: number;
}

/** What a swap needs from a `swap` event. */
export interface SwapResult {
    readonly source: SwapPosition;
    readonly target?: SwapPosition | undefined;
    readonly canceled?: boolean;
}

/** `list` with the items at `a` and `b` exchanged (a new array; out of range, a copy). */
export function swapItems<T>(list: readonly T[], a: number, b: number): T[] {
    const next = [...list];
    if (a in list && b in list) {
        next[a] = list[b] as T;
        next[b] = list[a] as T;
    }
    return next;
}

/**
 * The app's lists, one per group, with the swap of a `swap` event applied: within a group, or
 * across two. A cancelled swap, or one with no target, returns `lists` itself.
 */
export function swapBetween<
    T,
    Lists extends Readonly<Record<string, readonly T[]>>,
>(lists: Lists, swap: SwapResult): Lists {
    const { source, target } = swap;
    const from = lists[source.group];
    const to = target && lists[target.group];
    if (
        swap.canceled ||
        !target ||
        !from ||
        !to ||
        !(source.index in from) ||
        !(target.index in to) ||
        (source.group === target.group && source.index === target.index)
    )
        return lists;
    if (source.group === target.group)
        return {
            ...lists,
            [source.group]: swapItems(from, source.index, target.index),
        };
    const nextFrom = [...from];
    const nextTo = [...to];
    nextFrom[source.index] = to[target.index] as T;
    nextTo[target.index] = from[source.index] as T;
    return { ...lists, [source.group]: nextFrom, [target.group]: nextTo };
}
