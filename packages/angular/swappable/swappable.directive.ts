// The swappable item directive (S3, D6): `<div [dndSwappable]="tile.id" [index]="$index"
// group="board">` keeps the `div` as the only element, registered as a swappable item, with
// `data-dnd-*` and ARIA on it. The preview (the target's shift and `data-dnd-swap-target`) is
// written by the core, never rendered (D8).
import {
    Directive,
    input,
    numberAttribute,
    type OnChanges,
    output,
    type Signal,
} from "@angular/core";
import type { DragId } from "@fragiola/dnd";
import { connectSource, swappableBinding } from "@fragiola/dnd/adapter";
import {
    registerSwappable,
    type SwapEvent,
    type SwappableOptions,
    type SwappableState,
} from "@fragiola/dnd/swappable";
import {
    ɵdefined as defined,
    ɵflag as flag,
    ɵinjectPart as injectPart,
    ɵoptionalBoolean as optionalBoolean,
    type ɵPartBinding as PartBinding,
} from "@fragiola/dnd-angular";

/** The item's options, as its directive passes them to the core. */
type Options = Omit<SwappableOptions, "handle"> & {
    readonly describedBy?: string | undefined;
};

/** How the directive drives the core's swappable item. */
const BINDING: PartBinding<Options, SwappableState> = {
    ...swappableBinding,
    part: "swappable",
    selector: "dndSwappable",
    connect: (element, options, slot) =>
        connectSource(element, registerSwappable, options, slot),
    attributes: (state, options) => ({
        "data-dnd-id": String(options.id),
        "data-dnd-dragging": flag(state.dragging),
        "data-dnd-disabled": flag(state.disabled),
        "aria-disabled": state.disabled ? "true" : undefined,
        "aria-describedby": options.describedBy,
    }),
};

/**
 * Makes its host element an item that swaps with the items of its group (and of the groups it
 * accepts), by pointer and keyboard, with no provider. It adds no element: the host is marked
 * `data-dnd-part="swappable"`, `data-dnd-id`, `data-dnd-dragging` and `data-dnd-disabled` (the
 * core writes `data-dnd-swap-target`). Commit the swap on `(swap)` (`swapItems`, `swapBetween`).
 * Its state is a signal (`#tile="dndSwappable"`), which changes at a swap's start and end only.
 */
@Directive({ selector: "[dndSwappable]", exportAs: "dndSwappable" })
export class DndSwappable implements OnChanges {
    /** its id, unique within its scope */
    readonly dndSwappable = input.required<DragId>();
    /** its place in its group's list, from 0 (reported in the swap event) */
    readonly index = input.required({ transform: numberAttribute });
    /** the items it may swap with, within its scope (its own group's always) */
    readonly group = input.required<string>();
    /** what plain droppables with an `accepts` list match */
    readonly type = input<string | undefined>(undefined);
    /** anything the app wants back in the events */
    readonly data = input<unknown>(undefined);
    /** only swappables and droppables of the same scope meet it */
    readonly scope = input<string | undefined>(undefined);
    /** an explicit space from `createDragSpace` (default: the element's document's) */
    readonly space = input<SwappableOptions["space"]>(undefined);
    /** a disabled item neither drags nor swaps (a bare attribute is `true`) */
    readonly disabled = input(undefined, { transform: optionalBoolean });
    /** the other groups whose items it swaps with: their names, or a predicate of the item */
    readonly accepts = input<SwappableOptions["accepts"]>(undefined);
    /** when a press becomes a drag (default: 3 px; touch: 200 ms within 5 px) */
    readonly activation = input<SwappableOptions["activation"]>(undefined);
    /** opt-in auto-scroll of the nearest scroll containers (`autoScroll()`) */
    readonly autoScroll = input<SwappableOptions["autoScroll"]>(undefined);
    /** whether the item follows the pointer (default true; false under a drag overlay) */
    readonly translate = input(undefined, { transform: optionalBoolean });
    /** the id of the element describing how to swap it (`aria-describedby`): the app's text */
    readonly describedBy = input<string | undefined>(undefined);

    /** dropped (on a target or not) or cancelled: apply it with `swapItems` or `swapBetween` */
    readonly swap = output<SwapEvent>();

    private readonly part = injectPart<Options, SwappableState>(
        BINDING,
        () =>
            defined({
                id: this.dndSwappable(),
                index: this.index(),
                group: this.group(),
                type: this.type(),
                data: this.data(),
                scope: this.scope(),
                space: this.space(),
                disabled: this.disabled(),
                accepts: this.accepts(),
                activation: this.activation(),
                autoScroll: this.autoScroll(),
                translate: this.translate(),
                describedBy: this.describedBy(),
                onSwap: this.onSwap,
            }),
        () => this.disabled(),
    );

    /** the item's state: `dragging`, `disabled` */
    readonly state: Signal<SwappableState> = this.part.state;

    // the callback the core calls: it emits the output, and renders the app after the task
    // (../../src/lib/utils/render.ts)
    private readonly onSwap = (event: SwapEvent) => {
        this.swap.emit(event);
        this.part.render();
    };

    ngOnChanges(): void {
        this.part.changed();
    }
}
