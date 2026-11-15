import { cn } from "#/lib/cn";

export const frame = cn(
    "palette-surface flex h-full flex-col gap-5 overflow-auto [overflow-anchor:none] bg-palette-base p-4 text-palette-contrast",
    "font-(family-name:--dnd-font) text-(length:--dnd-font-size)",
);

export const section = "flex flex-col gap-2";

export const title = cn(
    "px-1 text-palette-accent/85",
    "font-(--dnd-title-weight) [text-transform:var(--dnd-title-transform)] tracking-(--dnd-title-tracking)",
);

/** the shifts animate while a sort runs, never on the dragged item nor at the drop (S4) */
const shifts =
    "data-dnd-sorting:not-data-dnd-dragging:transition-[translate] data-dnd-sorting:not-data-dnd-dragging:duration-(--dnd-motion) motion-reduce:transition-none";

export const avatars = "flex gap-2";

/**
 * Added to the Avatar's own classes (its size, circle and clipping stay its own): a ring, the
 * focus, and the lift while dragged.
 */
export const avatar = cn(
    "size-12 cursor-grab ring-2 ring-palette-line select-none",
    "outline-none focus-visible:outline-(length:--dnd-focus-width) focus-visible:outline-(--dnd-focus-line) focus-visible:outline-offset-2",
    shifts,
    "data-dnd-dragging:z-10 data-dnd-dragging:cursor-grabbing data-dnd-dragging:shadow-(--dnd-lift-shadow) data-dnd-dragging:ring-(--dnd-focus-line)",
);

export const channels = "flex w-96 max-w-full flex-col gap-2";

export const row = cn(
    "palette-raised flex items-center gap-2 rounded-(--dnd-radius) bg-palette-base py-1.5 ps-1.5 pe-3",
    "border-(length:--dnd-border) border-(--dnd-item-line) shadow-(--dnd-shadow)",
    shifts,
    "data-dnd-dragging:relative data-dnd-dragging:z-10 data-dnd-dragging:shadow-(--dnd-lift-shadow)",
);

/** added to the Clickable button's own: the grab cursor and the handle's colour */
export const handle =
    "cursor-grab text-(--dnd-handle-color) data-dnd-dragging:cursor-grabbing";

export const label = "min-w-0 flex-1";
