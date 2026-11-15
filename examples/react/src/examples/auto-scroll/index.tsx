"use client";

import { autoScroll } from "@fragiola/dnd-react";
import { Draggable } from "@fragiola/dnd-react/draggable";
import { Droppable } from "@fragiola/dnd-react/droppable";
import { useState } from "react";
import * as styles from "./styles";

// Auto-scroll is opt-in: a strategy from the shared entry, given to each draggable that needs it,
// so an app that never imports `autoScroll` never ships it. Held near the top or bottom edge of
// the list, the card scrolls the list, faster the closer it gets to the edge.

const scroll = autoScroll({ threshold: 56, speed: 14 });

const DAYS = Array.from({ length: 24 }, (_, index) => `Day ${index + 1}`);

export default function AutoScroll() {
    const [day, setDay] = useState<string | undefined>(undefined);
    const card = (
        <Draggable id="meeting" autoScroll={scroll}>
            <article aria-label="Meeting" className={styles.card}>
                Meeting
            </article>
        </Draggable>
    );
    return (
        <div className={styles.frame}>
            <p className={styles.hint}>
                Drag the meeting toward the bottom edge of the list: it scrolls.
            </p>
            <ul aria-label="Days" className={styles.list}>
                <li className={styles.unplanned}>
                    {day === undefined ? card : <span>Unplanned</span>}
                </li>
                {DAYS.map((name) => (
                    <Droppable key={name} id={name} onDrop={() => setDay(name)}>
                        <li aria-label={name} className={styles.day}>
                            <span className={styles.dayName}>{name}</span>
                            {day === name ? card : null}
                        </li>
                    </Droppable>
                ))}
            </ul>
        </div>
    );
}
