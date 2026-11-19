import { Component, computed, input } from "@angular/core";
import { DndDraggable, DndDragHandle } from "@fragiola/dnd-angular/draggable";
import { LucideGripVertical } from "@lucide/angular";
import { taskOf } from "../_kit/tasks";
import * as styles from "./styles";

// A card dragged by its grip only.

@Component({
    selector: "example-drag-handle-card",
    imports: [DndDraggable, DndDragHandle, LucideGripVertical],
    host: { class: "contents" },
    template: `
        <article [dndDraggable]="id()" [attr.aria-label]="task().title" [class]="styles.card">
            <!-- the handle is the tab stop (a button may be a handle): its name is the app's -->
            <button type="button" dndDragHandle [attr.aria-label]="'Move ' + task().title" [class]="styles.handle">
                <svg lucideGripVertical aria-hidden="true"></svg>
            </button>
            <p [class]="styles.cardText">{{ task().title }}</p>
        </article>
    `,
})
export class Card {
    readonly id = input.required<string>();
    protected readonly task = computed(() => taskOf(this.id()));
    protected readonly styles = styles;
}
