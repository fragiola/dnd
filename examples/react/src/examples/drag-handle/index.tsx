"use client";

import { Draggable, DragHandle } from "@fragiola/dnd-react/draggable";
import { Droppable } from "@fragiola/dnd-react/droppable";
import { GripVertical } from "lucide-react";
import { useState } from "react";
import { type Board, moveTask, taskOf } from "../_kit/tasks";
import * as styles from "./styles";

// A `DragHandle` inside a draggable makes the handle the only place a drag starts, and the tab
// stop: the card's text stays selectable. The handle finds its draggable through the DOM, not a
// context, so it can sit anywhere inside the card.

type Column = "todo" | "done";

const COLUMNS: { id: Column; title: string }[] = [
    { id: "todo", title: "To do" },
    { id: "done", title: "Done" },
];

const START: Board<Column> = { todo: ["login", "export", "guide"], done: [] };

export default function DragHandleExample() {
    const [board, setBoard] = useState(START);
    return (
        <div className={styles.frame}>
            {COLUMNS.map((column) => (
                <Droppable
                    key={column.id}
                    id={column.id}
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
                        aria-label={column.title}
                        className={styles.column}
                    >
                        <h3 className={styles.columnTitle}>{column.title}</h3>
                        {board[column.id].map((id) => (
                            <Card key={id} id={id} />
                        ))}
                    </section>
                </Droppable>
            ))}
        </div>
    );
}

function Card({ id }: { id: string }) {
    const task = taskOf(id);
    return (
        <Draggable id={id}>
            <article aria-label={task.title} className={styles.card}>
                <DragHandle>
                    {/* the handle is the tab stop (a button may be a handle): its name is the app's */}
                    <button
                        type="button"
                        aria-label={`Move ${task.title}`}
                        className={styles.handle}
                    >
                        <GripVertical aria-hidden="true" />
                    </button>
                </DragHandle>
                <p className={styles.cardText}>{task.title}</p>
            </article>
        </Draggable>
    );
}
