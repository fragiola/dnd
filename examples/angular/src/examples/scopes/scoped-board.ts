import { Component, input, linkedSignal } from "@angular/core";
import type { DroppableEvent } from "@fragiola/dnd-angular";
import { DndDraggable } from "@fragiola/dnd-angular/draggable";
import { DndDroppable } from "@fragiola/dnd-angular/droppable";
import { type Board, moveTask, taskOf } from "../_kit/tasks";
import * as styles from "./styles";

// One board, its own scope: its columns and its cards carry the same `scope` string.

export type Column = "open" | "closed";

const COLUMNS: { id: Column; title: string }[] = [
    { id: "open", title: "Open" },
    { id: "closed", title: "Closed" },
];

@Component({
    selector: "example-scopes-scoped-board",
    imports: [DndDraggable, DndDroppable],
    host: { class: "contents" },
    template: `
        <section [attr.aria-label]="title() + ' board'" [class]="styles.board">
            <h3 [class]="styles.boardTitle">{{ title() + ' (scope "' + scope() + '")' }}</h3>
            <div [class]="styles.columns">
                <!-- ids are unique within a scope: both boards have an "open" column -->
                @for (column of columns; track column.id) {
                    <section
                        [dndDroppable]="column.id"
                        [scope]="scope()"
                        (drop)="drop($event, column.id)"
                        [attr.aria-label]="title() + ' ' + column.title"
                        [class]="styles.column"
                    >
                        <span [class]="styles.columnTitle">{{ column.title }}</span>
                        @for (id of board()[column.id]; track id) {
                            <article
                                [dndDraggable]="id"
                                [scope]="scope()"
                                [attr.aria-label]="taskOf(id).title"
                                [class]="styles.card"
                            >
                                {{ taskOf(id).title }}
                            </article>
                        }
                    </section>
                }
            </div>
        </section>
    `,
})
export class ScopedBoard {
    readonly scope = input.required<string>();
    readonly title = input.required<string>();
    readonly start = input.required<Board<Column>>();
    protected readonly styles = styles;
    protected readonly columns = COLUMNS;
    protected readonly taskOf = taskOf;
    protected readonly board = linkedSignal(() => this.start());

    protected drop(event: DroppableEvent<"drop">, column: Column) {
        this.board.update((board) =>
            moveTask(board, String(event.operation.source.id), column),
        );
    }
}
