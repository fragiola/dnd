// Type fixtures, checked by `ngc` (strict templates, the host bindings typed), never run: the
// directives take their capability's options as inputs and emit the core's events from their
// outputs, their state is a read-only signal, the overlay's template context is the drag in
// progress, and the injection functions take a value or a function. `@ts-expect-error` marks what
// must not compile.
import { Component, type Signal, signal } from "@angular/core";
import {
    DndDraggable,
    DndDragHandle,
    type DraggableState,
} from "../../draggable/public-api";
import { DndDroppable, type DroppableState } from "../../droppable/public-api";
import {
    DndSortable,
    DndSortableGroup,
    type SortableState,
    type SortEndEvent,
} from "../../sortable/public-api";
import {
    DndDragOverlay,
    type DragOperation,
    type DragOverlayContext,
    type DragSpace,
    type DropEvent,
    type DroppableEvent,
    injectDragMonitor,
    injectDragSpace,
} from "../../src/public-api";
import { DndSwappable, type SwapEvent } from "../../swappable/public-api";

/** Every directive in a strict template: inputs, outputs, `exportAs` and the overlay context. */
@Component({
    selector: "test-board",
    imports: [
        DndDraggable,
        DndDragHandle,
        DndDroppable,
        DndSortable,
        DndSortableGroup,
        DndSwappable,
        DndDragOverlay,
    ],
    template: `
        <li
            dndDraggable="a"
            type="task"
            disabled
            [translate]="false"
            [activation]="{ distance: 5 }"
            #card="dndDraggable"
            [class.lifted]="card.state().dragging"
            (dragEnd)="ended($event)"
        >
            <button type="button" dndDragHandle describedBy="help" #grip="dndDragHandle" [class.on]="grip.state().dragging"></button>
        </li>
        <section [dndDroppable]="1" [accepts]="['task']" #zone="dndDroppable" [class.over]="zone.state().over" (drop)="dropped($event)"></section>
        <ul dndSortableGroup="list" [accepts]="['done']">
            @for (id of ids(); track id) {
                <li [dndSortable]="id" [index]="$index" group="list" #item="dndSortable" [class.sorting]="item.state().sorting" (sortEnd)="sorted($event)"></li>
            }
        </ul>
        <div dndSwappable="s" index="0" group="row" (swap)="swapped($event)"></div>
        <ng-template dndDragOverlay scope="board" overlayClass="ghost" let-operation let-state="state">
            {{ operation.source.id }} {{ state.operation.delta.x }}
        </ng-template>
    `,
})
export class Board {
    readonly ids = signal(["a", "b"]);
    ended(event: DropEvent) {
        return event.operation.target?.id;
    }
    dropped(event: DroppableEvent<"drop">) {
        return event.operation.source.id;
    }
    sorted(event: SortEndEvent) {
        return event.to.index;
    }
    swapped(event: SwapEvent) {
        return event.target?.index;
    }
}

declare const draggable: DndDraggable;
const state: Signal<DraggableState> = draggable.state;
// @ts-expect-error the state is read-only
draggable.state.set({ dragging: true, disabled: false });
declare const droppable: DndDroppable;
const over: boolean = droppable.state().over;
declare const sortable: DndSortable;
const sorting: SortableState["sorting"] = sortable.state().sorting;
const zone: DroppableState = droppable.state();

// the overlay's context guard narrows the template's context to the drag in progress
declare const overlay: DndDragOverlay;
declare const context: unknown;
if (DndDragOverlay.ngTemplateContextGuard(overlay, context)) {
    const typed: DragOverlayContext = context;
    const operation: DragOperation = typed.$implicit;
    // @ts-expect-error the context is read-only
    typed.operation = operation;
}

/** The injection functions, with a value or a function of signals. */
export class Monitor {
    readonly space: Signal<DragSpace | undefined> = injectDragSpace();
    readonly scope = signal("board");
    constructor() {
        injectDragMonitor((event) => event.type, { scope: "board" });
        injectDragMonitor(
            (event) => event.operation.source.id,
            () => ({ scope: this.scope() }),
        );
        // @ts-expect-error the scope is a string
        injectDragMonitor(() => {}, { scope: 1 });
    }
}

export const used = [state, over, sorting, zone];
