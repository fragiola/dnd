import { cn } from "#/lib/cn";

export const frame = cn(
    "palette-surface flex h-full flex-col gap-3 overflow-auto bg-palette-base p-4 text-palette-contrast",
    "font-(family-name:--dnd-font) text-(length:--dnd-font-size)",
);

export const panel = cn(
    "palette-raised flex flex-wrap items-center gap-x-6 gap-y-2 rounded-(--dnd-radius) bg-palette-base p-3",
    "border-(length:--dnd-border) border-(--dnd-item-line)",
);

export const keys = "flex flex-wrap gap-x-4 gap-y-1";

export const keyRow = "flex items-center gap-2 text-palette-accent";

export const key = cn(
    "rounded-[calc(var(--dnd-radius)/2)] border border-palette-line bg-palette-soft px-1.5 py-0.5",
    "font-mono text-xs text-palette-contrast",
);

export const mode = "flex items-center gap-2 text-palette-accent";

/** the live region: visible here so the example shows what a screen reader hears */
export const status = "basis-full text-palette-contrast";

export const help = "sr-only";

export const columns = "grid flex-1 grid-cols-3 gap-3";

export const column = cn(
    "flex min-h-48 flex-col gap-2 rounded-(--dnd-radius) bg-(--dnd-zone-bg) p-3 transition-colors duration-(--dnd-motion)",
    "border-(length:--dnd-border) border-(--dnd-item-line)",
    "data-dnd-over:border-(--dnd-placeholder-line) data-dnd-over:bg-(--dnd-placeholder-bg)",
);

export const columnTitle = cn(
    "px-1 text-palette-accent/85",
    "font-(--dnd-title-weight) [text-transform:var(--dnd-title-transform)] tracking-(--dnd-title-tracking)",
);

/** a visible focus, and the grabbed card in the focus colour */
export const card = cn(
    "palette-raised cursor-grab rounded-(--dnd-radius) bg-palette-base p-(--dnd-item-padding) select-none",
    "border-(length:--dnd-border) border-(--dnd-item-line) shadow-(--dnd-shadow)",
    "outline-none focus-visible:outline-(length:--dnd-focus-width) focus-visible:outline-(--dnd-focus-line) focus-visible:outline-offset-2",
    "data-dnd-dragging:relative data-dnd-dragging:z-10 data-dnd-dragging:border-(--dnd-focus-line) data-dnd-dragging:shadow-(--dnd-lift-shadow)",
);
