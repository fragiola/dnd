import { cn } from "#/lib/cn";

export const frame = cn(
    "palette-surface mx-auto flex h-full w-full max-w-sm flex-col gap-3 bg-palette-base p-3 text-palette-contrast",
    "font-(family-name:--dnd-font) text-(length:--dnd-font-size)",
);

/** stays in view above the list, the place a held item is dragged to */
export const basket = cn(
    "flex min-h-20 shrink-0 items-center rounded-(--dnd-radius) p-3 transition-colors duration-(--dnd-motion)",
    "border-(length:--dnd-placeholder-width) border-(--dnd-item-line) [border-style:var(--dnd-placeholder-style)]",
    "data-dnd-active:border-(--dnd-placeholder-line) data-dnd-over:bg-(--dnd-placeholder-bg)",
);

export const basketTitle = "text-palette-accent";

/** the list scrolls by touch: nothing here sets `touch-action` */
export const list = cn(
    "flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto rounded-(--dnd-radius) bg-(--dnd-zone-bg) p-2",
    "border-(length:--dnd-border) border-(--dnd-item-line)",
);

/** big enough for a finger; no text selection or callout on a long press */
export const item = cn(
    "palette-raised flex min-h-12 shrink-0 items-center rounded-(--dnd-radius) bg-palette-base px-4 select-none [-webkit-touch-callout:none]",
    "border-(length:--dnd-border) border-(--dnd-item-line) shadow-(--dnd-shadow)",
    "outline-none focus-visible:outline-(length:--dnd-focus-width) focus-visible:outline-(--dnd-focus-line)",
    "data-dnd-dragging:relative data-dnd-dragging:z-10 data-dnd-dragging:scale-105 data-dnd-dragging:shadow-(--dnd-lift-shadow)",
);
