"use client";

import { arrayMove, Sortable } from "@fragiola/dnd-react/sortable";
import { useState } from "react";
import { taskOf } from "../_kit/tasks";
import * as styles from "./styles";

// A sortable list with no wrapper around it: each `li` is a `Sortable` of the group "tasks", at
// its index in the app's array. While a card is dragged the core shifts its neighbours with
// `translate` (the app's CSS animates them, see styles.ts); nothing renders. On the drop the app
// applies `onSortEnd` to its own array with `arrayMove`, and the DOM follows the new order.

const START = ["login", "export", "guide", "avatar", "typo"];

export default function SortableList() {
    const [tasks, setTasks] = useState(START);
    return (
        <div className={styles.frame}>
            <ul aria-label="Tasks" className={styles.list}>
                {tasks.map((id, index) => (
                    <Sortable
                        key={id}
                        id={id}
                        index={index}
                        group="tasks"
                        onSortEnd={({ from, to, canceled }) => {
                            if (!canceled)
                                setTasks((now) =>
                                    arrayMove(now, from.index, to.index),
                                );
                        }}
                    >
                        <li
                            aria-label={taskOf(id).title}
                            className={styles.item}
                        >
                            <span className={styles.rank}>{index + 1}</span>
                            {taskOf(id).title}
                        </li>
                    </Sortable>
                ))}
            </ul>
        </div>
    );
}
