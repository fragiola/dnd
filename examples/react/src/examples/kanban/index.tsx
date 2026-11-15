"use client";

import {
    moveBetween,
    Sortable,
    SortableGroup,
} from "@fragiola/dnd-react/sortable";
import { useState } from "react";
import { type Board, taskOf } from "../_kit/tasks";
import * as styles from "./styles";

// A kanban: each column is a sortable group, and a card moves into another column when that
// column `accepts` the card's. The rule here is the app's: a card reaches Done only from Doing,
// so over Done a card from the Backlog changes nothing (the column is never entered). Every
// column's list is a `SortableGroup`, which an empty column needs (Done starts empty) and which
// lets a card drop below the last one. The app applies each drop with `moveBetween`.

type Column = "backlog" | "doing" | "done";

const COLUMNS: { id: Column; title: string; accepts: Column[] }[] = [
    { id: "backlog", title: "Backlog", accepts: ["doing", "done"] },
    { id: "doing", title: "Doing", accepts: ["backlog", "done"] },
    { id: "done", title: "Done", accepts: ["doing"] },
];

const START: Board<Column> = {
    backlog: ["login", "export", "search", "typo"],
    doing: ["guide", "avatar"],
    done: [],
};

export default function Kanban() {
    const [board, setBoard] = useState(START);
    return (
        <div className={styles.frame}>
            {COLUMNS.map((column) => (
                <section
                    key={column.id}
                    aria-labelledby={`kanban-${column.id}`}
                    className={styles.column}
                >
                    <h3 id={`kanban-${column.id}`} className={styles.title}>
                        {column.title}
                        <span className={styles.count}>
                            {board[column.id].length}
                        </span>
                    </h3>
                    <SortableGroup group={column.id} accepts={column.accepts}>
                        <ul aria-label={column.title} className={styles.list}>
                            {board[column.id].map((id, index) => (
                                <Sortable
                                    key={id}
                                    id={id}
                                    index={index}
                                    group={column.id}
                                    accepts={column.accepts}
                                    onSortEnd={(event) =>
                                        setBoard((now) =>
                                            moveBetween(now, event),
                                        )
                                    }
                                >
                                    <li
                                        aria-label={taskOf(id).title}
                                        className={styles.card}
                                    >
                                        {taskOf(id).title}
                                        <span
                                            className={styles.tag(
                                                taskOf(id).tag,
                                            )}
                                        >
                                            {taskOf(id).tag}
                                        </span>
                                    </li>
                                </Sortable>
                            ))}
                        </ul>
                    </SortableGroup>
                </section>
            ))}
        </div>
    );
}
