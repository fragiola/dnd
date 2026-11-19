// The drag overlay (D7, D9): the one part that renders HTML, and only because the app asks for
// it. While a drag of its space (and scope) runs, it renders the app's template into a `div` in
// that space's document `body`, a fixed box where the source would be (the core's
// `overlayStyle`), inert to the pointer: for drags out of `overflow: hidden` containers and
// between scroll containers. The template's view is created on the drag's start, updated on its
// target changes and destroyed at its end; the pointer's moves write the box's `left`/`top`
// directly, outside change detection (D8): the core's `followOverlay` decides both. Give the
// draggable `[translate]="false"` so the source stays in place while the overlay moves.
import {
    DestroyRef,
    Directive,
    type EmbeddedViewRef,
    effect,
    inject,
    input,
    NgZone,
    TemplateRef,
    untracked,
    ViewContainerRef,
} from "@angular/core";
import {
    type DragOperation,
    type DragSpace,
    overlayStyle,
} from "@fragiola/dnd";
import { followOverlay } from "@fragiola/dnd/adapter";
import { injectDragSpace, injectRendered } from "../inject/inject-drag-space";

/** The overlay's state: the drag it shows. */
export interface DragOverlayState {
    readonly operation: DragOperation;
}

/**
 * What the overlay's template receives: the drag in progress, as `let-operation` (the implicit
 * value) or `let-operation="operation"`, and its state.
 */
export interface DragOverlayContext {
    readonly $implicit: DragOperation;
    readonly operation: DragOperation;
    readonly state: DragOverlayState;
}

/** Writes the overlay box's structural style (D7) for `operation`. */
function place(element: HTMLElement, operation: DragOperation): void {
    for (const [key, value] of Object.entries(overlayStyle(operation)))
        element.style.setProperty(
            key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`),
            typeof value === "number" ? `${value}px` : value,
        );
}

/**
 * Shows its template under the pointer while a drag runs, in a `div` portalled into the
 * document's `body` (`data-dnd-part="overlay"`, `overlayClass` its class):
 * `<ng-template dndDragOverlay let-operation>…{{ operation.source.id }}…</ng-template>`. It can
 * sit anywhere in the app; it needs no provider.
 */
@Directive({ selector: "ng-template[dndDragOverlay]" })
export class DndDragOverlay {
    /** only the drags of this scope */
    readonly scope = input<string | undefined>(undefined);
    /** an explicit space from `createDragSpace` */
    readonly space = input<DragSpace | undefined>(undefined);
    /** this document's drags (default: the app's) */
    readonly document = input<Document | undefined>(undefined);
    /** the class of the overlay's box */
    readonly overlayClass = input<string | undefined>(undefined);

    private readonly template =
        inject<TemplateRef<DragOverlayContext>>(TemplateRef);
    private readonly container = inject(ViewContainerRef);
    private readonly zone = inject(NgZone);
    private readonly resolved = injectDragSpace(() => ({
        space: this.space(),
        document: this.document(),
    }));
    private readonly rendered = injectRendered();
    private view: EmbeddedViewRef<DragOverlayContext> | undefined;
    private box: HTMLElement | undefined;

    /** Narrows the template's context: `let-operation` is a `DragOperation`. */
    static ngTemplateContextGuard(
        _directive: DndDragOverlay,
        _context: unknown,
    ): _context is DragOverlayContext {
        return true;
    }

    constructor() {
        effect((onCleanup) => {
            const space = this.resolved();
            const scope = this.scope();
            // from the first render on, even with an explicit space: never on the server
            if (!space || !this.rendered()) return;
            untracked(() => {
                // outside Angular's zone, when the app has one: the moves never start one
                const stop = this.zone.runOutsideAngular(() =>
                    followOverlay(
                        space,
                        {
                            show: (operation) => this.show(space, operation),
                            move: () => {},
                            element: () => this.box ?? null,
                        },
                        scope,
                    ),
                );
                onCleanup(stop);
            });
        });
        effect(() => {
            const name = this.overlayClass();
            untracked(() => {
                if (this.box) this.box.className = name ?? "";
            });
        });
        inject(DestroyRef).onDestroy(() => this.hide());
    }

    /** Renders the drag (start, target change), or nothing (end). */
    private show(space: DragSpace, operation: DragOperation | undefined): void {
        if (!operation) {
            this.hide();
            return;
        }
        const context: DragOverlayContext = {
            $implicit: operation,
            operation,
            state: { operation },
        };
        if (!this.box) {
            const doc = space.get("document");
            const box = doc.createElement("div");
            box.setAttribute("data-dnd-part", "overlay");
            const name = untracked(this.overlayClass);
            if (name) box.className = name;
            this.box = box;
            this.zone.run(() => {
                this.view = this.container.createEmbeddedView(
                    this.template,
                    context,
                );
                for (const node of this.view.rootNodes) box.append(node);
                this.view.detectChanges();
            });
            place(box, operation);
            doc.body.append(box);
            return;
        }
        place(this.box, operation);
        const view = this.view;
        if (view) {
            Object.assign(view.context, context);
            this.zone.run(() => view.detectChanges());
        }
    }

    /** Removes the overlay's view and box. */
    private hide(): void {
        this.view?.destroy();
        this.view = undefined;
        this.box?.remove();
        this.box = undefined;
    }
}
