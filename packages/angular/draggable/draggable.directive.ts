// The draggable directive (D6): `<li dndDraggable="a">` keeps the `li` as the only element,
// registered as a draggable in its document's drag space, with `data-dnd-*` and ARIA on it.
import {
    Directive,
    input,
    type OnChanges,
    output,
    type Signal,
} from "@angular/core";
import type {
    DragCancelEvent,
    DragId,
    DragMoveEvent,
    DragStartEvent,
    DropEvent,
} from "@fragiola/dnd";
import { connectSource, draggableBinding } from "@fragiola/dnd/adapter";
import {
    type DraggableOptions,
    type DraggableState,
    registerDraggable,
} from "@fragiola/dnd/draggable";
import {
    ɵdefined as defined,
    ɵflag as flag,
    ɵinjectPart as injectPart,
    ɵoptionalBoolean as optionalBoolean,
    type ɵPartBinding as PartBinding,
} from "@fragiola/dnd-angular";

/** The draggable's options, as its directive passes them to the core. */
type Options = Omit<DraggableOptions, "handle"> & {
    readonly describedBy?: string | undefined;
};

/** How the directive drives the core's draggable. */
const BINDING: PartBinding<Options, DraggableState> = {
    ...draggableBinding,
    part: "draggable",
    selector: "dndDraggable",
    connect: (element, options, slot) =>
        connectSource(element, registerDraggable, options, slot),
    attributes: (state, options) => ({
        "data-dnd-id": String(options.id),
        "data-dnd-dragging": flag(state.dragging),
        "data-dnd-disabled": flag(state.disabled),
        "aria-disabled": state.disabled ? "true" : undefined,
        "aria-describedby": options.describedBy,
    }),
};

/**
 * Makes its host element draggable, by pointer and keyboard, with no provider:
 * `<li dndDraggable="a" type="task" (dragEnd)="moved($event)">`. It adds no element: the host is
 * registered in its document's drag space, made a tab stop when it is not focusable, and marked
 * `data-dnd-part="draggable"`, `data-dnd-id`, `data-dnd-dragging` and `data-dnd-disabled`. Its
 * state is a signal (`#card="dndDraggable"`, then `card.state().dragging`).
 */
@Directive({ selector: "[dndDraggable]", exportAs: "dndDraggable" })
export class DndDraggable implements OnChanges {
    /** its id, unique within its scope */
    readonly dndDraggable = input.required<DragId>();
    /** what droppables with an `accepts` list match */
    readonly type = input<string | undefined>(undefined);
    /** anything the app wants back in the events */
    readonly data = input<unknown>(undefined);
    /** only droppables of the same scope meet it (default: the document's default scope) */
    readonly scope = input<string | undefined>(undefined);
    /** an explicit space from `createDragSpace` (default: the element's document's) */
    readonly space = input<DraggableOptions["space"]>(undefined);
    /** no drag starts while true (a bare attribute is `true`) */
    readonly disabled = input(undefined, { transform: optionalBoolean });
    /** when a press becomes a drag (default: 3 px; touch: 200 ms within 5 px) */
    readonly activation = input<DraggableOptions["activation"]>(undefined);
    /** the keyboard's step and mode */
    readonly keyboard = input<DraggableOptions["keyboard"]>(undefined);
    /** opt-in auto-scroll of the nearest scroll containers (`autoScroll()`) */
    readonly autoScroll = input<DraggableOptions["autoScroll"]>(undefined);
    /** how the target is found (default: `pointerWithin`) */
    readonly collision = input<DraggableOptions["collision"]>(undefined);
    /** whether the element follows the pointer (default true; false under a drag overlay) */
    readonly translate = input(undefined, { transform: optionalBoolean });
    /** the id of the element describing how to drag it (`aria-describedby`): the app's text */
    readonly describedBy = input<string | undefined>(undefined);

    /** a drag started */
    readonly dragStart = output<DragStartEvent>();
    /** the pointer moved during the drag (once per frame) */
    readonly dragMove = output<DragMoveEvent>();
    /** the drag was released, on a target or not (`event.operation.target`) */
    readonly dragEnd = output<DropEvent>();
    /** the drag was cancelled (Escape, a lost pointer) */
    readonly dragCancel = output<DragCancelEvent>();

    private readonly part = injectPart<Options, DraggableState>(
        BINDING,
        () =>
            defined({
                id: this.dndDraggable(),
                type: this.type(),
                data: this.data(),
                scope: this.scope(),
                space: this.space(),
                disabled: this.disabled(),
                activation: this.activation(),
                keyboard: this.keyboard(),
                autoScroll: this.autoScroll(),
                collision: this.collision(),
                translate: this.translate(),
                describedBy: this.describedBy(),
                onDragStart: this.onDragStart,
                onDragMove: this.onDragMove,
                onDragEnd: this.onDragEnd,
                onDragCancel: this.onDragCancel,
            }),
        () => this.disabled(),
    );

    /** the draggable's state: `dragging`, `disabled` (changes on a drag's start and end only) */
    readonly state: Signal<DraggableState> = this.part.state;

    // the callbacks the core calls: each emits its output, and a discrete one renders the app
    // after the task (../../src/lib/utils/render.ts)
    private readonly onDragStart = (event: DragStartEvent) => {
        this.dragStart.emit(event);
        this.part.render();
    };
    private readonly onDragMove = (event: DragMoveEvent) =>
        this.dragMove.emit(event);
    private readonly onDragEnd = (event: DropEvent) => {
        this.dragEnd.emit(event);
        this.part.render();
    };
    private readonly onDragCancel = (event: DragCancelEvent) => {
        this.dragCancel.emit(event);
        this.part.render();
    };

    ngOnChanges(): void {
        this.part.changed();
    }
}
