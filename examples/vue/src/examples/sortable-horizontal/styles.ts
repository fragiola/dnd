import { cn } from "#/lib/cn";

/** the scroll container, when narrow: no scroll anchoring on the shifted tools (Firefox would
 * scroll back when the shifts are cleared) */
export const frame = cn(
    "palette-surface flex h-full flex-col items-center justify-center gap-4 overflow-auto [overflow-anchor:none] bg-palette-base p-4 text-palette-contrast",
    "font-(family-name:--dnd-font) text-(length:--dnd-font-size)",
);

export const hint = "text-palette-accent/80";

/** one row, never wrapped: the strategy reads a single line */
export const row = cn(
    "palette-raised flex shrink-0 gap-1.5 rounded-(--dnd-radius) bg-palette-base p-1.5",
    "border-(length:--dnd-border) border-(--dnd-item-line) shadow-(--dnd-shadow)",
);

/** the shifts animate while a sort runs, never on the dragged tool nor at the drop (S4) */
export const tool = cn(
    "flex h-9 shrink-0 cursor-grab items-center gap-2 rounded-[calc(var(--dnd-radius)*0.75)] bg-palette-soft px-3 text-palette-accent select-none [&_svg]:size-4",
    "outline-none focus-visible:outline-(length:--dnd-focus-width) focus-visible:outline-(--dnd-focus-line)",
    "data-dnd-sorting:not-data-dnd-dragging:transition-[translate] data-dnd-sorting:not-data-dnd-dragging:duration-(--dnd-motion) motion-reduce:transition-none",
    "data-dnd-dragging:relative data-dnd-dragging:z-10 data-dnd-dragging:cursor-grabbing data-dnd-dragging:bg-palette-base data-dnd-dragging:text-palette-contrast data-dnd-dragging:shadow-(--dnd-lift-shadow)",
);

export const order = "text-xs text-palette-accent/70";
