// The lower half of every registered part's composable (`useDraggable`, `useDroppable`,
// `useSortable`, `useSortableGroup`, `useSwappable`): it connects the element its template ref
// receives to the core (`connectPart`, or `connectSource` with its `DragHandle`, from
// `@fragiola/dnd/adapter`: the registration in that element's drag space, no provider, D4),
// follows option changes with `update` (never a re-register; callbacks are read when called),
// disconnects when the element goes, and triggers its readers only when the part's own state
// changes (D8). What is compared, which callbacks and the state before mount are the core's
// bindings. The Vue form of `packages/react/src/utils/use-part.ts`.
import {
    type Connection,
    createSlot,
    optionsChanged,
    type StateSlot,
    withLatestCallbacks,
} from "@fragiola/dnd/adapter";
import {
    type ComputedRef,
    computed,
    onScopeDispose,
    shallowRef,
    watch,
} from "vue";
import { type ElementRef, elementRef } from "./element-ref";

/** How {@link usePart} drives one capability's core registration. */
export interface PartBinding<Options extends object, State extends object> {
    /** connects the element: `connectPart` or `connectSource` over the capability's `register*` */
    readonly connect: (
        element: HTMLElement,
        options: () => Options,
        slot: StateSlot<State>,
    ) => Connection;
    /** the options compared on each change: a difference is an `update` */
    readonly compared: readonly (keyof Options)[];
    /** the callbacks, read from the latest options when the core calls them */
    readonly callbacks: readonly (keyof Options)[];
    /** the state before mount and on the server */
    readonly rest: (options: Options) => State;
}

/**
 * A slot's state as a computed ref: re-read whenever the slot notifies (and whenever a reactive
 * value its fallback reads changes), triggering its readers only when the snapshot changes. The
 * slot keeps its snapshot's identity until a field changes, so a part updates only when its own
 * state does (D8).
 */
export function useSlotState<State extends object>(
    slot: StateSlot<State>,
): ComputedRef<State> {
    const tick = shallowRef(0);
    onScopeDispose(
        slot.subscribe(() => {
            tick.value++;
        }),
    );
    return computed(() => {
        tick.value;
        return slot.getState();
    });
}

/** A part's state and the template ref that registers its element. */
export function usePart<Options extends object, State extends object>(
    binding: PartBinding<Options, State>,
    options: () => Options,
): { readonly state: ComputedRef<State>; readonly ref: ElementRef } {
    const slot = createSlot<State>(() => binding.rest(options()));
    let connection: Connection | undefined;
    let applied = options();

    const ref = elementRef((element) => {
        applied = options();
        const connected = binding.connect(
            element,
            () => withLatestCallbacks(applied, binding.callbacks, options),
            slot,
        );
        connection = connected;
        return () => {
            connected.disconnect();
            if (connection === connected) connection = undefined;
        };
    });

    // an option change is an update, applied once the DOM is patched, before the browser paints
    watch(
        options,
        (next) => {
            if (!optionsChanged(applied, next, binding.compared)) return;
            applied = next;
            connection?.update();
        },
        { flush: "post" },
    );
    // the part ends with its scope (the component, or the scope the composable runs in), even
    // when the element's template ref is not called with `null` (an element bound elsewhere)
    onScopeDispose(() => ref(null));

    return { state: useSlotState(slot), ref };
}
