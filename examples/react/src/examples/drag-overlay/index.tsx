"use client";

import { DragOverlay } from "@fragiola/dnd-react";
import { Draggable } from "@fragiola/dnd-react/draggable";
import { Droppable } from "@fragiola/dnd-react/droppable";
import { useState } from "react";
import * as styles from "./styles";

// The strip of tags clips its content (`overflow: hidden`, as a tab row does): a tag moved by its
// own `translate` would vanish at the strip's edge. So the tags keep still (`translate={false}`)
// and a `DragOverlay` shows a copy under the pointer, portalled into the document's body. The
// overlay is the one part that renders an element, a `div` fixed over the dragged box; what is
// inside it, and how it looks, is the app's.

const TAGS = [
    "Design",
    "Research",
    "Frontend",
    "Backend",
    "Ops",
    "Writing",
    "QA",
];

export default function DragOverlayExample() {
    const [favourites, setFavourites] = useState<string[]>([]);
    return (
        <div className={styles.frame}>
            <ul aria-label="Tags" className={styles.strip}>
                {TAGS.map((tag) => (
                    <Draggable key={tag} id={tag} translate={false}>
                        <li aria-label={tag} className={styles.tag}>
                            {tag}
                        </li>
                    </Draggable>
                ))}
            </ul>
            <Droppable
                id="favourites"
                onDrop={(event) => {
                    const tag = String(event.operation.source.id);
                    setFavourites((now) =>
                        now.includes(tag) ? now : [...now, tag],
                    );
                }}
            >
                <section aria-label="Favourites" className={styles.zone}>
                    {favourites.length === 0 ? (
                        <span className={styles.hint}>Drop tags here</span>
                    ) : (
                        favourites.map((tag) => (
                            <span key={tag} className={styles.chosen}>
                                {tag}
                            </span>
                        ))
                    )}
                </section>
            </Droppable>
            {/* Anywhere in the tree: it shows while a drag of this document runs. */}
            <DragOverlay className={styles.overlay}>
                {(operation) => (
                    <span className={styles.lifted}>
                        {String(operation.source.id)}
                    </span>
                )}
            </DragOverlay>
        </div>
    );
}
