import { cn } from "#/lib/cn";

// Logical properties only (`ps-`, `border-s`): the same classes read right to left.

/** the scroll container: no scroll anchoring on the shifted items (Firefox would scroll back) */
export const frame = cn(
    "palette-surface flex h-full flex-col gap-4 overflow-auto [overflow-anchor:none] bg-palette-base p-4 text-palette-contrast",
    "font-(family-name:--dnd-font) text-(length:--dnd-font-size)",
);

/** the shifts animate while a sort runs, never on the dragged item nor at the drop (S4) */
const shifts =
    "data-dnd-sorting:not-data-dnd-dragging:transition-[translate] data-dnd-sorting:not-data-dnd-dragging:duration-(--dnd-motion) motion-reduce:transition-none";

const focus =
    "outline-none focus-visible:outline-(length:--dnd-focus-width) focus-visible:outline-(--dnd-focus-line) focus-visible:outline-offset-2";

const lifted =
    "data-dnd-dragging:relative data-dnd-dragging:z-10 data-dnd-dragging:cursor-grabbing data-dnd-dragging:shadow-(--dnd-lift-shadow)";

export const tabs = "flex gap-1 self-start border-b border-palette-line";

/** the accent on the inline start: the right edge here */
export const tab = cn(
    "palette-raised -mb-px cursor-grab rounded-t-(--dnd-radius) border-(length:--dnd-border) border-s-4 border-(--dnd-item-line) border-s-(--dnd-focus-line) bg-palette-base px-4 py-2 select-none",
    focus,
    shifts,
    lifted,
);

export const grid = "grid grid-cols-3 gap-3 sm:grid-cols-[repeat(3,9rem)]";

export const app = cn(
    "palette-raised flex h-24 cursor-grab flex-col items-start justify-between rounded-(--dnd-radius) bg-palette-base p-(--dnd-item-padding) select-none",
    "border-(length:--dnd-border) border-(--dnd-item-line) shadow-(--dnd-shadow)",
    focus,
    shifts,
    lifted,
);

export const icon =
    "palette-blue size-8 rounded-[calc(var(--dnd-radius)*0.75)] bg-palette-base";
