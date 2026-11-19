// What a card dropped on a tabset adds: Dockable's `tab.add` payload.

/** The tab a card labelled `label` opens in `tabset`. */
export const newTab = (label: string, tabset: string) => ({
    component: "note" as const,
    label,
    data: { text: `${label}: opened from a dnd card.` },
    to: tabset,
});
