import { cn } from "#/lib/cn";

// How hello-dnd looks: one class string per part. Colours come from the palette roles and sizes
// from the theme's --dnd-* tokens, so it works in every theme. The state is read from the
// `data-dnd-*` attributes the wrappers put on the element.

export const frame = cn(
    "palette-surface grid h-full grid-cols-1 content-start gap-4 overflow-auto bg-palette-base p-4 text-palette-contrast sm:grid-cols-2",
    "font-(family-name:--dnd-font) text-(length:--dnd-font-size)",
);

export const tray = cn(
    "grid min-h-40 place-items-center rounded-(--dnd-radius) bg-(--dnd-zone-bg) p-4",
    "border-(length:--dnd-border) border-(--dnd-item-line)",
);

export const box = cn(
    "grid min-h-40 place-items-center rounded-(--dnd-radius) p-4 transition-colors duration-(--dnd-motion)",
    "border-(length:--dnd-placeholder-width) border-(--dnd-item-line) [border-style:var(--dnd-placeholder-style)]",
    // a drag the box takes is running, then it is over the box
    "data-dnd-active:border-(--dnd-placeholder-line)",
    "data-dnd-over:bg-(--dnd-placeholder-bg)",
);

export const boxHint = "text-palette-accent/70";

export const card = cn(
    "palette-raised flex w-44 cursor-grab flex-col gap-1 rounded-(--dnd-radius) bg-palette-base p-(--dnd-item-padding) select-none",
    "border-(length:--dnd-border) border-(--dnd-item-line) shadow-(--dnd-shadow)",
    "outline-none focus-visible:outline-(length:--dnd-focus-width) focus-visible:outline-(--dnd-focus-line) focus-visible:outline-offset-2",
    // lifted while it follows the pointer: above the box, with the theme's lift shadow
    "data-dnd-dragging:relative data-dnd-dragging:z-10 data-dnd-dragging:cursor-grabbing data-dnd-dragging:shadow-(--dnd-lift-shadow)",
);

export const cardTitle = cn(
    "font-(--dnd-title-weight) [text-transform:var(--dnd-title-transform)] tracking-(--dnd-title-tracking)",
);

export const cardHint = "text-xs text-palette-accent/70";

export const status = "text-palette-accent/80 sm:col-span-2";
