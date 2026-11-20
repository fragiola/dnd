import { cn } from "#/lib/cn";

// The dispatch's look. The packages' state arrives as `data-dnd-*`; the app's own state as
// `data-full`, `data-refuses` (an agent who would refuse the drag in progress), `data-overdue`,
// `data-working` and `data-returning` (a ticket gliding home).

/** `group/frame`: the columns read whether a drag runs from it */
export const frame = cn(
    "group/frame palette-surface flex h-full min-w-0 flex-col gap-3 overflow-hidden bg-palette-base p-4 text-palette-contrast",
    "font-(family-name:--dnd-font) text-(length:--dnd-font-size)",
);

export const header = "flex flex-wrap items-center gap-x-5 gap-y-2";

export const heading = "flex items-baseline gap-2";

export const title = cn(
    "text-base text-palette-accent",
    "font-(--dnd-title-weight) [text-transform:var(--dnd-title-transform)] tracking-(--dnd-title-tracking)",
);

export const clock = "text-xs text-palette-accent/70 tabular-nums";

export const figures = "flex flex-wrap items-center gap-x-4 gap-y-1";

export const figure = "flex items-baseline gap-1.5";

export const figureName = "text-xs text-palette-accent/70";

/** an overdue count other than zero reads as an alert */
export const figureValue =
    "font-semibold tabular-nums data-alert:text-palette-accent data-alert:underline data-alert:decoration-2 data-alert:underline-offset-4";

export const sparkline =
    "h-7 w-28 overflow-visible rounded-(--dnd-radius) bg-palette-soft";

export const sparklineLine =
    "fill-none stroke-palette-accent stroke-[1.5] [vector-effect:non-scaling-stroke]";

export const controls = "ms-auto flex items-center gap-2";

/** the legend names the group for assistive tech only */
export const legend = "sr-only";

export const modes = cn(
    "m-0 flex min-w-0 items-center gap-0.5 rounded-(--dnd-radius) bg-palette-soft p-0.5",
    "border-(length:--dnd-border) border-(--dnd-item-line)",
);

/** the pressed mode is raised */
export const mode =
    "rounded-[calc(var(--dnd-radius)-2px)] aria-pressed:bg-palette-base aria-pressed:text-palette-contrast aria-pressed:shadow-(--dnd-shadow)";

export const play = "rounded-(--dnd-radius)";

export const notes =
    "flex min-h-5 flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-xs";

export const help = "text-palette-accent/70";

export const status = "text-palette-accent tabular-nums";

/**
 * The board scrolls, the columns do not: a ticket moved by its own `translate` crosses columns,
 * and a scrolling column would clip it. No scroll anchoring on the shifted tickets: Firefox would
 * scroll back when the shifts are cleared.
 */
export const board =
    "grid min-h-0 flex-1 grid-cols-[repeat(5,minmax(10.5rem,1fr))] gap-3 overflow-auto [overflow-anchor:none]";

const columnBase = cn(
    "flex min-h-full flex-col gap-2 rounded-(--dnd-radius) bg-(--dnd-zone-bg) p-2.5 transition-opacity duration-(--dnd-motion)",
    "border-(length:--dnd-border) border-(--dnd-item-line)",
);

export const column = columnBase;

/**
 * An agent's column (also its refusing `Droppable`): dimmed while a drag it would refuse runs,
 * and its reason badge shown while full or refusing. Over it, the refusal is the `Droppable`'s
 * hover (`data-dnd-over`).
 */
export const agentColumn = cn(
    columnBase,
    "group/agent",
    "data-refuses:opacity-60 data-dnd-over:opacity-80",
    "data-dnd-over:border-(--dnd-placeholder-line) data-dnd-over:[border-style:var(--dnd-placeholder-style)]",
);

export const columnTitle = cn(
    "flex items-center gap-2 px-1 text-palette-accent/85",
    "font-(--dnd-title-weight) [text-transform:var(--dnd-title-transform)] tracking-(--dnd-title-tracking)",
);

export const count =
    "ms-auto rounded-full bg-palette-base px-2 text-xs tabular-nums";

export const agentHeader = "flex items-center gap-2 px-0.5";

/** added to the Avatar's own classes */
export const avatar =
    "palette-raised size-7 border border-palette-line text-xs";

export const agentText = "flex min-w-0 flex-1 flex-col";

export const agentNameRow = "flex min-w-0 items-center gap-1.5";

export const agentName = cn(
    "text-palette-accent/85",
    "font-(--dnd-title-weight) [text-transform:var(--dnd-title-transform)] tracking-(--dnd-title-tracking)",
);

export const agentSkills = "truncate text-[0.6875rem] text-palette-accent/70";

