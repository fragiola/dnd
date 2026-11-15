import { cn } from "#/lib/cn";

export const frame = cn(
    "palette-surface grid h-full place-items-start justify-center overflow-auto bg-palette-base p-4 text-palette-contrast",
    "font-(family-name:--dnd-font) text-(length:--dnd-font-size)",
);

export const list = "flex w-80 max-w-full flex-col gap-2";

/**
 * The item. The core writes the shifts (`translate`); animating them is the app's (S4): the
 * transition on `translate` applies only while a sort runs (`data-dnd-sorting`) and never to the
 * dragged item (it follows the pointer), so the drop (the app's new order and the cleared
 * shifts, in one frame) lands without a glide.
 */
export const item = cn(
    "palette-raised flex cursor-grab items-center gap-3 rounded-(--dnd-radius) bg-palette-base p-(--dnd-item-padding) select-none",
    "border-(length:--dnd-border) border-(--dnd-item-line) shadow-(--dnd-shadow)",
    "outline-none focus-visible:outline-(length:--dnd-focus-width) focus-visible:outline-(--dnd-focus-line) focus-visible:outline-offset-2",
    "data-dnd-sorting:not-data-dnd-dragging:transition-[translate] data-dnd-sorting:not-data-dnd-dragging:duration-(--dnd-motion) data-dnd-sorting:not-data-dnd-dragging:ease-out",
    "data-dnd-dragging:relative data-dnd-dragging:z-10 data-dnd-dragging:cursor-grabbing data-dnd-dragging:shadow-(--dnd-lift-shadow)",
    "motion-reduce:transition-none",
);

export const rank =
    "grid size-6 shrink-0 place-items-center rounded-full bg-palette-soft text-xs text-palette-accent tabular-nums";
