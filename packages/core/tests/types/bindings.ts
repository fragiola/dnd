// Type fixtures (compiled by `pnpm typecheck`, never run): each capability's adapter binding
// (`@fragiola/dnd/adapter`) names its capability's options exactly. Every option is compared,
// a callback, or the handle (set by the handle link); a name that is not an option fails; and
// the state before mount is the capability's state.
import {
    draggableBinding,
    droppableBinding,
    handleRest,
    sortableBinding,
    sortableGroupBinding,
    swappableBinding,
} from "../../src/adapter";
import type { DraggableState } from "../../src/core/types";
import type { DraggableOptions } from "../../src/draggable";
import type { DroppableOptions, DroppableState } from "../../src/droppable";
import type {
    SortableGroupOptions,
    SortableGroupState,
    SortableOptions,
    SortableState,
} from "../../src/sortable";
import type { SwappableOptions, SwappableState } from "../../src/swappable";

/** `true` when `A` and `B` are the same union. */
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

/** The option names a binding covers. */
type Covered<
    Binding extends {
        readonly compared: readonly string[];
        readonly callbacks: readonly string[];
    },
> = Binding["compared"][number] | Binding["callbacks"][number];

export const draggableCovered: Same<
    Covered<typeof draggableBinding> | "handle",
    keyof DraggableOptions
> = true;
export const droppableCovered: Same<
    Covered<typeof droppableBinding>,
    keyof DroppableOptions
> = true;
export const sortableCovered: Same<
    Covered<typeof sortableBinding> | "handle",
    keyof SortableOptions
> = true;
export const sortableGroupCovered: Same<
    Covered<typeof sortableGroupBinding>,
    keyof SortableGroupOptions
> = true;
export const swappableCovered: Same<
    Covered<typeof swappableBinding> | "handle",
    keyof SwappableOptions
> = true;

export const rests: readonly [
    DraggableState,
    DroppableState,
    SortableState,
    SortableGroupState,
    SwappableState,
    DraggableState,
] = [
    draggableBinding.rest({}),
    droppableBinding.rest({ disabled: true }),
    sortableBinding.rest({}),
    sortableGroupBinding.rest({}),
    swappableBinding.rest({}),
    handleRest,
];

// @ts-expect-error: a binding is read-only
draggableBinding.compared.push("id");
