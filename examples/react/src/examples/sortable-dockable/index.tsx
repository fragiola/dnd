"use client";

import { DragOverlay } from "@fragiola/dnd-react";
import {
    moveBetween,
    Sortable,
    SortableGroup,
} from "@fragiola/dnd-react/sortable";
import {
    createModel,
    Dockable,
    type Model,
    type RowNode,
    type TabOf,
    type TabsetNode,
    useModelState,
} from "@fragiola/dockable-react";
import { Music } from "lucide-react";
import { useState } from "react";
import { type NoteTypes, playlistLayout } from "../_kit/dockable";
import * as styles from "./styles";

// Sortable lists inside Dockable panels. Dockable moves a panel's content when its tab moves to
// another tabset (or into a popout) without remounting it; dnd measures when a sort starts and
// registers each item in its own document's drag space, so the list keeps sorting wherever the
// panel went. Move the Playlist tab with the button (Dockable's `tab.move`) or by dragging the tab
// (Dockable's own drag), and sort again. The queue accepts songs from the playlist and back. A
// panel clips its content, so the item stays in its list as the placeholder (`translate={false}`,
// the core shifts it to where it lands) and a `DragOverlay` carries a copy across the panels.

type List = "playlist" | "queue";

const SONGS: Record<string, string> = {
    tide: "Low Tide",
    lanterns: "Paper Lanterns",
    north: "Due North",
    static: "Static Bloom",
    quiet: "The Quiet Part",
    orbit: "Slow Orbit",
};

const ACCEPTS: List[] = ["playlist", "queue"];

const TITLES: Record<List, string> = { playlist: "Playlist", queue: "Queue" };

export default function SortableDockable() {
    const [model] = useState(() => createModel<NoteTypes>(playlistLayout()));
    const [lists, setLists] = useState<Record<List, readonly string[]>>({
        playlist: ["tide", "lanterns", "north", "static"],
        queue: ["quiet", "orbit"],
    });
    const list = (group: List) => (
        <SortableGroup group={group} accepts={ACCEPTS}>
            <ol aria-label={TITLES[group]} className={styles.list}>
                {lists[group].map((id, index) => (
                    <Sortable
                        key={id}
                        id={id}
                        index={index}
                        group={group}
                        accepts={ACCEPTS}
                        translate={false}
                        onSortEnd={(event) =>
                            setLists((now) => moveBetween(now, event))
                        }
                    >
                        <li aria-label={SONGS[id]} className={styles.song}>
                            <Music aria-hidden="true" />
                            {SONGS[id]}
                        </li>
                    </Sortable>
                ))}
            </ol>
        </SortableGroup>
    );
    const panel = (tab: TabOf<NoteTypes>) => {
        if (tab.id === "playlist" || tab.id === "queue") return list(tab.id);
        return <p className={styles.note}>{tab.data.text}</p>;
    };
    return (
        <div className={styles.frame}>
            <MovePlaylist model={model} />
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
                        <Music aria-hidden="true" />
                        {SONGS[String(operation.source.id)]}
                    </div>
                )}
            </DragOverlay>
        </div>
    );
}

/** Moves the Playlist tab between the first two tabsets, through Dockable's command. */
function MovePlaylist({ model }: { model: Model<NoteTypes> }) {
    const where = useModelState(
        (_state, current) =>
            current.get("node-parent-by", { nodeId: "playlist" })?.id,
        { model },
    );
    const to = where === "start" ? "middle" : "start";
    return (
        <button
            type="button"
            className={styles.move}
            onClick={() => model.run("tab.move", { tabId: "playlist", to })}
        >
            {to === "middle"
                ? "Move Playlist to the middle"
                : "Move Playlist back"}
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
