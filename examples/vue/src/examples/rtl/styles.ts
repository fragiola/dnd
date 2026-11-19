import { cn } from "#/lib/cn";

// Logical properties only (`ps-`, `border-s`, `start-`): the same classes read right to left.

export const frame = cn(
    "palette-surface grid h-full grid-cols-3 content-start gap-3 overflow-auto bg-palette-base p-4 text-palette-contrast",
    "font-(family-name:--dnd-font) text-(length:--dnd-font-size)",
);

export const column = cn(
    "flex min-h-64 flex-col gap-2 rounded-(--dnd-radius) bg-(--dnd-zone-bg) p-3 transition-colors duration-(--dnd-motion)",
    "border-(length:--dnd-border) border-(--dnd-item-line)",
    "data-dnd-over:border-(--dnd-placeholder-line) data-dnd-over:bg-(--dnd-placeholder-bg)",
);

export const columnTitle =
    "ps-1 font-(--dnd-title-weight) text-palette-accent/85";

/** the accent stripe on the inline start: the right edge here */
export const card = cn(
    "palette-raised cursor-grab rounded-(--dnd-radius) bg-palette-base p-(--dnd-item-padding) select-none",
    "border-(length:--dnd-border) border-s-4 border-(--dnd-item-line) border-s-(--dnd-focus-line) shadow-(--dnd-shadow)",
    "outline-none focus-visible:outline-(length:--dnd-focus-width) focus-visible:outline-(--dnd-focus-line) focus-visible:outline-offset-2",
    "data-dnd-dragging:relative data-dnd-dragging:z-10 data-dnd-dragging:cursor-grabbing data-dnd-dragging:shadow-(--dnd-lift-shadow)",
);
