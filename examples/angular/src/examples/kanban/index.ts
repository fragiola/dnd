import { Component, signal } from "@angular/core";
import {
    DndSortable,
    DndSortableGroup,
    moveBetween,
    type SortEndEvent,
} from "@fragiola/dnd-angular/sortable";
import { type Board, taskOf } from "../_kit/tasks";
import * as styles from "./styles";

// A kanban: each column is a sortable group, and a card moves into another column when that
// column `accepts` the card's. The rule here is the app's: a card reaches Done only from Doing,
// so over Done a card from the Backlog changes nothing (the column is never entered). Every
// column's list is a `[dndSortableGroup]`, which an empty column needs (Done starts empty) and
// which lets a card drop below the last one. The app applies each drop with `moveBetween`.

type Column = "backlog" | "doing" | "done";

const COLUMNS: { id: Column; title: string; accepts: Column[] }[] = [
    { id: "backlog", title: "Backlog", accepts: ["doing", "done"] },
    { id: "doing", title: "Doing", accepts: ["backlog", "done"] },
    { id: "done", title: "Done", accepts: ["doing"] },
];

@Component({
    selector: "example-kanban",
    imports: [DndSortable, DndSortableGroup],
    host: { class: "contents" },
    template: `
        <div [class]="styles.frame">
            @for (column of COLUMNS; track column.id) {
                <section [attr.aria-labelledby]="'kanban-' + column.id" [class]="styles.column">
                    <h3 [id]="'kanban-' + column.id" [class]="styles.title">
                        {{ column.title }}
                        <span [class]="styles.count">{{ board()[column.id].length }}</span>
                    </h3>
                    <ul
                        [dndSortableGroup]="column.id"
                        [accepts]="column.accepts"
                        [attr.aria-label]="column.title"
                        [class]="styles.list"
                    >
                        @for (id of board()[column.id]; track id) {
                            @let task = taskOf(id);
                            <li
                                [dndSortable]="id"
                                [index]="$index"
                                [group]="column.id"
                                [accepts]="column.accepts"
                                (sortEnd)="sortEnd($event)"
                                [attr.aria-label]="task.title"
                                [class]="styles.card"
                            >
                                {{ task.title }}
                                <span [class]="styles.tag(task.tag)">{{ task.tag }}</span>
                            </li>
                        }
                    </ul>
                </section>
            }
        </div>
    `,
})
export default class Kanban {
    protected readonly styles = styles;
    protected readonly COLUMNS = COLUMNS;
    protected readonly taskOf = taskOf;
    protected readonly board = signal<Board<Column>>({
        backlog: ["login", "export", "search", "typo"],
        doing: ["guide", "avatar"],
        done: [],
    });

    protected sortEnd(event: SortEndEvent): void {
        this.board.update((now) => moveBetween(now, event));
    }
}
