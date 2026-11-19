import { cn } from "#/lib/cn";

export const frame = cn(
    "palette-surface grid h-full grid-cols-2 content-start gap-4 overflow-auto bg-palette-base p-4 text-palette-contrast",
    "font-(family-name:--dnd-font) text-(length:--dnd-font-size)",
);

export const column = cn(
    "flex min-h-64 flex-col gap-2 rounded-(--dnd-radius) bg-(--dnd-zone-bg) p-3 transition-colors duration-(--dnd-motion)",
    "border-(length:--dnd-border) border-(--dnd-item-line)",
    "data-dnd-over:border-(--dnd-placeholder-line) data-dnd-over:bg-(--dnd-placeholder-bg)",
);

export const columnTitle = cn(
    "px-1 text-palette-accent/85",
    "font-(--dnd-title-weight) [text-transform:var(--dnd-title-transform)] tracking-(--dnd-title-tracking)",
);

export const card = cn(
    "palette-raised flex items-start gap-2 rounded-(--dnd-radius) bg-palette-base p-(--dnd-item-padding)",
    "border-(length:--dnd-border) border-(--dnd-item-line) shadow-(--dnd-shadow)",
    "data-dnd-dragging:relative data-dnd-dragging:z-10 data-dnd-dragging:shadow-(--dnd-lift-shadow)",
);

/** the grip: a finger-sized target; `touch-action: none` is set by the package (structural) */
export const handle = cn(
    "-ms-1 grid size-[calc(var(--dnd-handle-size)+0.75rem)] shrink-0 cursor-grab place-items-center rounded-[calc(var(--dnd-radius)/2)]",
    "text-(--dnd-handle-color) hover:bg-palette-soft [&_svg]:size-(--dnd-handle-size)",
    "outline-none focus-visible:outline-(length:--dnd-focus-width) focus-visible:outline-(--dnd-focus-line)",
    "data-dnd-dragging:cursor-grabbing",
);

/** the text stays selectable: only the handle starts a drag */
export const cardText = "min-w-0 flex-1 pt-0.5 select-text";
