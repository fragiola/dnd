import { cn } from "#/lib/cn";

export const frame = cn(
    "palette-surface grid h-full grid-cols-1 content-start gap-4 overflow-auto bg-palette-base p-4 text-palette-contrast md:grid-cols-2",
    "font-(family-name:--dnd-font) text-(length:--dnd-font-size)",
);

export const board = cn(
    "flex flex-col gap-3 rounded-(--dnd-radius) p-3",
    "border-(length:--dnd-border) border-(--dnd-item-line)",
);

export const boardTitle = cn(
    "font-(--dnd-title-weight) [text-transform:var(--dnd-title-transform)] tracking-(--dnd-title-tracking)",
);

export const columns = "grid grid-cols-2 gap-3";

/** only a column of the dragged card's own scope ever lights up */
export const column = cn(
    "flex min-h-48 flex-col gap-2 rounded-(--dnd-radius) bg-(--dnd-zone-bg) p-2 transition-colors duration-(--dnd-motion)",
    "border-(length:--dnd-border) border-transparent",
    "data-dnd-active:border-(--dnd-placeholder-line) data-dnd-over:bg-(--dnd-placeholder-bg)",
);

export const columnTitle = "px-1 text-xs text-palette-accent/80";

export const card = cn(
    "palette-raised cursor-grab rounded-(--dnd-radius) bg-palette-base p-(--dnd-item-padding) select-none",
    "border-(length:--dnd-border) border-(--dnd-item-line) shadow-(--dnd-shadow)",
    "outline-none focus-visible:outline-(length:--dnd-focus-width) focus-visible:outline-(--dnd-focus-line)",
    "data-dnd-dragging:relative data-dnd-dragging:z-10 data-dnd-dragging:cursor-grabbing data-dnd-dragging:shadow-(--dnd-lift-shadow)",
);