export const load =
    "flex shrink-0 items-center gap-1.5 text-xs text-palette-accent/80 tabular-nums";

export const meter = "h-2 w-auto";

export const slot = (filled: boolean) =>
    filled ? "fill-palette-accent" : "fill-palette-line";

/**
 * Why the agent refuses: shown while they are full or refuse the drag in progress (a palette is a
 * plain class: it cannot take a variant, so the badge carries it and the variant shows it).
 */
export const reason = cn(
    "palette-danger hidden shrink-0 rounded-full bg-palette-soft px-1.5 text-[0.625rem] leading-4 whitespace-nowrap text-palette-accent",
    "group-data-full/agent:inline-flex group-data-refuses/agent:inline-flex",
);

/**
 * A column's list, its group's container: it fills the column, so a ticket drops below the last
 * one or into an empty column. A group taking part in the sort is marked `data-dnd-sorting`.
 */
export const list = cn(
    "-m-1 flex flex-1 flex-col gap-2 rounded-(--dnd-radius) p-1",
    "outline-(length:--dnd-placeholder-width) outline-transparent [outline-style:var(--dnd-placeholder-style)] transition-[outline-color] duration-(--dnd-motion)",
    "data-dnd-sorting:outline-(--dnd-placeholder-line)",
);

/**
 * A ticket. The shifts animate while a sort runs, never on the dragged ticket nor at the drop
 * (S4); a refused or cancelled drag glides home (`data-returning`, set by the app in its
 * `onSortEnd` and rendered before the browser styles the cleared `translate`). A swap target is
 * the placeholder.
 */
export const ticket = cn(
    "palette-raised relative flex cursor-grab flex-col gap-1 overflow-hidden rounded-(--dnd-radius) bg-palette-base px-2.5 py-2 select-none",
    "border-(length:--dnd-border) border-(--dnd-item-line) shadow-(--dnd-shadow)",
    "outline-none focus-visible:outline-(length:--dnd-focus-width) focus-visible:outline-(--dnd-focus-line) focus-visible:outline-offset-2",
    "data-dnd-sorting:not-data-dnd-dragging:transition-[translate] data-dnd-sorting:not-data-dnd-dragging:duration-(--dnd-motion) data-dnd-sorting:not-data-dnd-dragging:ease-out",
    "group-has-[[data-dnd-dragging]]/frame:not-data-dnd-dragging:transition-[translate] group-has-[[data-dnd-dragging]]/frame:not-data-dnd-dragging:duration-(--dnd-motion)",
    "data-returning:transition-[translate] data-returning:duration-300 data-returning:ease-out motion-reduce:transition-none",
    "data-dnd-swap-target:border-(--dnd-placeholder-line) data-dnd-swap-target:[border-style:var(--dnd-placeholder-style)] data-dnd-swap-target:bg-(--dnd-placeholder-bg)",
    "data-dnd-dragging:z-10 data-dnd-dragging:cursor-grabbing data-dnd-dragging:rotate-[1deg] data-dnd-dragging:shadow-(--dnd-lift-shadow)",
    "not-data-dnd-part:cursor-default",
);

export const ticketTop = "flex min-w-0 items-center gap-1.5";

const PRIORITIES = {
    1: "palette-danger",
    2: "palette-orange",
    3: "palette-surface",
};

export const priority = (level: 1 | 2 | 3) =>
    cn(
        PRIORITIES[level],
        "shrink-0 rounded-[calc(var(--dnd-radius)/2)] bg-palette-base px-1 text-[0.625rem] font-semibold text-palette-contrast tabular-nums",
        level === 3 && "bg-palette-soft text-palette-accent",
    );

export const subject = "min-w-0 flex-1 truncate leading-snug";

export const ticketBottom =
    "flex min-w-0 items-center gap-1.5 text-[0.6875rem] text-palette-accent/75";

export const ticketId = "whitespace-nowrap tabular-nums";

const SKILLS = {
    billing: "palette-green",
    technical: "palette-purple",
    account: "palette-blue",
};

export const skill = (kind: keyof typeof SKILLS) =>
    cn(
        SKILLS[kind],
        "min-w-0 truncate rounded-full bg-palette-soft px-1.5 text-palette-accent",
    );

/** the SLA left; an overdue one carries the danger palette */
export const sla = (overdue: boolean) =>
    cn(
        "ms-auto shrink-0 whitespace-nowrap tabular-nums",
        overdue &&
            "palette-danger rounded-full bg-palette-soft px-1.5 font-semibold text-palette-accent",
    );

/** the work done on the ticket an agent holds first, drawn as two SVG bars */
export const progress = "absolute inset-x-0 bottom-0 h-[3px] w-full";

export const track = "fill-palette-soft";

export const done = "fill-palette-accent";
