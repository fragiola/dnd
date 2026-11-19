// The sortable item directive (S2, D6): `<li [dndSortable]="item.id" [index]="$index" group="todo">`
// keeps the `li` as the only element, registered as an item of its group's list, with
// `data-dnd-*` and ARIA on it. A list needs no directive around it. The preview's shifts are
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
import { connectSource, sortableBinding } from "@fragiola/dnd/adapter";
import {
    registerSortable,
    type SortableOptions,
    type SortableState,
    type SortEndEvent,
    type SortEvent,
} from "@fragiola/dnd/sortable";
import {
    ɵdefined as defined,
    ɵflag as flag,
    ɵinjectPart as injectPart,
    ɵoptionalBoolean as optionalBoolean,
    type ɵPartBinding as PartBinding,
} from "@fragiola/dnd-angular";

/** The item's options, as its directive passes them to the core. */
type Options = Omit<SortableOptions, "handle"> & {
    readonly describedBy?: string | undefined;
};

/** How the directive drives the core's sortable item. */
const BINDING: PartBinding<Options, SortableState> = {
    ...sortableBinding,
    part: "sortable",
    selector: "dndSortable",
    connect: (element, options, slot) =>
        connectSource(element, registerSortable, options, slot),
    attributes: (state, options) => ({
        "data-dnd-id": String(options.id),
        "data-dnd-dragging": flag(state.dragging),
        "data-dnd-sorting": flag(state.sorting),
        "data-dnd-disabled": flag(state.disabled),
        "aria-disabled": state.disabled ? "true" : undefined,
        "aria-describedby": options.describedBy,
    }),
};

/**
 * Makes its host element an item of its `group`'s list, sorted by pointer and keyboard, with no
 * provider and no directive around the list. It adds no element: the host is marked
 * `data-dnd-part="sortable"`, `data-dnd-id`, `data-dnd-dragging`, `data-dnd-sorting` and
 * `data-dnd-disabled`. Commit the order on `(sortEnd)` (`arrayMove`, `moveBetween`). Its state is
 * a signal (`#item="dndSortable"`), which changes at a sort's start and end only.
 */
@Directive({ selector: "[dndSortable]", exportAs: "dndSortable" })
export class DndSortable implements OnChanges {
    /** its id, unique within its scope */
    readonly dndSortable = input.required<DragId>();
    /** its place in its group's list, from 0 */
    readonly index = input.required({ transform: numberAttribute });
    /** the list it belongs to, within its scope (also the group's drop target id) */
    readonly group = input.required<string>();
    /** what plain droppables with an `accepts` list match */
    readonly type = input<string | undefined>(undefined);
    /** anything the app wants back in the events */
    readonly data = input<unknown>(undefined);
    /** only sortables and droppables of the same scope meet it */
    readonly scope = input<string | undefined>(undefined);
    /** an explicit space from `createDragSpace` (default: the element's document's) */
    readonly space = input<SortableOptions["space"]>(undefined);
    /** a disabled item neither drags nor moves (a bare attribute is `true`) */
    readonly disabled = input(undefined, { transform: optionalBoolean });
    /** the other groups whose items its group takes (its own always) */
    readonly accepts = input<SortableOptions["accepts"]>(undefined);
    /** how its group places and shifts items (default: `verticalList`) */
    readonly strategy = input<SortableOptions["strategy"]>(undefined);
    /** when a press becomes a drag (default: 3 px; touch: 200 ms within 5 px) */
    readonly activation = input<SortableOptions["activation"]>(undefined);
    /** opt-in auto-scroll of the nearest scroll containers (`autoScroll()`) */
    readonly autoScroll = input<SortableOptions["autoScroll"]>(undefined);
    /** whether the item follows the pointer (default true; false under a drag overlay) */
    readonly translate = input(undefined, { transform: optionalBoolean });
    /** the id of the element describing how to sort it (`aria-describedby`): the app's text */
    readonly describedBy = input<string | undefined>(undefined);

    /** its sort started */
    readonly sortStart = output<SortEvent<"sort-start">>();
    /** the preview changed: `to` is where it would go now */
    readonly sortOver = output<SortEvent<"sort-over">>();
    /** dropped or cancelled: apply `from` → `to` to the app's data */
    readonly sortEnd = output<SortEndEvent>();

    private readonly part = injectPart<Options, SortableState>(
        BINDING,
        () =>
            defined({
                id: this.dndSortable(),
                index: this.index(),
                group: this.group(),
                type: this.type(),
                data: this.data(),
                scope: this.scope(),
                space: this.space(),
                disabled: this.disabled(),
                accepts: this.accepts(),
                strategy: this.strategy(),
                activation: this.activation(),
                autoScroll: this.autoScroll(),
                translate: this.translate(),
                describedBy: this.describedBy(),
                onSortStart: this.onSortStart,
                onSortOver: this.onSortOver,
                onSortEnd: this.onSortEnd,
            }),
        () => this.disabled(),
    );

    /** the item's state: `dragging`, `sorting`, `disabled` */
    readonly state: Signal<SortableState> = this.part.state;

    // the callbacks the core calls: each emits its output
    private readonly onSortStart = (event: SortEvent<"sort-start">) =>
        this.sortStart.emit(event);
    private readonly onSortOver = (event: SortEvent<"sort-over">) =>
        this.sortOver.emit(event);
    private readonly onSortEnd = (event: SortEndEvent) =>
        this.sortEnd.emit(event);

    ngOnChanges(): void {
        this.part.changed();
    }
}
