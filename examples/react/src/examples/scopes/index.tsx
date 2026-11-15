"use client";

import { Draggable } from "@fragiola/dnd-react/draggable";
import { Droppable } from "@fragiola/dnd-react/droppable";
import { useState } from "react";
import { type Board, moveTask, taskOf } from "../_kit/tasks";
import * as styles from "./styles";

// Two boards on one page, each its own `scope`: a draggable only meets the droppables of its
// scope, so a card of one board passes over the other board's columns as if they were not there.
// Still no provider: a scope is a string on each wrapper.

type Column = "open" | "closed";

const BOARDS: { scope: string; title: string; start: Board<Column> }[] = [
    {
        scope: "design",
        title: "Design",
        start: { open: ["avatar", "guide"], closed: [] },
    },
    {
        scope: "engineering",
        title: "Engineering",
        start: { open: ["login", "export"], closed: ["typo"] },
    },
];

const COLUMNS: { id: Column; title: string }[] = [
    { id: "open", title: "Open" },
    { id: "closed", title: "Closed" },
];

export default function Scopes() {
    return (
        <div className={styles.frame}>
            {BOARDS.map((board) => (
                <ScopedBoard key={board.scope} {...board} />
            ))}
        </div>
    );
}

function ScopedBoard({
    scope,
    title,
    start,
}: {
    scope: string;
    title: string;
    start: Board<Column>;
}) {
    const [board, setBoard] = useState(start);
    return (
        <section aria-label={`${title} board`} className={styles.board}>
            <h3
                className={styles.boardTitle}
            >{`${title} (scope "${scope}")`}</h3>
            <div className={styles.columns}>
                {COLUMNS.map((column) => (
                    <Droppable
                        key={column.id}
                        // ids are unique within a scope: both boards have an "open" column
                        id={column.id}
                        scope={scope}
                        onDrop={(event) =>
                            setBoard((now) =>
                                moveTask(
                                    now,
                                    String(event.operation.source.id),
                                    column.id,
                                ),
                            )
                        }
                    >
                        <section
                            aria-label={`${title} ${column.title}`}
                            className={styles.column}
                        >
                            <span className={styles.columnTitle}>
                                {column.title}
                            </span>
                            {board[column.id].map((id) => (
                                <Draggable key={id} id={id} scope={scope}>
                                    <article
                                        aria-label={taskOf(id).title}
                                        className={styles.card}
                                    >
                                        {taskOf(id).title}
                                    </article>
                                </Draggable>
                            ))}
                        </section>
                    </Droppable>
                ))}
            </div>
        </section>
    );
}
