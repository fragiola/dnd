import type { DraggableState, DroppableState } from "@fragiola/dnd-vue";
import { cn } from "#/lib/cn";

// The whole look of a drag lives here. `className` on a wrapper takes a function of its state;
// the `data-dnd-*` attributes give the same state to plain CSS (`data-dnd-over:` below).

export const frame = cn(
    "palette-surface grid h-full grid-cols-3 content-start gap-4 overflow-auto bg-palette-base p-4 text-palette-contrast",
    "font-(family-name:--dnd-font) text-(length:--dnd-font-size)",
);

/** the column: quiet at rest, outlined while a drag it would take runs, filled when hovered,
 * and a refusing column says so */
export const column = (state: DroppableState) =>
    cn(
        "flex min-h-72 flex-col gap-2 rounded-(--dnd-radius) bg-(--dnd-zone-bg) p-3",
        "border-(length:--dnd-placeholder-width) border-transparent transition-[background-color,border-color] duration-(--dnd-motion)",
        state.active &&
            "border-(--dnd-placeholder-line) [border-style:var(--dnd-placeholder-style)]",
        "data-dnd-over:border-solid data-dnd-over:bg-(--dnd-placeholder-bg)",
        state.refused && "border-palette-line border-dashed opacity-60",
    );

export const columnTitle = cn(
    "flex items-center gap-1.5 px-1 pb-1 text-palette-accent/85",
    "font-(--dnd-title-weight) [text-transform:var(--dnd-title-transform)] tracking-(--dnd-title-tracking)",
);

export const lock = "size-3.5";

export const count =
    "ms-auto rounded-full bg-palette-soft px-2 text-xs tabular-nums";

/**
 * The card. At rest its transition includes `translate`, so when a cancelled drag clears the
 * `translate` the core wrote, the card glides back. While dragged, `translate` is left out of the
 * transition (it follows the pointer every frame) and the lift animates in.
 */
export const card = (state: DraggableState) =>
    cn(
        "palette-raised flex flex-col gap-1.5 rounded-(--dnd-radius) bg-palette-base p-(--dnd-item-padding) select-none",
        "border-(length:--dnd-border) border-(--dnd-item-line) shadow-(--dnd-shadow)",
        "outline-none focus-visible:outline-(length:--dnd-focus-width) focus-visible:outline-(--dnd-focus-line) focus-visible:outline-offset-2",
        state.dragging
            ? "relative z-10 scale-[1.03] rotate-[1.5deg] cursor-grabbing shadow-(--dnd-lift-shadow) transition-[scale,rotate,box-shadow] duration-(--dnd-motion)"
            : "cursor-grab transition-[translate,scale,rotate,box-shadow] duration-(--dnd-motion) ease-out",
        state.disabled && "cursor-not-allowed opacity-70",
    );

const TAGS = {
    bug: "palette-danger",
    feature: "palette-blue",
    docs: "palette-green",
};

export const tag = (kind: keyof typeof TAGS) =>
    cn(
        TAGS[kind],
        "self-start rounded-full bg-palette-soft px-2 py-0.5 text-xs text-palette-accent",
    );

export const title = "leading-snug";
