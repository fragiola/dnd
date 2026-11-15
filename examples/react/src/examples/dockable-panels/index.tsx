"use client";

import { DragOverlay } from "@fragiola/dnd-react";
import { Draggable } from "@fragiola/dnd-react/draggable";
import { Droppable } from "@fragiola/dnd-react/droppable";
import {
    createModel,
    Dockable,
    type Model,
    type RowNode,
    type TabOf,
    type TabsetNode,
    useModelState,
} from "@fragiola/dockable-react";
import { useState } from "react";
import { type NoteTypes, panelsLayout } from "../_kit/dockable";
import { taskOf } from "../_kit/tasks";
import * as styles from "./styles";

// Draggables inside Dockable panels. Dockable moves a panel's content when its tab moves to
// another tabset (or into a popout) without remounting it; dnd measures when a drag starts and
// registers each element in its own document's drag space, so the cards keep dragging wherever
// the panel went. Move the Inbox tab with the button (Dockable's `tab.move` command) or by
// dragging the tab itself (Dockable's own drag), then drag a card to the Archive again. A panel
// clips its content, so the cards stay put (`translate={false}`) and a `DragOverlay` carries a
// copy across the panels.

export default function DockablePanels() {
    const [model] = useState(() => createModel<NoteTypes>(panelsLayout()));
    const [inbox, setInbox] = useState(["login", "export", "guide", "typo"]);
    const [archive, setArchive] = useState<string[]>([]);
    const toArchive = (id: string) => {
        setInbox((now) => now.filter((each) => each !== id));
        setArchive((now) => [...now, id]);
    };
    const panel = (tab: TabOf<NoteTypes>) => {
        if (tab.id === "inbox")
            return (
                <ul aria-label="Inbox cards" className={styles.cards}>
                    {inbox.map((id) => (
                        <Draggable key={id} id={id} translate={false}>
                            <li
                                aria-label={taskOf(id).title}
                                className={styles.card}
                            >
                                {taskOf(id).title}
                            </li>
                        </Draggable>
                    ))}
                </ul>
            );
        if (tab.id === "archive")
            return (
                <Droppable
                    id="archive"
                    onDrop={(event) =>
                        toArchive(String(event.operation.source.id))
                    }
                >
                    <ul aria-label="Archived cards" className={styles.archive}>
                        {archive.length === 0 ? (
                            <li className={styles.hint}>Drop cards here</li>
                        ) : (
                            archive.map((id) => (
                                <li key={id} className={styles.archived}>
                                    {taskOf(id).title}
                                </li>
                            ))
                        )}
                    </ul>
                </Droppable>
            );
        return <p className={styles.note}>{tab.data.text}</p>;
    };
    return (
        <div className={styles.frame}>
            <MoveInbox model={model} />
            <Dockable.Root model={model} className={styles.root}>
                <Dockable.Row<NoteTypes>>{renderNode}</Dockable.Row>
                <Dockable.Panels<NoteTypes>>
                    {(tab) => (
                        <Dockable.Panel node={tab} className={styles.panel}>
                            {panel(tab)}
                        </Dockable.Panel>
                    )}
                </Dockable.Panels>
                <Dockable.DropIndicator className={styles.dropIndicator} />
            </Dockable.Root>
            <DragOverlay>
                {(operation) => (
                    <div className={styles.lifted}>
                        {taskOf(operation.source.id).title}
                    </div>
                )}
            </DragOverlay>
        </div>
    );
}

/** Moves the Inbox tab between the first two tabsets, through Dockable's command. */
function MoveInbox({ model }: { model: Model<NoteTypes> }) {
    const where = useModelState(
        (_state, current) =>
            current.get("node-parent-by", { nodeId: "inbox" })?.id,
        { model },
    );
    const to = where === "start" ? "middle" : "start";
    return (
        <button
            type="button"
            className={styles.move}
            onClick={() => model.run("tab.move", { tabId: "inbox", to })}
        >
            {to === "middle" ? "Move Inbox to the middle" : "Move Inbox back"}
        </button>
    );
}

function renderNode(node: TabsetNode<NoteTypes> | RowNode<NoteTypes>) {
    if (node.type === "row")
        return <Dockable.Row node={node}>{renderNode}</Dockable.Row>;
    return (
        <Dockable.TabSet node={node} className={styles.tabset}>
            <Dockable.TabList<NoteTypes>
                aria-label={`Tabs of ${node.id}`}
                className={styles.tabList}
            >
                {(tab) => (
                    <Dockable.Tab node={tab} className={styles.tab}>
                        {tab.label}
                    </Dockable.Tab>
                )}
            </Dockable.TabList>
            <Dockable.TabSetContent />
        </Dockable.TabSet>
    );
}
