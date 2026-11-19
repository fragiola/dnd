// The Dockable glue of the integration examples: the layouts, and Dockable's own rule (a tabset
// holds at most a few tabs) written as a Dockable middleware. App code (D11, D14): the dnd
// packages never import Dockable, and nothing here imports dnd; the examples wire the two.

import type { LayoutJson, Model } from "@fragiola/dockable-vue";

/** What the layouts hold: notes with a text. */
export type NoteTypes = { tabs: { note: { text: string } } };

/** The most tabs a tabset of the new-tab example takes. */
export const MAX_TABS = 3;

/** Two tabsets side by side, one note each. */
export function notesLayout(): LayoutJson<NoteTypes> {
    return {
        version: 1,
        root: {
            type: "row",
            children: [
                {
                    type: "tabset",
                    id: "drafts",
                    children: [
                        {
                            component: "note",
                            label: "Welcome",
                            data: {
                                text: "Drop a card on a tabset to open it as a tab.",
                            },
                        },
                    ],
                },
                {
                    type: "tabset",
                    id: "review",
                    children: [
                        {
                            component: "note",
                            label: "Review",
                            data: {
                                text: "This tabset takes three tabs at most.",
                            },
                        },
                    ],
                },
            ],
        },
    };
}

/** Three tabsets: the inbox (cards), notes, and the archive (a drop target). */
export function panelsLayout(): LayoutJson<NoteTypes> {
    return {
        version: 1,
        root: {
            type: "row",
            children: [
                {
                    type: "tabset",
                    id: "start",
                    children: [
                        {
                            id: "inbox",
                            component: "note",
                            label: "Inbox",
                            data: { text: "" },
                        },
                    ],
                },
                {
                    type: "tabset",
                    id: "middle",
                    children: [
                        {
                            id: "about",
                            component: "note",
                            label: "About",
                            data: {
                                text: "Drag a card to the Archive. Then move the Inbox tab (with the button, or by dragging the tab) and drag again: the cards keep working.",
                            },
                        },
                    ],
                },
                {
                    type: "tabset",
                    id: "end",
                    children: [
                        {
                            id: "archive",
                            component: "note",
                            label: "Archive",
                            data: { text: "" },
                        },
                    ],
                },
            ],
        },
    };
}

/**
 * Dockable's rule, in Dockable: `tab.add` into a tabset that already holds `max` tabs is refused.
 * `model.can("tab.add", …)` answers it without adding anything. Returns the removal.
 */
export function limitTabs(model: Model<NoteTypes>, max = MAX_TABS): () => void {
    return model.use((ctx, next) => {
        if (ctx.command !== "tab.add") return next();
        const target = ctx.get("node-by", { id: ctx.payload.to });
        if (target?.type === "tabset" && target.children.length >= max) {
            return {
                ok: false,
                error: {
                    code: "refused",
                    message: `A tabset holds at most ${max} tabs.`,
                },
            };
        }
        return next();
    });
}

/** Two tabsets for the sortable lists (the playlist and the queue), and a note between them. */
export function playlistLayout(): LayoutJson<NoteTypes> {
    return {
        version: 1,
        root: {
            type: "row",
            children: [
                {
                    type: "tabset",
                    id: "start",
                    children: [
                        {
                            id: "playlist",
                            component: "note",
                            label: "Playlist",
                            data: { text: "" },
                        },
                    ],
                },
                {
                    type: "tabset",
                    id: "middle",
                    children: [
                        {
                            id: "about",
                            component: "note",
                            label: "About",
                            data: {
                                text: "Sort the playlist, or drag a song into the queue. Then move the Playlist tab (with the button, or by dragging the tab) and sort again: the list keeps working.",
                            },
                        },
                    ],
                },
                {
                    type: "tabset",
                    id: "end",
                    children: [
                        {
                            id: "queue",
                            component: "note",
                            label: "Queue",
                            data: { text: "" },
                        },
                    ],
                },
            ],
        },
    };
}
