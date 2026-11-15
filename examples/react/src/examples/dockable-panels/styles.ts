import type { DropIndicatorState } from "@fragiola/dockable-react";
import { cn } from "#/lib/cn";

export const frame = cn(
    "palette-surface flex h-full flex-col gap-3 bg-palette-base p-4 text-palette-contrast",
    "font-(family-name:--dnd-font) text-(length:--dnd-font-size)",
);

export const move = cn(
    "palette-raised self-start rounded-(--dnd-radius) bg-palette-base px-3 py-1.5 text-palette-accent hover:bg-palette-soft",
    "border-(length:--dnd-border) border-(--dnd-item-line)",
    "outline-none focus-visible:outline-(length:--dnd-focus-width) focus-visible:outline-(--dnd-focus-line)",
);

/** the root needs a size: it fills the frame */
export const root = "min-h-0 flex-1";

export const tabset = cn(
    "palette-raised rounded-(--dnd-radius) bg-palette-base",
    "border-(length:--dnd-border) border-(--dnd-item-line)",
);

export const tabList =
    "flex min-w-0 overflow-hidden border-b border-palette-line";

/** Dockable's own drag marks a tab `data-dragging`; dnd's would be `data-dnd-dragging` */
export const tab = cn(
    "flex h-9 shrink-0 cursor-pointer items-center px-3 text-palette-accent/80 select-none",
    "outline-none focus-visible:ring-2 focus-visible:ring-palette-ring focus-visible:ring-inset",
    "data-selected:bg-palette-soft data-selected:text-palette-contrast data-dragging:opacity-40",
);

export const panel = "palette-raised overflow-auto bg-palette-base p-3";

/** Dockable's indicator, for its own tab drags; panels paint over the tabsets, so it goes above */
export const dropIndicator = (state: DropIndicatorState) =>
    cn(
        "palette-blue z-20 rounded-(--dnd-radius) border-2 border-palette-base bg-palette-base/20",
        state.kind === "edge" && "border-dashed",
    );

export const cards = "flex flex-col gap-2";

export const card = cn(
    "cursor-grab rounded-(--dnd-radius) bg-palette-soft p-(--dnd-item-padding) select-none",
    "border-(length:--dnd-border) border-(--dnd-item-line)",
    "outline-none focus-visible:outline-(length:--dnd-focus-width) focus-visible:outline-(--dnd-focus-line)",
    // the card stays as a placeholder while the overlay carries its copy
    "data-dnd-dragging:border-dashed data-dnd-dragging:opacity-50",
);

/** the copy under the pointer, portalled into the body: above Dockable's panels */
export const lifted = cn(
    "palette-raised z-50 rounded-(--dnd-radius) bg-palette-base p-(--dnd-item-padding) text-palette-contrast",
    "border-(length:--dnd-border) border-(--dnd-item-line) shadow-(--dnd-lift-shadow)",
    "font-(family-name:--dnd-font) text-(length:--dnd-font-size)",
);

/** the archive fills its panel, so the whole panel is the drop target */
export const archive = cn(
    "flex min-h-full flex-col gap-2 rounded-(--dnd-radius) p-2 transition-colors duration-(--dnd-motion)",
    "border-(length:--dnd-placeholder-width) border-(--dnd-item-line) [border-style:var(--dnd-placeholder-style)]",
    "data-dnd-active:border-(--dnd-placeholder-line) data-dnd-over:bg-(--dnd-placeholder-bg)",
);

export const hint = "text-palette-accent/70";

export const archived =
    "rounded-(--dnd-radius) bg-palette-soft px-3 py-2 text-palette-accent line-through";

export const note = "text-palette-accent";
