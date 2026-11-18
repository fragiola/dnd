// How an adapter drives each capability's registration, decided once so every adapter behaves
// the same: the options compared on each render (a change is an `update`, `./options`), the
// callbacks read from the latest options when the core calls them, and the state before mount
// and on the server. Only names and plain values: the shared core imports no capability (D3),
// so a binding names its capability's options as strings, and `tests/types/bindings.ts` checks
// each list against the capability's options (every option is compared, a callback, or the
// handle). Adapter-only (`@fragiola/dnd/adapter`): an app never needs it.

/** The options a binding's `rest` reads. */
interface RestInput {
    readonly disabled?: boolean | undefined;
}

/** A draggable's binding (`registerDraggable`). */
export const draggableBinding = {
    compared: [
        "id",
        "type",
        "data",
        "scope",
        "space",
        "disabled",
        "activation",
        "keyboard",
        "autoScroll",
        "collision",
        "translate",
    ],
    callbacks: ["onDragStart", "onDragMove", "onDragEnd", "onDragCancel"],
    rest: (options: RestInput) => ({
        dragging: false,
        disabled: !!options.disabled,
    }),
} as const;

/** A droppable's binding (`registerDroppable`). */
export const droppableBinding = {
    compared: ["id", "data", "scope", "space", "accepts", "disabled"],
    callbacks: ["onDragEnter", "onDragOver", "onDragLeave", "onDrop"],
    rest: (options: RestInput) => ({
        over: false,
        active: false,
        refused: false,
        disabled: !!options.disabled,
    }),
} as const;

/** A sortable item's binding (`registerSortable`). */
export const sortableBinding = {
    compared: [
        "id",
        "index",
        "group",
        "type",
        "data",
        "scope",
        "space",
        "disabled",
        "accepts",
        "strategy",
        "activation",
        "autoScroll",
        "translate",
    ],
    callbacks: ["onSortStart", "onSortOver", "onSortEnd"],
    rest: (options: RestInput) => ({
        dragging: false,
        sorting: false,
        disabled: !!options.disabled,
    }),
} as const;

/** A sortable group container's binding (`registerSortableGroup`). */
export const sortableGroupBinding = {
    compared: [
        "group",
        "scope",
        "space",
        "data",
        "disabled",
        "accepts",
        "strategy",
    ],
    callbacks: [],
    rest: (options: RestInput) => ({
        sorting: false,
        disabled: !!options.disabled,
    }),
} as const;

/** A swappable item's binding (`registerSwappable`). */
export const swappableBinding = {
    compared: [
        "id",
        "index",
        "group",
        "type",
        "data",
        "scope",
        "space",
        "disabled",
        "accepts",
        "activation",
        "autoScroll",
        "translate",
    ],
    callbacks: ["onSwap"],
    rest: (options: RestInput) => ({
        dragging: false,
        disabled: !!options.disabled,
    }),
} as const;

/** A drag handle's state before it links to its source, and on the server. */
export const handleRest = { dragging: false, disabled: false } as const;
