import { Component, signal } from "@angular/core";
import {
    arrayMove,
    DndSortable,
    type SortEndEvent,
} from "@fragiola/dnd-angular/sortable";
import { taskOf } from "../_kit/tasks";
import * as styles from "./styles";

// A sortable list with no wrapper around it: each `li` is a `[dndSortable]` of the group "tasks",
// at its index in the app's array. While a card is dragged the core shifts its neighbours with
// `translate` (the app's CSS animates them, see styles.ts); nothing renders. On the drop the app
// applies `(sortEnd)` to its own array with `arrayMove`, and the DOM follows the new order.

@Component({
    selector: "example-sortable-list",
    imports: [DndSortable],
    host: { class: "contents" },
    template: `
        <div [class]="styles.frame">
            <ul aria-label="Tasks" [class]="styles.list">
                @for (id of tasks(); track id) {
                    <li
                        [dndSortable]="id"
                        [index]="$index"
                        group="tasks"
                        (sortEnd)="sortEnd($event)"
                        [attr.aria-label]="taskOf(id).title"
                        [class]="styles.item"
                    >
                        <span [class]="styles.rank">{{ $index + 1 }}</span>
                        {{ taskOf(id).title }}
                    </li>
                }
            </ul>
        </div>
    `,
})
export default class SortableList {
    protected readonly styles = styles;
    protected readonly taskOf = taskOf;
    protected readonly tasks = signal([
        "login",
        "export",
        "guide",
        "avatar",
        "typo",
    ]);

    protected sortEnd({ from, to, canceled }: SortEndEvent): void {
        if (!canceled)
            this.tasks.update((now) => arrayMove(now, from.index, to.index));
    }
}
