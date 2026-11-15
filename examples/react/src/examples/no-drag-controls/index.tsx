"use client";

import { Draggable } from "@fragiola/dnd-react/draggable";
import { Droppable } from "@fragiola/dnd-react/droppable";
import { useState } from "react";
import { Clickable } from "#/components/atoms/clickable";
import { Input } from "#/components/atoms/fields";
import { Switch } from "#/components/ui/switch";
import * as styles from "./styles";

// The whole card drags, but its controls keep working: inputs, textareas, selects, buttons and
// editable content never start a drag, and a `data-dnd-no-drag` subtree opts out too (here, the
// notes, so their text can be selected with the mouse).

export default function NoDragControls() {
    const [shipped, setShipped] = useState(false);
    const [votes, setVotes] = useState(0);
    const [urgent, setUrgent] = useState(false);
    const [title, setTitle] = useState("Release notes");
    const card = (
        <Draggable id="release">
            <article aria-label="Release card" className={styles.card}>
                <Input
                    aria-label="Title"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    className={styles.input}
                />
                <div className={styles.row}>
                    <Clickable.Button
                        variant="outline"
                        size="sm"
                        onClick={() => setVotes((n) => n + 1)}
                    >
                        {`Upvote (${votes})`}
                    </Clickable.Button>
                    <div className={styles.switchLabel}>
                        <Switch.Root
                            checked={urgent}
                            onCheckedChange={setUrgent}
                            aria-label="Urgent"
                        >
                            <Switch.Thumb />
                        </Switch.Root>
                        Urgent
                    </div>
                </div>
                <p data-dnd-no-drag="" className={styles.notes}>
                    These notes opt out with data-dnd-no-drag: select this text
                    with the mouse. Drag the card by its empty space.
                </p>
            </article>
        </Draggable>
    );
    return (
        <div className={styles.frame}>
            <section aria-label="Drafts" className={styles.zone}>
                {shipped ? null : card}
            </section>
            <Droppable id="shipped" onDrop={() => setShipped(true)}>
                <section aria-label="Shipped" className={styles.target}>
                    {shipped ? (
                        card
                    ) : (
                        <span className={styles.hint}>Shipped</span>
                    )}
                </section>
            </Droppable>
        </div>
    );
}
