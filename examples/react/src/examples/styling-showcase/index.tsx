"use client";

import { Draggable } from "@fragiola/dnd-react/draggable";
import { Droppable } from "@fragiola/dnd-react/droppable";
import { Lock } from "lucide-react";
import { useState } from "react";
import { type Board, moveTask, taskOf } from "../_kit/tasks";
import * as styles from "./styles";

// Every look of a drag, from outside: the packages set `translate` while a card follows the
// pointer and the `data-dnd-*` attributes, and `styles.ts` does the rest. The lift (a tilt, a
// scale, a deeper shadow) uses the CSS `scale` and `rotate` properties, which compose with the
// `translate` the core writes. A cancelled drag glides home: the card's transition includes
// `translate` except while it is dragged (see `styles.card`).

type Column = "ready" | "review" | "locked";

const COLUMNS: { id: Column; title: string; locked?: true }[] = [
    { id: "ready", title: "Ready" },
    { id: "review", title: "In review" },
    { id: "locked", title: "Frozen", locked: true },
];

const START: Board<Column> = {
    ready: ["login", "avatar", "typo"],
    review: ["export"],
    locked: ["guide"],
};

const refuseAll = () => false;

export default function StylingShowcase() {
    const [board, setBoard] = useState(START);
    return (
        <div className={styles.frame}>
            {COLUMNS.map((column) => (
                <Droppable
                    key={column.id}
                    id={column.id}
                    accepts={column.locked ? refuseAll : undefined}
                    className={styles.column}
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
                    <section aria-label={column.title}>
                        <h3 className={styles.columnTitle}>
                            {column.locked ? (
                                <Lock
                                    aria-hidden="true"
                                    className={styles.lock}
                                />
                            ) : null}
                            {column.title}
                            <span className={styles.count}>
                                {board[column.id].length}
                            </span>
                        </h3>
                        {board[column.id].map((id) => {
                            const task = taskOf(id);
                            return (
                                <Draggable
                                    key={id}
                                    id={id}
                                    disabled={column.locked}
                                    className={styles.card}
                                >
                                    <article aria-label={task.title}>
                                        <span className={styles.tag(task.tag)}>
                                            {task.tag}
                                        </span>
                                        <p className={styles.title}>
                                            {task.title}
                                        </p>
                                    </article>
                                </Draggable>
                            );
                        })}
                    </section>
                </Droppable>
            ))}
        </div>
    );
}
