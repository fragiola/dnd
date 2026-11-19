// The sortable group directive (S2, D6): `<ul dndSortableGroup="done">` keeps the `ul` as the
// only element, marked as its group's container. It is optional: a list needs it only to be
// sorted into while it is empty, or to the container's end.
import { Directive, input, type OnChanges, type Signal } from "@angular/core";
import { connectPart, sortableGroupBinding } from "@fragiola/dnd/adapter";
import {
    registerSortableGroup,
    type SortableGroupOptions,
    type SortableGroupState,
} from "@fragiola/dnd/sortable";
import {
    ɵdefined as defined,
    ɵflag as flag,
    ɵinjectPart as injectPart,
    ɵoptionalBoolean as optionalBoolean,
    type ɵPartBinding as PartBinding,
} from "@fragiola/dnd-angular";

/** How the directive drives the core's sortable group. */
const BINDING: PartBinding<SortableGroupOptions, SortableGroupState> = {
    ...sortableGroupBinding,
    part: "sortable-group",
    selector: "dndSortableGroup",
    connect: (element, options, slot) =>
        connectPart(element, registerSortableGroup, options, slot),
    attributes: (state, options) => ({
        "data-dnd-id": options.group,
        "data-dnd-sorting": flag(state.sorting),
        "data-dnd-disabled": flag(state.disabled),
        "aria-disabled": state.disabled ? "true" : undefined,
    }),
};

/**
 * Marks its host element as the container of a sortable group, with no provider. It adds no
 * element: the host is marked `data-dnd-part="sortable-group"`, `data-dnd-id` (the group),
 * `data-dnd-sorting` and `data-dnd-disabled`. Its state is a signal (`#list="dndSortableGroup"`),
 * which changes at a sort's start and end only.
 */
@Directive({ selector: "[dndSortableGroup]", exportAs: "dndSortableGroup" })
export class DndSortableGroup implements OnChanges {
    /** the group whose container it is */
    readonly dndSortableGroup = input.required<string>();
    readonly scope = input<string | undefined>(undefined);
    readonly space = input<SortableGroupOptions["space"]>(undefined);
    /** what the middleware sees as the drop target's data */
    readonly data = input<unknown>(undefined);
    /** a disabled group is never sorted into, nor within (a bare attribute is `true`) */
    readonly disabled = input(undefined, { transform: optionalBoolean });
    /** the other groups whose items it takes, with its items' own */
    readonly accepts = input<SortableGroupOptions["accepts"]>(undefined);
    /** how the group places and shifts items (default: its items', else `verticalList`) */
    readonly strategy = input<SortableGroupOptions["strategy"]>(undefined);

    private readonly part = injectPart<
        SortableGroupOptions,
        SortableGroupState
    >(
        BINDING,
        () =>
            defined({
                group: this.dndSortableGroup(),
                scope: this.scope(),
                space: this.space(),
                data: this.data(),
                disabled: this.disabled(),
                accepts: this.accepts(),
                strategy: this.strategy(),
            }),
        () => this.disabled(),
    );

    /** the group's state: `sorting`, `disabled` */
    readonly state: Signal<SortableGroupState> = this.part.state;

    ngOnChanges(): void {
        this.part.changed();
    }
}
