// The draggable composable (D6): the lower layer `Draggable` is built on. It registers the
// element its `props.ref` receives in that element's drag space (no provider, D4), follows option
// changes with `update` (never a re-register; callbacks are read when called), unregisters when
// the element goes, and triggers its readers only when the draggable's own state changes (D8):
// the shared `usePart` does it all.

import { connectSource, draggableBinding } from "@fragiola/dnd/adapter";
import {
    type DraggableOptions,
    type DraggableState,
    registerDraggable,
} from "@fragiola/dnd/draggable";
import {
    type ComputedRef,
    computed,
    type MaybeRefOrGetter,
    toValue,
} from "vue";
import type { ElementRef } from "../utils/element-ref";
import { type PartBinding, usePart } from "../utils/use-part";

/** Options of {@link useDraggable}: the core's, without `handle` (a `DragHandle` sets it). */
export interface UseDraggableOptions extends Omit<DraggableOptions, "handle"> {
    /** the id of the element describing how to drag it (`aria-describedby`): the app's text */
    readonly describedBy?: string | undefined;
}

/** What {@link useDraggable} puts on the draggable's element (`v-bind="props"`). */
export interface DraggableBindings {
    readonly ref: ElementRef;
    readonly "data-dnd-part": "draggable";
    readonly "data-dnd-id": string;
    readonly "data-dnd-dragging"?: "" | undefined;
    readonly "data-dnd-disabled"?: "" | undefined;
    readonly "aria-disabled"?: true | undefined;
    readonly "aria-describedby"?: string | undefined;
}

/** What {@link useDraggable} returns: the state, and the props to bind on the element. */
export interface UseDraggableResult {
    readonly state: ComputedRef<DraggableState>;
    readonly props: ComputedRef<DraggableBindings>;
}

/** How the composable drives the core's draggable. */
const BINDING: PartBinding<UseDraggableOptions, DraggableState> = {
    ...draggableBinding,
    connect: (element, options, slot) =>
        connectSource(element, registerDraggable, options, slot),
};

/**
 * Makes the element its `props` go on draggable, by pointer and keyboard, with no provider: bind
 * `props` on one element (`v-bind="props"`). Pass a getter or a ref for options that change.
 */
export function useDraggable(
    options: MaybeRefOrGetter<UseDraggableOptions>,
): UseDraggableResult {
    const read = () => toValue(options);
    const { state, ref } = usePart(BINDING, read);
    return {
        state,
        props: computed(() => ({
            ref,
            "data-dnd-part": "draggable",
            "data-dnd-id": String(read().id),
            "data-dnd-dragging": state.value.dragging ? "" : undefined,
            "data-dnd-disabled": state.value.disabled ? "" : undefined,
            "aria-disabled": state.value.disabled ? true : undefined,
            "aria-describedby": read().describedBy,
        })),
    };
}
