import { cn } from "#/lib/cn";

export const frame = cn(
    "palette-surface h-full overflow-auto [overflow-anchor:none] bg-palette-base p-4 text-palette-contrast",
    "font-(family-name:--dnd-font) text-(length:--dnd-font-size)",
);

/** `group`: the widgets read whether a swap runs from the grid (`group-has-…` below) */
export const grid = "group grid grid-cols-3 gap-3";

/**
 * The widget. The swap target (`data-dnd-swap-target`, written by the core with its shift) is
 * outlined as a placeholder. Its shift animates while a swap runs (a widget of the grid is
 * `data-dnd-dragging`), never on the dragged widget nor at the drop (S4).
 */
export const widget = cn(
    "palette-raised flex h-28 cursor-grab flex-col justify-between rounded-(--dnd-radius) bg-palette-base p-(--dnd-item-padding) select-none",
    "border-(length:--dnd-border) border-(--dnd-item-line) shadow-(--dnd-shadow)",
    "outline-none focus-visible:outline-(length:--dnd-focus-width) focus-visible:outline-(--dnd-focus-line) focus-visible:outline-offset-2",
    "group-has-[[data-dnd-dragging]]:not-data-dnd-dragging:transition-[translate,background-color] group-has-[[data-dnd-dragging]]:not-data-dnd-dragging:duration-(--dnd-motion) motion-reduce:transition-none",
    "data-dnd-swap-target:border-(--dnd-placeholder-line) data-dnd-swap-target:[border-style:var(--dnd-placeholder-style)] data-dnd-swap-target:bg-(--dnd-placeholder-bg)",
    "data-dnd-dragging:relative data-dnd-dragging:z-10 data-dnd-dragging:cursor-grabbing data-dnd-dragging:shadow-(--dnd-lift-shadow)",
);

export const label =
    "flex items-center gap-2 text-palette-accent [&_svg]:size-4";

export const value = "text-2xl font-semibold tabular-nums";
