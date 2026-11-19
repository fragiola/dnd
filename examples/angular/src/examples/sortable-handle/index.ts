import { Component, signal } from "@angular/core";
import {
    arrayMove,
    DndDragHandle,
    DndSortable,
    type SortEndEvent,
} from "@fragiola/dnd-angular/sortable";
import { LucideGripVertical } from "@lucide/angular";
import { taskOf } from "../_kit/tasks";
import * as styles from "./styles";

// The same `[dndDragHandle]` as a draggable's, from the sortable entry: inside a `[dndSortable]`
// it is the only place a sort starts, and the tab stop, so the row's text stays selectable. It
// finds its item through the DOM, so it can sit anywhere inside the row.

@Component({
    selector: "example-sortable-handle",
    imports: [DndDragHandle, DndSortable, LucideGripVertical],
    host: { class: "contents" },
    template: `
        <div [class]="styles.frame">
            <ol aria-label="Release checklist" [class]="styles.list">
                @for (id of tasks(); track id) {
                    @let task = taskOf(id);
                    <li
                        [dndSortable]="id"
                        [index]="$index"
                        group="checklist"
                        (sortEnd)="sortEnd($event)"
                        [attr.aria-label]="task.title"
                        [class]="styles.row"
                    >
                        <!-- the handle's name is the app's -->
                        <button
                            type="button"
                            dndDragHandle
                            [attr.aria-label]="'Move ' + task.title"
                            [class]="styles.handle"
                        >
                            <svg lucideGripVertical aria-hidden="true"></svg>
                        </button>
                        <p [class]="styles.text">{{ task.title }}</p>
                    </li>
                }
            </ol>
        </div>
    `,
})
export default class SortableHandle {
    protected readonly styles = styles;
    protected readonly taskOf = taskOf;
    protected readonly tasks = signal<readonly string[]>([
        "guide",
        "api",
        "login",
        "flaky",
    ]);

    protected sortEnd({ from, to, canceled }: SortEndEvent): void {
        if (!canceled)
            this.tasks.update((now) => arrayMove(now, from.index, to.index));
    }
}
