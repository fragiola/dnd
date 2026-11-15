"use client";

import { useDragMonitor } from "@fragiola/dnd-react";
import { Draggable } from "@fragiola/dnd-react/draggable";
import { Droppable } from "@fragiola/dnd-react/droppable";
import { useState } from "react";
import { Switch } from "#/components/ui/switch";
import { describeDrag, useAnnouncer } from "../_kit/announce";
import { type Board, moveTask, taskOf } from "../_kit/tasks";
import * as styles from "./styles";

// Every card is a tab stop. Space or Enter grabs it; the arrows move it, to the next column in
// reading order ("targets" mode) or 25 px at a time ("step" mode); Space or Enter drops it, and
// Escape puts it back. The words a screen reader hears are the app's: `useDragMonitor` reports
// every drag of the page, and the kit turns each event into a sentence for the live region.

type Column = "backlog" | "doing" | "done";

const COLUMNS: { id: Column; title: string }[] = [
    { id: "backlog", title: "Backlog" },
    { id: "doing", title: "Doing" },
    { id: "done", title: "Done" },
];

const START: Board<Column> = {
    backlog: ["login", "export"],
    doing: ["guide"],
    done: [],
};

const KEYS = [
    ["Space / Enter", "grab, then drop"],
    ["Arrows", "move"],
    ["Escape", "put back"],
];

const nameOf = (id: string | number) =>
    COLUMNS.find((column) => column.id === id)?.title ?? taskOf(id).title;

export default function Keyboard() {
    const [board, setBoard] = useState(START);
    const [targets, setTargets] = useState(true);
    const [message, announce] = useAnnouncer(
        "Tab to a card, then press Space to grab it.",
    );
    useDragMonitor((event) => announce(describeDrag(event, nameOf)));
    return (
        <div className={styles.frame}>
            <div className={styles.panel}>
                <ul aria-label="Keys" className={styles.keys}>
                    {KEYS.map(([key, does]) => (
                        <li key={key} className={styles.keyRow}>
                            <kbd className={styles.key}>{key}</kbd>
                            {does}
                        </li>
                    ))}
                </ul>
                <div className={styles.mode}>
                    <Switch.Root
                        checked={targets}
                        onCheckedChange={setTargets}
                        aria-label="Jump between columns"
                    >
                        <Switch.Thumb />
                    </Switch.Root>
                    {targets
                        ? "Arrows jump between columns"
                        : "Arrows move 25 px"}
                </div>
                {/* the live region: the app's words, from the drag events */}
                <p role="status" aria-live="polite" className={styles.status}>
                    {message}
                </p>
            </div>
            <p id="keyboard-help" className={styles.help}>
                Press Space or Enter to grab a card, the arrow keys to move it,
                Space or Enter to drop it and Escape to cancel.
            </p>
            <div className={styles.columns}>
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
                            <h3 className={styles.columnTitle}>
                                {column.title}
                            </h3>
                            {board[column.id].map((id) => (
                                <Draggable
                                    key={id}
                                    id={id}
                                    keyboard={{
                                        mode: targets ? "targets" : "step",
                                    }}
                                    describedBy="keyboard-help"
                                >
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
        </div>
    );
}
