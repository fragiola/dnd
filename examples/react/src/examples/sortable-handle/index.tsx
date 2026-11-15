"use client";

import { arrayMove, DragHandle, Sortable } from "@fragiola/dnd-react/sortable";
import { GripVertical } from "lucide-react";
import { useState } from "react";
import { taskOf } from "../_kit/tasks";
import * as styles from "./styles";

// The same `DragHandle` as a draggable's, from the sortable entry: inside a `Sortable` it is the
// only place a sort starts, and the tab stop, so the row's text stays selectable. It finds its
// item through the DOM, so it can sit anywhere inside the row.

const START = ["guide", "api", "login", "flaky"];

export default function SortableHandle() {
    const [tasks, setTasks] = useState(START);
    return (
        <div className={styles.frame}>
            <ol aria-label="Release checklist" className={styles.list}>
                {tasks.map((id, index) => (
                    <Sortable
                        key={id}
                        id={id}
                        index={index}
                        group="checklist"
                        onSortEnd={({ from, to, canceled }) => {
                            if (!canceled)
                                setTasks((now) =>
                                    arrayMove(now, from.index, to.index),
                                );
                        }}
                    >
                        <li
                            aria-label={taskOf(id).title}
                            className={styles.row}
                        >
                            <DragHandle>
                                {/* the handle's name is the app's */}
                                <button
                                    type="button"
                                    aria-label={`Move ${taskOf(id).title}`}
                                    className={styles.handle}
                                >
                                    <GripVertical aria-hidden="true" />
                                </button>
                            </DragHandle>
                            <p className={styles.text}>{taskOf(id).title}</p>
                        </li>
                    </Sortable>
                ))}
            </ol>
        </div>
    );
}
