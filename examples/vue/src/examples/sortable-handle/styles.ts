import { cn } from "#/lib/cn";

export const frame = cn(
    "palette-surface grid h-full place-items-start justify-center overflow-auto [overflow-anchor:none] bg-palette-base p-4 text-palette-contrast",
    "font-(family-name:--dnd-font) text-(length:--dnd-font-size)",
);

export const list = "flex w-96 max-w-full flex-col gap-2";

/** the shifts animate while a sort runs, never on the dragged row nor at the drop (S4) */
export const row = cn(
    "palette-raised flex items-center gap-2 rounded-(--dnd-radius) bg-palette-base p-(--dnd-item-padding)",
    "border-(length:--dnd-border) border-(--dnd-item-line) shadow-(--dnd-shadow)",
    "data-dnd-sorting:not-data-dnd-dragging:transition-[translate] data-dnd-sorting:not-data-dnd-dragging:duration-(--dnd-motion) motion-reduce:transition-none",
    "data-dnd-dragging:relative data-dnd-dragging:z-10 data-dnd-dragging:shadow-(--dnd-lift-shadow)",
);

/** the grip: a finger-sized target; `touch-action: none` is set by the package (structural) */
export const handle = cn(
    "-ms-1 grid size-[calc(var(--dnd-handle-size)+0.75rem)] shrink-0 cursor-grab place-items-center rounded-[calc(var(--dnd-radius)/2)]",
    "text-(--dnd-handle-color) hover:bg-palette-soft [&_svg]:size-(--dnd-handle-size)",
    "outline-none focus-visible:outline-(length:--dnd-focus-width) focus-visible:outline-(--dnd-focus-line)",
    "data-dnd-dragging:cursor-grabbing",
);

/** the text stays selectable: only the handle starts a sort */
export const text = "min-w-0 flex-1 select-text";
