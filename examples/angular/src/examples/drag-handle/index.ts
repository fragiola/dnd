import { Component, signal } from "@angular/core";
import { DndDroppable } from "@fragiola/dnd-angular/droppable";
import { type Board, moveTask } from "../_kit/tasks";
import { Card } from "./card";
import * as styles from "./styles";

// A `[dndDragHandle]` inside a draggable makes the handle the only place a drag starts, and the
// tab stop: the card's text stays selectable. The handle finds its draggable through the DOM, not
// dependency injection, so it can sit anywhere inside the card.

type Column = "todo" | "done";

const COLUMNS: { id: Column; title: string }[] = [
    { id: "todo", title: "To do" },
    { id: "done", title: "Done" },
];

@Component({
    selector: "example-drag-handle",
    imports: [DndDroppable, Card],
    host: { class: "contents" },
    template: `
        <div [class]="styles.frame">
            @for (column of COLUMNS; track column.id) {
                <section
                    [dndDroppable]="column.id"
                    (drop)="move($event.operation.source.id, column.id)"
                    [attr.aria-label]="column.title"
                    [class]="styles.column"
                >
                    <h3 [class]="styles.columnTitle">{{ column.title }}</h3>
                    @for (id of board()[column.id]; track id) {
                        <example-drag-handle-card [id]="id" />
                    }
                </section>
            }
        </div>
    `,
})
export default class DragHandleExample {
    protected readonly styles = styles;
    protected readonly COLUMNS = COLUMNS;
    protected readonly board = signal<Board<Column>>({
        todo: ["login", "export", "guide"],
        done: [],
    });

    protected move(id: string | number, to: Column): void {
        this.board.update((now) => moveTask(now, String(id), to));
    }
}
