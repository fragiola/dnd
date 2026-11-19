import { cn } from "#/lib/cn";

/** the scroll container: no scroll anchoring on the shifted tiles (Firefox would scroll back when
 * the shifts are cleared) */
export const frame = cn(
    "palette-surface h-full overflow-auto [overflow-anchor:none] bg-palette-base p-4 text-palette-contrast",
    "font-(family-name:--dnd-font) text-(length:--dnd-font-size)",
);

/** tiles of one size: the grid strategy moves each to its new place's corner */
export const grid = "grid grid-cols-[repeat(auto-fill,minmax(7rem,1fr))] gap-3";

/** the shifts animate while a sort runs, never on the dragged tile nor at the drop (S4) */
export const tile = cn(
    "palette-raised flex h-24 cursor-grab flex-col justify-between rounded-(--dnd-radius) bg-palette-base p-(--dnd-item-padding) select-none",
    "border-(length:--dnd-border) border-(--dnd-item-line) shadow-(--dnd-shadow)",
    "outline-none focus-visible:outline-(length:--dnd-focus-width) focus-visible:outline-(--dnd-focus-line) focus-visible:outline-offset-2",
    "data-dnd-sorting:not-data-dnd-dragging:transition-[translate] data-dnd-sorting:not-data-dnd-dragging:duration-(--dnd-motion) data-dnd-sorting:not-data-dnd-dragging:ease-out motion-reduce:transition-none",
    "data-dnd-dragging:relative data-dnd-dragging:z-10 data-dnd-dragging:cursor-grabbing data-dnd-dragging:scale-105 data-dnd-dragging:shadow-(--dnd-lift-shadow)",
);

const TONES = {
    blue: "palette-blue",
    orange: "palette-orange",
    green: "palette-green",
    purple: "palette-purple",
    danger: "palette-danger",
};

export type Tone = keyof typeof TONES;

export const chip = (tone: Tone) =>
    cn(
        TONES[tone],
        "h-8 w-full rounded-[calc(var(--dnd-radius)*0.75)] bg-palette-base",
    );
