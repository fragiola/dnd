import { cn } from "#/lib/cn";

/** `group`: the players read whether a swap runs from the frame (`group-has-…` below) */
export const frame = cn(
    "group palette-surface grid h-full grid-cols-[3fr_2fr] items-start gap-4 overflow-auto [overflow-anchor:none] bg-palette-base p-4 text-palette-contrast",
    "font-(family-name:--dnd-font) text-(length:--dnd-font-size)",
);

export const group = cn(
    "flex flex-col gap-2 rounded-(--dnd-radius) bg-(--dnd-zone-bg) p-3",
    "border-(length:--dnd-border) border-(--dnd-item-line)",
);

export const title = cn(
    "px-1 text-palette-accent/85",
    "font-(--dnd-title-weight) [text-transform:var(--dnd-title-transform)] tracking-(--dnd-title-tracking)",
);

export const players = "flex flex-col gap-2";

/**
 * The swap target (`data-dnd-swap-target`, written by the core) is the placeholder; its shift
 * animates while a swap runs, never on the dragged player nor at the drop (S4).
 */
export const player = cn(
    "palette-raised flex cursor-grab items-center gap-3 rounded-(--dnd-radius) bg-palette-base p-(--dnd-item-padding) select-none",
    "border-(length:--dnd-border) border-(--dnd-item-line) shadow-(--dnd-shadow)",
    "outline-none focus-visible:outline-(length:--dnd-focus-width) focus-visible:outline-(--dnd-focus-line) focus-visible:outline-offset-2",
    "group-has-[[data-dnd-dragging]]:not-data-dnd-dragging:transition-[translate] group-has-[[data-dnd-dragging]]:not-data-dnd-dragging:duration-(--dnd-motion) motion-reduce:transition-none",
    "data-dnd-swap-target:border-(--dnd-placeholder-line) data-dnd-swap-target:[border-style:var(--dnd-placeholder-style)] data-dnd-swap-target:bg-(--dnd-placeholder-bg)",
    "data-dnd-dragging:relative data-dnd-dragging:z-10 data-dnd-dragging:cursor-grabbing data-dnd-dragging:shadow-(--dnd-lift-shadow)",
);

export const number =
    "grid size-6 shrink-0 place-items-center rounded-full bg-palette-soft text-xs text-palette-accent tabular-nums";
