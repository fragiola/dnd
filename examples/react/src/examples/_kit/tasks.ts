// Demo content and app policy for the board examples: the tasks, and where each one is. Moving a
// task is the app's job (D14): the drag and drop only says what was dropped where. No dnd and no
// styles here.

/** A task card. */
export interface Task {
    readonly id: string;
    readonly title: string;
    readonly tag: "bug" | "feature" | "docs";
}

export const TASKS: readonly Task[] = [
    { id: "login", title: "Fix the login redirect", tag: "bug" },
    { id: "export", title: "Export the report as CSV", tag: "feature" },
    { id: "guide", title: "Write the setup guide", tag: "docs" },
    { id: "avatar", title: "Crop avatars to a circle", tag: "feature" },
    { id: "typo", title: "Typo on the pricing page", tag: "bug" },
];

/** A task by its id (the drag events carry ids, the app keeps the rest). */
export function taskOf(id: string | number): Task {
    return (
        TASKS.find((task) => task.id === String(id)) ?? {
            id: String(id),
            title: String(id),
            tag: "feature",
        }
    );
}

/** Which task ids each column holds, in order. */
export type Board<Column extends string> = Readonly<
    Record<Column, readonly string[]>
>;

/** `board` with task `id` moved to the end of `to`; the same board when it is already there. */
export function moveTask<Column extends string>(
    board: Board<Column>,
    id: string,
    to: Column,
): Board<Column> {
    if (board[to].includes(id)) return board;
    const next = {} as Record<Column, readonly string[]>;
    for (const column of Object.keys(board) as Column[]) {
        next[column] = board[column].filter((each) => each !== id);
    }
    next[to] = [...next[to], id];
    return next;
}
