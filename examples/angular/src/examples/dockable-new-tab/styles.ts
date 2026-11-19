import { cn } from "#/lib/cn";

// Dockable's parts take the same palette roles and --dnd-* tokens as the cards: one look for
// both libraries. `data-dnd-over` and `data-dnd-refused` sit on the tabset's element, beside
// Dockable's own `data-*`, without colliding.

export const frame = cn(
    "palette-surface flex h-full flex-col gap-3 bg-palette-base p-4 text-palette-contrast",
    "font-(family-name:--dnd-font) text-(length:--dnd-font-size)",
);

export const toolbar = "flex flex-wrap items-center gap-2";

export const cards = "flex flex-wrap items-center gap-2";

export const card = cn(
    "palette-raised cursor-grab rounded-(--dnd-radius) bg-palette-base px-3 py-2 select-none",
    "border-(length:--dnd-border) border-(--dnd-item-line) shadow-(--dnd-shadow)",
    "outline-none focus-visible:outline-(length:--dnd-focus-width) focus-visible:outline-(--dnd-focus-line)",
    "data-dnd-dragging:relative data-dnd-dragging:z-30 data-dnd-dragging:cursor-grabbing data-dnd-dragging:shadow-(--dnd-lift-shadow)",
);

export const hint = "ms-auto text-xs text-palette-accent/70";

/** the root needs a size: it fills what the cards leave */
export const root = "min-h-0 flex-1";

/** the tabset: Dockable positions it; dnd's attributes say what a card over it would do */
export const tabset = cn(
    "group/tabset palette-raised rounded-(--dnd-radius) bg-palette-base",
    "border-(length:--dnd-border) border-(--dnd-item-line) transition-[outline-color] duration-(--dnd-motion)",
    "outline-(length:--dnd-placeholder-width) outline-offset-[-2px] outline-transparent",
    "data-dnd-active:outline-(--dnd-placeholder-line)/40 data-dnd-over:outline-(--dnd-placeholder-line)",
);

export const strip = "flex items-center border-b border-palette-line pe-2";

export const tabList = "flex min-w-0 flex-1 overflow-hidden";

export const tab = cn(
    "flex h-9 shrink-0 cursor-pointer items-center px-3 text-palette-accent/80 select-none",
    "outline-none focus-visible:ring-2 focus-visible:ring-palette-ring focus-visible:ring-inset",
    "data-selected:bg-palette-soft data-selected:text-palette-contrast",
);

/** shown while a card hovers a full tabset (`palette-*` is a plain class: no variant on it) */
export const full =
    "palette-danger hidden rounded-full bg-palette-soft px-2 py-0.5 text-xs text-palette-accent group-data-dnd-refused/tabset:inline-flex";

export const panel =
    "palette-raised overflow-auto bg-palette-base p-4 text-palette-accent";
