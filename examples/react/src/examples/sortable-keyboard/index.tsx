"use client";

import {
    moveBetween,
    Sortable,
    SortableGroup,
    type SortEvent,
} from "@fragiola/dnd-react/sortable";
import { useRef, useState } from "react";
import { describeSort, type SortNames, useAnnouncer } from "../_kit/announce";
import { type Board, taskOf } from "../_kit/tasks";
import * as styles from "./styles";

// Sorting without a pointer. Every item is a tab stop: Space or Enter picks it up, the arrows move
// it one place at a time (past the end of Today, on into Later, which accepts it), Space or Enter
// drops it and Escape puts it back. The words are the app's: the item's sort events go through
// the kit's `describeSort` into a live region, with positions a screen reader can say. An item
// moved into the other list is a new element there (React mounts it under its new parent), so the
// app gives it the focus back; within a list the core refocuses the item itself.

type List = "today" | "later";

const LISTS: { id: List; title: string }[] = [
    { id: "today", title: "Today" },
    { id: "later", title: "Later" },
];

const START: Board<List> = {
    today: ["login", "guide", "typo"],
    later: ["export", "search"],
};

const KEYS = [
    ["Space / Enter", "pick up, then drop"],
    ["Arrows", "move one place"],
    ["Escape", "put back"],
];

const ACCEPTS: List[] = ["today", "later"];

export default function SortableKeyboard() {
    const [board, setBoard] = useState(START);
    const [message, announce] = useAnnouncer(
        "Tab to a task, then press Space to pick it up.",
    );
    const names: SortNames = {
        item: (id) => taskOf(id).title,
        group: (group) =>
            LISTS.find((list) => list.id === group)?.title ?? group,
        size: (group) => board[group as List]?.length ?? 0,
    };
    const say = (event: SortEvent) => announce(describeSort(event, names));
    /** the item to focus once it is mounted in its new list */
    const refocus = useRef<string | number | undefined>(undefined);
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
                {/* the live region: the app's words, from the sort events */}
                <p role="status" aria-live="polite" className={styles.status}>
                    {message}
                </p>
            </div>
            <p id="sortable-keyboard-help" className={styles.help}>
                Press Space or Enter to pick up a task, the arrow keys to move
                it, Space or Enter to drop it and Escape to cancel.
            </p>
            <div className={styles.lists}>
                {LISTS.map((list) => (
                    <section key={list.id} className={styles.column}>
                        <h3 className={styles.title}>{list.title}</h3>
                        <SortableGroup group={list.id} accepts={ACCEPTS}>
                            <ol aria-label={list.title} className={styles.list}>
                                {board[list.id].map((id, index) => (
                                    <Sortable
                                        key={id}
                                        id={id}
                                        index={index}
                                        group={list.id}
                                        accepts={ACCEPTS}
                                        describedBy="sortable-keyboard-help"
                                        onSortStart={say}
                                        onSortOver={say}
                                        onSortEnd={(event) => {
                                            say(event);
                                            if (
                                                event.input === "keyboard" &&
                                                event.to.group !==
                                                    event.from.group
                                            )
                                                refocus.current = event.id;
                                            setBoard((now) =>
                                                moveBetween(now, event),
                                            );
                                        }}
                                    >
                                        <li
                                            ref={(element) => {
                                                if (
                                                    element &&
                                                    refocus.current === id
                                                ) {
                                                    refocus.current = undefined;
                                                    element.focus();
                                                }
                                            }}
                                            aria-label={taskOf(id).title}
                                            className={styles.item}
                                        >
                                            {taskOf(id).title}
                                        </li>
                                    </Sortable>
                                ))}
                            </ol>
                        </SortableGroup>
                    </section>
                ))}
            </div>
        </div>
    );
}
