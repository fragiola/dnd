import { Component, signal } from "@angular/core";
import { DndDragOverlay, type DroppableEvent } from "@fragiola/dnd-angular";
import { DndDraggable } from "@fragiola/dnd-angular/draggable";
import { DndDroppable } from "@fragiola/dnd-angular/droppable";
import * as styles from "./styles";

// The strip of tags clips its content (`overflow: hidden`, as a tab row does): a tag moved by its
// own `translate` would vanish at the strip's edge. So the tags keep still (`[translate]="false"`)
// and a `dndDragOverlay` template shows a copy under the pointer, rendered into the document's
// body. The overlay is the one part that renders an element, a `div` fixed over the dragged box;
// what is inside it, and how it looks, is the app's.

const TAGS = [
    "Design",
    "Research",
    "Frontend",
    "Backend",
    "Ops",
    "Writing",
    "QA",
];

@Component({
    selector: "example-drag-overlay",
    imports: [DndDraggable, DndDroppable, DndDragOverlay],
    host: { class: "contents" },
    template: `
        <div [class]="styles.frame">
            <ul aria-label="Tags" [class]="styles.strip">
                @for (tag of TAGS; track tag) {
                    <li [dndDraggable]="tag" [translate]="false" [attr.aria-label]="tag" [class]="styles.tag">
                        {{ tag }}
                    </li>
                }
            </ul>
            <section dndDroppable="favourites" (drop)="drop($event)" aria-label="Favourites" [class]="styles.zone">
                @for (tag of favourites(); track tag) {
                    <span [class]="styles.chosen">{{ tag }}</span>
                } @empty {
                    <span [class]="styles.hint">Drop tags here</span>
                }
            </section>
            <!-- Anywhere in the template: it shows while a drag of this document runs. -->
            <ng-template dndDragOverlay [overlayClass]="styles.overlay" let-operation>
                <span [class]="styles.lifted">{{ operation.source.id }}</span>
            </ng-template>
        </div>
    `,
})
export default class DragOverlayExample {
    protected readonly styles = styles;
    protected readonly TAGS = TAGS;
    protected readonly favourites = signal<readonly string[]>([]);

    protected drop(event: DroppableEvent<"drop">): void {
        const tag = String(event.operation.source.id);
        this.favourites.update((now) =>
            now.includes(tag) ? now : [...now, tag],
        );
    }
}
