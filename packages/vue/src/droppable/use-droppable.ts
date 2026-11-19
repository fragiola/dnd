// The droppable composable (D6): the lower layer `Droppable` is built on. It registers the
// element its `props.ref` receives in that element's drag space (no provider, D4), follows option
// changes with `update` (never a re-register; callbacks are read when called), unregisters when
// the element goes, and triggers its readers only when the droppable's own state changes: on
// enter, leave and drop, never while a drag moves inside it (D8). The shared `usePart` does it all.

import { connectPart, droppableBinding } from "@fragiola/dnd/adapter";
import {
    type DroppableOptions,
    type DroppableState,
    registerDroppable,
} from "@fragiola/dnd/droppable";
import {
    type ComputedRef,
    computed,
    type MaybeRefOrGetter,
    toValue,
} from "vue";
import type { ElementRef } from "../utils/element-ref";
import { type PartBinding, usePart } from "../utils/use-part";

/** Options of {@link useDroppable}: the core's. */
export interface UseDroppableOptions extends DroppableOptions {}

/** What {@link useDroppable} puts on the droppable's element (`v-bind="props"`). */
export interface DroppableBindings {
    readonly ref: ElementRef;
    readonly "data-dnd-part": "droppable";
    readonly "data-dnd-id": string;
    readonly "data-dnd-over"?: "" | undefined;
    readonly "data-dnd-refused"?: "" | undefined;
    readonly "data-dnd-active"?: "" | undefined;
    readonly "data-dnd-disabled"?: "" | undefined;
    readonly "aria-disabled"?: true | undefined;
}

/** What {@link useDroppable} returns: the state, and the props to bind on the element. */
export interface UseDroppableResult {
    readonly state: ComputedRef<DroppableState>;
    readonly props: ComputedRef<DroppableBindings>;
}

/** How the composable drives the core's droppable. */
const BINDING: PartBinding<UseDroppableOptions, DroppableState> = {
    ...droppableBinding,
    connect: (element, options, slot) =>
        connectPart(element, registerDroppable, options, slot),
};

/**
 * Makes the element its `props` go on a drop target, with no provider: bind `props` on one
 * element (`v-bind="props"`). Pass a getter or a ref for options that change.
 */
export function useDroppable(
    options: MaybeRefOrGetter<UseDroppableOptions>,
): UseDroppableResult {
    // a copy, so a reactive object (or a ref's object changed in place) is tracked key by key
    const read = () => ({ ...toValue(options) });
    const { state, ref } = usePart(BINDING, read);
    return {
        state,
        props: computed(() => ({
            ref,
            "data-dnd-part": "droppable",
            "data-dnd-id": String(read().id),
            "data-dnd-over": state.value.over ? "" : undefined,
            "data-dnd-refused": state.value.refused ? "" : undefined,
            "data-dnd-active": state.value.active ? "" : undefined,
            "data-dnd-disabled": state.value.disabled ? "" : undefined,
            "aria-disabled": state.value.disabled ? true : undefined,
        })),
    };
}
