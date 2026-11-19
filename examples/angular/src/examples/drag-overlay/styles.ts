import { cn } from "#/lib/cn";

export const frame = cn(
    "palette-surface flex h-full flex-col gap-4 overflow-auto bg-palette-base p-4 text-palette-contrast",
    "font-(family-name:--dnd-font) text-(length:--dnd-font-size)",
);

/** a clipping container, narrower than its tags: the reason for the overlay */
export const strip = cn(
    "flex h-12 max-w-md shrink-0 items-center gap-2 overflow-hidden rounded-(--dnd-radius) bg-(--dnd-zone-bg) px-2",
    "border-(length:--dnd-border) border-(--dnd-item-line)",
);

/** while dragged, the tag stays as a placeholder of itself */
export const tag = cn(
    "palette-raised shrink-0 cursor-grab rounded-full bg-palette-base px-3 py-1 select-none",
    "border-(length:--dnd-border) border-(--dnd-item-line)",
    "outline-none focus-visible:outline-(length:--dnd-focus-width) focus-visible:outline-(--dnd-focus-line)",
    "data-dnd-dragging:border-dashed data-dnd-dragging:opacity-50",
);

export const zone = cn(
    "flex min-h-32 flex-wrap content-start items-start gap-2 rounded-(--dnd-radius) p-3 transition-colors duration-(--dnd-motion)",
    "border-(length:--dnd-placeholder-width) border-(--dnd-item-line) [border-style:var(--dnd-placeholder-style)]",
    "data-dnd-active:border-(--dnd-placeholder-line) data-dnd-over:bg-(--dnd-placeholder-bg)",
);

export const hint = "text-palette-accent/70";

export const chosen =
    "palette-blue rounded-full bg-palette-base px-3 py-1 text-palette-contrast";

/** the overlay's box is the dragged tag's: centre the copy in it, above everything */
export const overlay = "z-50 flex items-center";

export const lifted = cn(
    "palette-blue rounded-full bg-palette-base px-3 py-1 text-palette-contrast shadow-(--dnd-lift-shadow)",
    "font-(family-name:--dnd-font) text-(length:--dnd-font-size) rotate-2",
);
