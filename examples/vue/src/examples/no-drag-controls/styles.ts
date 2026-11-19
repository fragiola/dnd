import { cn } from "#/lib/cn";

export const frame = cn(
    "palette-surface grid h-full grid-cols-1 content-start gap-4 overflow-auto bg-palette-base p-4 text-palette-contrast sm:grid-cols-2",
    "font-(family-name:--dnd-font) text-(length:--dnd-font-size)",
);

export const zone = cn(
    "grid min-h-56 place-items-center rounded-(--dnd-radius) bg-(--dnd-zone-bg) p-4",
    "border-(length:--dnd-border) border-(--dnd-item-line)",
);

export const target = cn(
    "grid min-h-56 place-items-center rounded-(--dnd-radius) p-4 transition-colors duration-(--dnd-motion)",
    "border-(length:--dnd-placeholder-width) border-(--dnd-item-line) [border-style:var(--dnd-placeholder-style)]",
    "data-dnd-active:border-(--dnd-placeholder-line) data-dnd-over:bg-(--dnd-placeholder-bg)",
);

export const hint = "text-palette-accent/70";

export const card = cn(
    "palette-raised flex w-64 cursor-grab flex-col gap-3 rounded-(--dnd-radius) bg-palette-base p-(--dnd-item-padding)",
    "border-(length:--dnd-border) border-(--dnd-item-line) shadow-(--dnd-shadow)",
    "outline-none focus-visible:outline-(length:--dnd-focus-width) focus-visible:outline-(--dnd-focus-line) focus-visible:outline-offset-2",
    "data-dnd-dragging:relative data-dnd-dragging:z-10 data-dnd-dragging:cursor-grabbing data-dnd-dragging:shadow-(--dnd-lift-shadow)",
);

export const input = "w-full";

export const row = "flex items-center justify-between gap-2";

export const switchLabel = "flex items-center gap-2 text-palette-accent";

/** selectable text, and the default cursor: this subtree is not a drag start */
export const notes =
    "cursor-text rounded-[calc(var(--dnd-radius)/2)] bg-palette-soft p-2 text-xs text-palette-accent select-text";
