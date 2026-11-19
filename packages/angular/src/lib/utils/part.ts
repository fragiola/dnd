// The lower half of every registered part's directive (`[dndDraggable]`, `[dndDroppable]`,
// `[dndSortable]`, `[dndSortableGroup]`, `[dndSwappable]`): it connects the host element to the
// core once it is rendered (`connectPart`, or `connectSource` with its handle, from
// `@fragiola/dnd/adapter`: the registration in that element's drag space, no provider, D4), in the
// browser only (`afterNextRender`: nothing on the server), outside Angular's zone when there is
// one; follows input changes with `update` (never a re-register); disconnects when the directive
// is destroyed. The part's state is a signal that changes only when the snapshot does, and its
// attributes are written straight from the core's notification (D8): a drag runs no change
// detection, apart from the views that read the state, on its start, end, enter and leave. What is
// compared and the state before mount are the core's bindings. The Angular form of
// `packages/react/src/utils/use-part.ts`.
import {
    afterNextRender,
    computed,
    DestroyRef,
    inject,
    NgZone,
    type Signal,
    signal,
    untracked,
} from "@angular/core";
import {
    type Connection,
    createSlot,
    optionsChanged,
    type StateSlot,
} from "@fragiola/dnd/adapter";
import { injectHost } from "./helpers";
import {
    type PartAttributes,
    type PartName,
    writePart,
} from "./host-attributes";
import { injectRender } from "./render";

/** How {@link injectPart} drives one capability's core registration. */
export interface PartBinding<Options extends object, State extends object> {
    /** its part attribute, also its name in the development messages */
    readonly part: PartName;
    /** its directive's selector, for the development messages */
    readonly selector: string;
    /** connects the element: `connectPart` or `connectSource` over the capability's `register*` */
    readonly connect: (
        element: HTMLElement,
        options: () => Options,
        slot: StateSlot<State>,
    ) => Connection;
    /** the options compared on each input change: a difference is an `update` */
    readonly compared: readonly (keyof Options)[];
    /** the state before the element connects, and on the server */
    readonly rest: (options: {
        readonly disabled?: boolean | undefined;
    }) => State;
    /** the attributes the part gives its element, from its state and its options */
    readonly attributes: (state: State, options: Options) => PartAttributes;
}

/** A part as its directive holds it. */
export interface Part<State> {
    /** its state: changes only when the core's snapshot does */
    readonly state: Signal<State>;
    /** the host element */
    readonly element: HTMLElement;
    /** applies the inputs of the moment (call it from `ngOnChanges`) */
    changed(): void;
    /** renders the app after this task: call it after emitting an output (`./render.ts`) */
    render(): void;
}

/**
 * Connects the directive being created to the core: `options()` reads its inputs (and its
 * outputs' emitters), `disabled()` the one input the state before mount shows.
 */
export function injectPart<Options extends object, State extends object>(
    binding: PartBinding<Options, State>,
    options: () => Options,
    disabled: () => boolean | undefined,
): Part<State> {
    const element = injectHost(binding.selector);
    const zone = inject(NgZone);
    const slot = createSlot<State>(() =>
        binding.rest({ disabled: disabled() }),
    );
    const tick = signal(0);
    const render = injectRender();
    let connection: Connection | undefined;
    let applied: Options | undefined;
    let destroyed = false;

    /** writes the part's attributes, once the inputs are set */
    const write = () => {
        if (destroyed || !applied) return;
        writePart(
            element,
            binding.part,
            binding.attributes(untracked(slot.getState), applied),
        );
    };
    const unsubscribe = slot.subscribe(() => {
        write();
        tick.update((value) => value + 1);
        render();
    });

    afterNextRender({
        write: () => {
            applied = untracked(options);
            // outside Angular's zone, when the app has one: the core's listeners (the pointer's
            // moves) never start a change detection
            connection = zone.runOutsideAngular(() =>
                binding.connect(element, () => applied as Options, slot),
            );
            write();
        },
    });
    inject(DestroyRef).onDestroy(() => {
        connection?.disconnect();
        connection = undefined;
        unsubscribe();
        destroyed = true;
        writePart(element, binding.part, undefined);
    });

    return {
        element,
        render,
        state: computed(() => {
            tick();
            return slot.getState();
        }),
        changed() {
            const next = untracked(options);
            const update =
                applied !== undefined &&
                optionsChanged(applied, next, binding.compared);
            applied = next;
            if (update) connection?.update();
            // the attributes read the options of the moment too (`describedBy`)
            write();
        },
    };
}
