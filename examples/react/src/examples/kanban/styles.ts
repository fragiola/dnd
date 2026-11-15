import { cn } from "#/lib/cn";

/**
 * The board scrolls, the columns do not: a card moved by its own `translate` crosses columns, and
 * a scrolling column would clip it (then use `translate={false}` and a `DragOverlay`). No scroll
 * anchoring on the shifted cards: Firefox would scroll back when the shifts are cleared.
 */
export const frame = cn(
    "palette-surface grid h-full grid-cols-3 items-start gap-3 overflow-auto [overflow-anchor:none] bg-palette-base p-4 text-palette-contrast",
    "font-(family-name:--dnd-font) text-(length:--dnd-font-size)",
);

export const column = cn(
    "flex min-h-72 flex-col gap-2 self-stretch rounded-(--dnd-radius) bg-(--dnd-zone-bg) p-3",
    "border-(length:--dnd-border) border-(--dnd-item-line)",
);

export const title = cn(
    "flex items-center gap-2 px-1 text-palette-accent/85",
    "font-(--dnd-title-weight) [text-transform:var(--dnd-title-transform)] tracking-(--dnd-title-tracking)",
);

export const count =
    "ms-auto rounded-full bg-palette-base px-2 text-xs tabular-nums";

/**
 * The column's list, its group's container: it fills the column, so a card drops below the last
 * one or into an empty column. A group taking part in the sort (the card's own and the ones that
 * accept it) is marked `data-dnd-sorting`; a refusing one is not.
 */
export const list = cn(
    "-m-1 flex flex-1 flex-col gap-2 rounded-(--dnd-radius) p-1",
    "outline-(length:--dnd-placeholder-width) outline-transparent [outline-style:var(--dnd-placeholder-style)] transition-[outline-color] duration-(--dnd-motion)",
    "data-dnd-sorting:outline-(--dnd-placeholder-line)",
);

/** the shifts animate while a sort runs, never on the dragged card nor at the drop (S4) */
export const card = cn(
    "palette-raised flex cursor-grab flex-col items-start gap-1.5 rounded-(--dnd-radius) bg-palette-base p-(--dnd-item-padding) select-none",
    "border-(length:--dnd-border) border-(--dnd-item-line) shadow-(--dnd-shadow)",
    "outline-none focus-visible:outline-(length:--dnd-focus-width) focus-visible:outline-(--dnd-focus-line) focus-visible:outline-offset-2",
    "data-dnd-sorting:not-data-dnd-dragging:transition-[translate] data-dnd-sorting:not-data-dnd-dragging:duration-(--dnd-motion) data-dnd-sorting:not-data-dnd-dragging:ease-out motion-reduce:transition-none",
    "data-dnd-dragging:relative data-dnd-dragging:z-10 data-dnd-dragging:cursor-grabbing data-dnd-dragging:rotate-[1.5deg] data-dnd-dragging:shadow-(--dnd-lift-shadow)",
);

const TAGS = {
    bug: "palette-danger",
    feature: "palette-blue",
    docs: "palette-green",
};

export const tag = (kind: keyof typeof TAGS) =>
    cn(
        TAGS[kind],
        "rounded-full bg-palette-soft px-2 py-0.5 text-xs text-palette-accent",
    );
