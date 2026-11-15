"use client";

import { Draggable } from "@fragiola/dnd-react/draggable";
import { Droppable } from "@fragiola/dnd-react/droppable";
import { type ReactNode, useState } from "react";
import * as styles from "./styles";

// No provider: the tray and the box below are siblings with nothing around them. A `Draggable`
// and a `Droppable` meet through the drag space of their document, created on first use. Neither
// wrapper renders an element: each adds its behaviour to the one element it wraps.

type Place = "tray" | "box";

export default function HelloDnd() {
    const [place, setPlace] = useState<Place>("tray");
    return (
        <div className={styles.frame}>
            <Tray>{place === "tray" ? <Card /> : null}</Tray>
            <Box onDrop={() => setPlace("box")}>
                {place === "box" ? <Card /> : null}
            </Box>
            <p role="status" className={styles.status}>
                {place === "tray"
                    ? "The card is in the tray: drag it into the box."
                    : "The card is in the box."}
            </p>
        </div>
    );
}

/** The card: a plain `article`, made draggable by the wrapper around it. */
function Card() {
    return (
        <Draggable id="card" type="card">
            <article aria-label="Card" className={styles.card}>
                <span className={styles.cardTitle}>Drag me</span>
                <span className={styles.cardHint}>
                    a plain element, wrapped
                </span>
            </article>
        </Draggable>
    );
}

/** Where the card starts: a component of its own, unaware of the box. */
function Tray({ children }: { children: ReactNode }) {
    return (
        <section aria-label="Tray" className={styles.tray}>
            {children}
        </section>
    );
}

/** The drop target: another component, in another part of the tree. */
function Box({
    onDrop,
    children,
}: {
    onDrop: () => void;
    children: ReactNode;
}) {
    return (
        <Droppable id="box" accepts={["card"]} onDrop={onDrop}>
            <section aria-label="Box" className={styles.box}>
                {children ?? <span className={styles.boxHint}>Drop here</span>}
            </section>
        </Droppable>
    );
}
