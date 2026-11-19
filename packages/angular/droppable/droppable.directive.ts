// The droppable directive (D6): `<section dndDroppable="z">` keeps the `section` as the only
// element, registered as a drop target in its document's drag space, with `data-dnd-*` on it.
import {
    Directive,
    input,
    type OnChanges,
    output,
    type Signal,
} from "@angular/core";
import type { DragId, DroppableEvent } from "@fragiola/dnd";
import { connectPart, droppableBinding } from "@fragiola/dnd/adapter";
import {
    type DroppableOptions,
    type DroppableState,
    registerDroppable,
} from "@fragiola/dnd/droppable";
import {
    ɵdefined as defined,
    ɵflag as flag,
    ɵinjectPart as injectPart,
    ɵoptionalBoolean as optionalBoolean,
    type ɵPartBinding as PartBinding,
} from "@fragiola/dnd-angular";

/** How the directive drives the core's droppable. */
const BINDING: PartBinding<DroppableOptions, DroppableState> = {
    ...droppableBinding,
    part: "droppable",
    selector: "dndDroppable",
    connect: (element, options, slot) =>
        connectPart(element, registerDroppable, options, slot),
    attributes: (state, options) => ({
        "data-dnd-id": String(options.id),
        "data-dnd-over": flag(state.over),
        "data-dnd-refused": flag(state.refused),
        "data-dnd-active": flag(state.active),
        "data-dnd-disabled": flag(state.disabled),
        "aria-disabled": state.disabled ? "true" : undefined,
    }),
};

/**
 * Makes its host element a drop target, with no provider:
 * `<section dndDroppable="z" [accepts]="['task']" (drop)="dropped($event)">`. It adds no element:
 * the host is marked `data-dnd-part="droppable"`, `data-dnd-id`, `data-dnd-over`,
 * `data-dnd-refused`, `data-dnd-active` and `data-dnd-disabled`. Its state is a signal
 * (`#zone="dndDroppable"`, then `zone.state().over`); it changes on enter, leave and drop, never
 * while a drag moves inside it (D8).
 */
@Directive({ selector: "[dndDroppable]", exportAs: "dndDroppable" })
export class DndDroppable implements OnChanges {
    /** its id, unique within its scope */
    readonly dndDroppable = input.required<DragId>();
    /** anything the app wants back in the events (`operation.target.data`) */
    readonly data = input<unknown>(undefined);
    /** only draggables of the same scope meet it (default: the document's default scope) */
    readonly scope = input<string | undefined>(undefined);
    /** an explicit space from `createDragSpace` (default: the element's document's) */
    readonly space = input<DroppableOptions["space"]>(undefined);
    /** what it takes (default: everything): a list of draggable `type`s, or a predicate */
    readonly accepts = input<DroppableOptions["accepts"]>(undefined);
    /** a disabled droppable is never a target (a bare attribute is `true`) */
    readonly disabled = input(undefined, { transform: optionalBoolean });

    /** an accepted drag entered it */
    readonly dragEnter = output<DroppableEvent<"drag-enter">>();
    /** the drag moved over it (once per frame) */
    readonly dragOver = output<DroppableEvent<"drag-over">>();
    /** the drag left it */
    readonly dragLeave = output<DroppableEvent<"drag-leave">>();
    /** an accepted source was released over it, before the draggable's `(dragEnd)` */
    readonly drop = output<DroppableEvent<"drop">>();

    private readonly part = injectPart<DroppableOptions, DroppableState>(
        BINDING,
        () =>
            defined({
                id: this.dndDroppable(),
                data: this.data(),
                scope: this.scope(),
                space: this.space(),
                accepts: this.accepts(),
                disabled: this.disabled(),
                onDragEnter: this.onDragEnter,
                onDragOver: this.onDragOver,
                onDragLeave: this.onDragLeave,
                onDrop: this.onDrop,
            }),
        () => this.disabled(),
    );

    /** the droppable's state: `over`, `active`, `refused`, `disabled` */
    readonly state: Signal<DroppableState> = this.part.state;

    // the callbacks the core calls: each emits its output
    private readonly onDragEnter = (event: DroppableEvent<"drag-enter">) =>
        this.dragEnter.emit(event);
    private readonly onDragOver = (event: DroppableEvent<"drag-over">) =>
        this.dragOver.emit(event);
    private readonly onDragLeave = (event: DroppableEvent<"drag-leave">) =>
        this.dragLeave.emit(event);
    private readonly onDrop = (event: DroppableEvent<"drop">) =>
        this.drop.emit(event);

    ngOnChanges(): void {
        this.part.changed();
    }
}
