import { cn } from "#/lib/cn";

export const frame = cn(
    "palette-surface flex h-full flex-col gap-3 bg-palette-base p-4 text-palette-contrast",
    "font-(family-name:--dnd-font) text-(length:--dnd-font-size)",
);

export const hint = "shrink-0 text-palette-accent/80";

/**
 * the scroll container auto-scroll finds: the nearest one around the card that can scroll.
 * `overflow-anchor: none`: Firefox's scroll anchoring can take the dragged card as its anchor, so
 * when the core clears the card's `translate` after a cancel it scrolls the list back by as much
 * (to the top, from the bottom). Chromium does not; turning anchoring off keeps both still.
 */
export const list = cn(
    "flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain [overflow-anchor:none] rounded-(--dnd-radius) bg-(--dnd-zone-bg) p-2",
    "border-(length:--dnd-border) border-(--dnd-item-line)",
);

export const unplanned =
    "flex min-h-14 items-center px-2 text-palette-accent/70";

export const day = cn(
    "flex min-h-14 shrink-0 items-center gap-3 rounded-(--dnd-radius) px-3 transition-colors duration-(--dnd-motion)",
    "border-(length:--dnd-border) border-(--dnd-item-line) border-dashed",
    "data-dnd-over:border-solid data-dnd-over:border-(--dnd-placeholder-line) data-dnd-over:bg-(--dnd-placeholder-bg)",
);

export const dayName = "w-16 shrink-0 text-palette-accent/80 tabular-nums";

export const card = cn(
    "palette-blue cursor-grab rounded-(--dnd-radius) bg-palette-base px-3 py-2 text-palette-contrast select-none",
    "outline-none focus-visible:outline-(length:--dnd-focus-width) focus-visible:outline-(--dnd-focus-line) focus-visible:outline-offset-2",
    "data-dnd-dragging:relative data-dnd-dragging:z-10 data-dnd-dragging:cursor-grabbing data-dnd-dragging:shadow-(--dnd-lift-shadow)",
);
