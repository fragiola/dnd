// The app's side of a sort (S2, D14): pure helpers that apply what `onSortEnd` reports to the
// app's own lists. They never mutate their input: each returns new arrays, or the input itself
// when nothing moves (so a state setter given it renders nothing).

/** Where a sortable item is: its group and its index in it. */
export interface SortPosition {
    readonly group: string;
    readonly index: number;
}

/** What a move needs from a `sort-end` event. */
export interface SortMove {
    readonly from: SortPosition;
    readonly to: SortPosition;
    readonly canceled?: boolean;
}

/** `list` with the item at `from` moved to `to` (a new array; out of range, a copy). */
export function arrayMove<T>(
    list: readonly T[],
    from: number,
    to: number,
): T[] {
    const next = [...list];
    if (from < 0 || from >= list.length) return next;
    next.splice(to, 0, ...next.splice(from, 1));
    return next;
}

/**
 * The app's lists, one per group, with the move of a `sort-end` event applied: within a group,
 * or out of one into another. A cancelled or empty move returns `lists` itself.
 */
export function moveBetween<
    T,
    Lists extends Readonly<Record<string, readonly T[]>>,
>(lists: Lists, move: SortMove): Lists {
    const { from, to } = move;
    const source = lists[from.group];
    if (
        move.canceled ||
        !source ||
        from.index < 0 ||
        from.index >= source.length ||
        (from.group === to.group && from.index === to.index)
    )
        return lists;
    if (from.group === to.group)
        return {
            ...lists,
            [from.group]: arrayMove(source, from.index, to.index),
        };
    const target = [...(lists[to.group] ?? [])];
    target.splice(to.index, 0, ...source.slice(from.index, from.index + 1));
    return {
        ...lists,
        [from.group]: source.filter((_, index) => index !== from.index),
        [to.group]: target,
    };
}
