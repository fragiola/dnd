// A drag handle (D9): inside a drag source's element (a draggable, a sortable or a swappable
// item), the only place a drag starts, and its tab stop. It finds its source through the DOM
// (`connectHandle` of `@fragiola/dnd/adapter`), never through injection, so the handle may sit
// deep inside the source, across any component boundary. It is a shared part: each drag source's
// entry re-exports it (`/draggable`, `/sortable`, `/swappable`), never the main one.
import {
    afterNextRender,
    computed,
    DestroyRef,
    Directive,
    inject,
    input,
    NgZone,
    type OnChanges,
    type Signal,
    signal,
    untracked,
} from "@angular/core";
import type { DraggableState } from "@fragiola/dnd";
import {
    connectHandle,
    createSlot,
    type HandleConnection,
    handleRest,
} from "@fragiola/dnd/adapter";
import { injectHost } from "../utils/helpers";
import { flag, writePart } from "../utils/host-attributes";

/**
 * Makes its host element the only place its drag source's drag starts, and its tab stop:
 * `<button type="button" dndDragHandle>`. It must be inside a `[dndDraggable]`, `[dndSortable]`
 * or `[dndSwappable]` element (found through the DOM); it adds no element. Its state is its
 * source's (`#grip="dndDragHandle"`, then `grip.state().dragging`).
 */
@Directive({ selector: "[dndDragHandle]", exportAs: "dndDragHandle" })
export class DndDragHandle implements OnChanges {
    /** the id of the element describing how to drag it (`aria-describedby`): the app's text */
    readonly describedBy = input<string | undefined>(undefined);

    private readonly element = injectHost("dndDragHandle");
    private readonly slot = createSlot<DraggableState>(() => handleRest);
    private readonly tick = signal(0);
    private connection: HandleConnection | undefined;
    private destroyed = false;

    /** its source's state: `dragging`, `disabled` (the rest state while it is not linked) */
    readonly state: Signal<DraggableState> = computed(() => {
        this.tick();
        return this.slot.getState();
    });

    constructor() {
        const zone = inject(NgZone);
        const unsubscribe = this.slot.subscribe(() => {
            this.write();
            this.tick.update((value) => value + 1);
        });
        this.write();
        afterNextRender({
            write: () => {
                this.connection = zone.runOutsideAngular(() =>
                    connectHandle(this.element, this.slot),
                );
                this.write();
            },
            // after every part of this render has connected: its source's element included (the
            // development check, see ../utils/helpers.ts)
            read: () => {
                if (
                    (typeof ngDevMode === "undefined" || ngDevMode) &&
                    !this.connection?.linked
                )
                    console.error(
                        '[dndDragHandle] is not inside a draggable, sortable or swappable element (`[dndDraggable]`, `[dndSortable]` or `[dndSwappable]`, `data-dnd-part="draggable"`, `"sortable"` or `"swappable"`): it has no effect.',
                    );
            },
        });
        inject(DestroyRef).onDestroy(() => {
            this.connection?.disconnect();
            this.connection = undefined;
            unsubscribe();
            this.destroyed = true;
            writePart(this.element, "handle", undefined);
        });
    }

    ngOnChanges(): void {
        this.write();
    }

    /** writes the handle's attributes from its source's state */
    private write(): void {
        if (this.destroyed) return;
        const state = untracked(this.slot.getState);
        writePart(this.element, "handle", {
            "data-dnd-handle": "",
            "data-dnd-dragging": flag(state.dragging),
            "data-dnd-disabled": flag(state.disabled),
            "aria-disabled": state.disabled ? "true" : undefined,
            "aria-describedby": untracked(this.describedBy),
        });
    }
}
