// Almost nothing: room around the parts, a frame so the basket can be seen, and the one state
// worth showing. Everything else is the browser's default.

export const frame = "flex h-full flex-col gap-4 overflow-auto p-4";

export const list = "flex list-disc flex-col gap-2 ps-6";

/** `data-dnd-over` is the only styling the drop needs */
export const basket =
    "min-h-24 border border-dashed border-current p-3 data-dnd-over:border-solid";
