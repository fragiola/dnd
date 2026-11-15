"use client";

import { useDragSpace } from "@fragiola/dnd-react";
import { Draggable } from "@fragiola/dnd-react/draggable";
import { Droppable } from "@fragiola/dnd-react/droppable";
import {
    createModel,
    Dockable,
    type Model,
    type RowNode,
    type TabsetNode,
} from "@fragiola/dockable-react";
import { type ReactNode, useEffect, useState } from "react";
import {
    limitTabs,
    MAX_TABS,
    type NoteTypes,
    notesLayout,
} from "../_kit/dockable";
import * as styles from "./styles";

// Drag a card onto a Dockable tabset and it opens as a tab. The `Droppable` wraps the
// `Dockable.TabSet` element itself (it forwards props and ref, as every Fragiola primitive does),
// and its `onDrop` runs Dockable's own command, `model.run("tab.add", …)`: the drop goes through
// Dockable's rules like any other change. One of them, written as a Dockable middleware in the
// kit, caps a tabset at three tabs. A dnd drop middleware (`space.use`) asks Dockable the same
// question with `model.can`, so a full tabset is refused while the card hovers it, not after.

const CARDS = ["Roadmap", "Budget", "Hiring", "Retro"];

/** What a card dropped on `tabset` adds. */
const newTab = (label: string, tabset: string) => ({
    component: "note" as const,
    label,
    data: { text: `${label}: opened from a dnd card.` },
    to: tabset,
});

export default function DockableNewTab() {
    const [model] = useState(() => createModel<NoteTypes>(notesLayout()));
    const space = useDragSpace();
    // Dockable's rule, in Dockable
    useEffect(() => limitTabs(model), [model]);
    // the cross-library rule: dnd asks Dockable before it lets a card drop on a tabset
    useEffect(
        () =>
            space?.use((ctx, next) => {
                const tabset = String(ctx.payload.droppableId);
                if (model.get("node-by", { id: tabset })?.type !== "tabset")
                    return next();
                return model.can(
                    "tab.add",
                    newTab(String(ctx.source.data), tabset),
                )
                    ? next()
                    : {
                          ok: false,
                          error: {
                              code: "vetoed",
                              message: "That tabset is full.",
                          },
                      };
            }),
        [space, model],
    );
    const [renderNode] = useState(() => layout(model));
    return (
        <div className={styles.frame}>
            <div className={styles.toolbar}>
                <ul aria-label="Cards" className={styles.cards}>
                    {CARDS.map((card) => (
                        <Draggable key={card} id={card} type="card" data={card}>
                            <li aria-label={card} className={styles.card}>
                                {card}
                            </li>
                        </Draggable>
                    ))}
                </ul>
                <span className={styles.hint}>
                    {`At most ${MAX_TABS} tabs per tabset`}
                </span>
            </div>
            <Dockable.Root model={model} className={styles.root}>
                <Dockable.Row<NoteTypes>>{renderNode}</Dockable.Row>
                <Dockable.Panels<NoteTypes>>
                    {(tab) => (
                        <Dockable.Panel node={tab} className={styles.panel}>
                            <p>{tab.data.text}</p>
                        </Dockable.Panel>
                    )}
                </Dockable.Panels>
            </Dockable.Root>
        </div>
    );
}

/** The developer owns Dockable's recursion: each tabset is wrapped in a `Droppable`. */
function layout(model: Model<NoteTypes>) {
    const renderNode = (
        node: TabsetNode<NoteTypes> | RowNode<NoteTypes>,
    ): ReactNode => {
        if (node.type === "row")
            return <Dockable.Row node={node}>{renderNode}</Dockable.Row>;
        return (
            <Droppable
                id={node.id}
                accepts={["card"]}
                onDrop={(event) =>
                    model.run(
                        "tab.add",
                        newTab(String(event.operation.source.data), node.id),
                    )
                }
            >
                <Dockable.TabSet node={node} className={styles.tabset}>
                    <div className={styles.strip}>
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
                        <span aria-hidden="true" className={styles.full}>
                            Full
                        </span>
                    </div>
                    <Dockable.TabSetContent />
                </Dockable.TabSet>
            </Droppable>
        );
    };
    return renderNode;
}
