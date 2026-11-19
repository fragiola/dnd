import { cn } from "#/lib/cn";

export const frame = cn(
    "palette-surface flex h-full flex-col gap-3 overflow-auto bg-palette-base p-4 text-palette-contrast",
    "font-(family-name:--dnd-font) text-(length:--dnd-font-size)",
);

export const desk = cn(
    "flex min-h-20 flex-wrap content-start gap-2 rounded-(--dnd-radius) bg-(--dnd-zone-bg) p-3",
    "border-(length:--dnd-border) border-(--dnd-item-line)",
);

export const folders = "grid flex-1 grid-cols-3 gap-3";

/** the three states a folder shows: would take the drag, takes the source here, refuses it */
export const folder = cn(
    "flex min-h-40 flex-col gap-2 rounded-(--dnd-radius) p-3 transition-colors duration-(--dnd-motion)",
    "border-(length:--dnd-placeholder-width) border-(--dnd-item-line) [border-style:var(--dnd-placeholder-style)]",
    "data-dnd-active:border-(--dnd-placeholder-line)",
    "data-dnd-over:bg-(--dnd-placeholder-bg)",
    "group/folder data-dnd-refused:border-solid data-dnd-refused:opacity-70",
);

/** shown only while the folder refuses the file under the pointer (palette-* is a plain class:
 * it cannot take a variant, so the badge carries it and the variant shows the badge) */
export const refused =
    "palette-danger hidden self-start rounded-full bg-palette-soft px-2 py-0.5 text-xs text-palette-accent group-data-dnd-refused/folder:inline-flex";

export const folderHeader = "flex flex-col gap-1";

export const folderTitle = cn(
    "font-(--dnd-title-weight) [text-transform:var(--dnd-title-transform)] tracking-(--dnd-title-tracking)",
);

export const rule = "text-xs text-palette-accent/70";

export const folderFiles = "flex flex-col gap-2";

export const file = cn(
    "palette-raised flex cursor-grab items-center gap-2 rounded-(--dnd-radius) bg-palette-base px-3 py-2 select-none",
    "border-(length:--dnd-border) border-(--dnd-item-line) shadow-(--dnd-shadow)",
    "outline-none focus-visible:outline-(length:--dnd-focus-width) focus-visible:outline-(--dnd-focus-line)",
    "data-dnd-dragging:relative data-dnd-dragging:z-10 data-dnd-dragging:cursor-grabbing data-dnd-dragging:shadow-(--dnd-lift-shadow)",
);

export const icon = "size-4 shrink-0 text-palette-accent/80";

export const fileName = "min-w-0 flex-1 truncate";

export const size = "text-xs text-palette-accent/70 tabular-nums";
