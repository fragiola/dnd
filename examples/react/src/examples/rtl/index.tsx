"use client";

import { Draggable } from "@fragiola/dnd-react/draggable";
import { Droppable } from "@fragiola/dnd-react/droppable";
import { useState } from "react";
import { type Board, moveTask } from "../_kit/tasks";
import * as styles from "./styles";

// Right to left, in Arabic: the packages have nothing to configure. The page lays the columns out
// from the right, the pointer drags where it goes, and with the keyboard's "targets" mode the
// arrows follow reading order (ArrowLeft goes to the next column, toward the inline end), while
// in "step" mode an arrow still moves the card the way it points.

type Column = "todo" | "doing" | "done";

const COLUMNS: { id: Column; title: string }[] = [
    { id: "todo", title: "للتنفيذ" },
    { id: "doing", title: "قيد العمل" },
    { id: "done", title: "منجز" },
];

const TASKS: Record<string, string> = {
    menu: "تصميم القائمة",
    search: "إصلاح البحث",
    docs: "كتابة الدليل",
    tests: "اختبارات الدفع",
};

const START: Board<Column> = {
    todo: ["menu", "search"],
    doing: ["docs"],
    done: ["tests"],
};

export default function Rtl() {
    const [board, setBoard] = useState(START);
    return (
        <div dir="rtl" lang="ar" className={styles.frame}>
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
                            <Draggable
                                key={id}
                                id={id}
                                keyboard={{ mode: "targets" }}
                            >
                                <article
                                    aria-label={TASKS[id]}
                                    className={styles.card}
                                >
                                    {TASKS[id]}
                                </article>
                            </Draggable>
                        ))}
                    </section>
                </Droppable>
            ))}
        </div>
    );
}
