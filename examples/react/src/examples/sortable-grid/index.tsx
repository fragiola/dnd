"use client";

import { arrayMove, grid, Sortable } from "@fragiola/dnd-react/sortable";
import { useState } from "react";
import * as styles from "./styles";

// A grid of swatches the user orders: the `grid` strategy places the dragged tile in reading order
// (rows from the inline start) and moves every tile between its old and new place to the next
// corner. Tiles of one size suit it best. A tile of another row takes the place only once the
// dragged tile is a quarter of its height inside it, so the preview never flickers at a row's edge.

interface Swatch {
    readonly id: string;
    readonly name: string;
    readonly tone: styles.Tone;
}

const START: Swatch[] = [
    { id: "ocean", name: "Ocean", tone: "blue" },
    { id: "ember", name: "Ember", tone: "orange" },
    { id: "moss", name: "Moss", tone: "green" },
    { id: "plum", name: "Plum", tone: "purple" },
    { id: "brick", name: "Brick", tone: "danger" },
    { id: "sky", name: "Sky", tone: "blue" },
    { id: "sand", name: "Sand", tone: "orange" },
    { id: "fern", name: "Fern", tone: "green" },
    { id: "iris", name: "Iris", tone: "purple" },
    { id: "rust", name: "Rust", tone: "danger" },
];

export default function SortableGrid() {
    const [swatches, setSwatches] = useState(START);
    return (
        <div className={styles.frame}>
            <ul aria-label="Swatches" className={styles.grid}>
                {swatches.map((swatch, index) => (
                    <Sortable
                        key={swatch.id}
                        id={swatch.id}
                        index={index}
                        group="swatches"
                        strategy={grid}
                        onSortEnd={({ from, to, canceled }) => {
                            if (!canceled)
                                setSwatches((now) =>
                                    arrayMove(now, from.index, to.index),
                                );
                        }}
                    >
                        <li aria-label={swatch.name} className={styles.tile}>
                            <span className={styles.chip(swatch.tone)} />
                            {swatch.name}
                        </li>
                    </Sortable>
                ))}
            </ul>
        </div>
    );
}
