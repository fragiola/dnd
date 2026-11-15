"use client";

import {
    arrayMove,
    horizontalList,
    Sortable,
} from "@fragiola/dnd-react/sortable";
import {
    MessageSquare,
    MousePointer2,
    PenLine,
    Shapes,
    Type,
} from "lucide-react";
import { useState } from "react";
import * as styles from "./styles";

// A toolbar the user arranges: the same `Sortable` as a vertical list, with the `horizontalList`
// strategy (an export of its own, so a vertical list never ships it). Items of different widths
// keep their gaps, and in a right-to-left page the row flows from the right.

const TOOLS = {
    select: { label: "Select", Icon: MousePointer2 },
    pen: { label: "Pen", Icon: PenLine },
    shapes: { label: "Shapes", Icon: Shapes },
    text: { label: "Text", Icon: Type },
    comment: { label: "Comment", Icon: MessageSquare },
};

type Tool = keyof typeof TOOLS;

const START: Tool[] = ["select", "pen", "shapes", "text", "comment"];

export default function SortableHorizontal() {
    const [tools, setTools] = useState(START);
    return (
        <div className={styles.frame}>
            <p className={styles.hint}>Drag a tool to rearrange the toolbar.</p>
            <ul aria-label="Toolbar" className={styles.row}>
                {tools.map((tool, index) => {
                    const { label, Icon } = TOOLS[tool];
                    return (
                        <Sortable
                            key={tool}
                            id={tool}
                            index={index}
                            group="toolbar"
                            strategy={horizontalList}
                            onSortEnd={({ from, to, canceled }) => {
                                if (!canceled)
                                    setTools((now) =>
                                        arrayMove(now, from.index, to.index),
                                    );
                            }}
                        >
                            <li aria-label={label} className={styles.tool}>
                                <Icon aria-hidden="true" />
                                {label}
                            </li>
                        </Sortable>
                    );
                })}
            </ul>
            <p className={styles.order}>
                Order: <output aria-label="Order">{tools.join(", ")}</output>
            </p>
        </div>
    );
}
