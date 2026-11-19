import { Component, signal } from "@angular/core";
import type { DroppableEvent } from "@fragiola/dnd-angular";
import { DndDraggable } from "@fragiola/dnd-angular/draggable";
import { DndDroppable } from "@fragiola/dnd-angular/droppable";
import { type Board, moveTask } from "../_kit/tasks";
import * as styles from "./styles";

// Right to left, in Arabic: the packages have nothing to configure. The page lays the columns out
// from the right, the pointer drags where it goes, and with the keyboard's "targets" mode the
// arrows follow reading order (ArrowLeft goes to the next column, toward the inline end), while
// in "step" mode an arrow still moves the card the way it points.

type Column = "todo" | "doing" | "done";

const COLUMNS: { id: Column; title: string }[] = [
    { id: "todo", title: "للتنفيذ" },
    { id: "doing", title: "قيد العمل" },
    { id: "done", title: "منجز" },
];

const TASKS: Record<string, string> = {
    menu: "تصميم القائمة",
    search: "إصلاح البحث",
    docs: "كتابة الدليل",
    tests: "اختبارات الدفع",
};

@Component({
    selector: "example-rtl",
    imports: [DndDraggable, DndDroppable],
    host: { class: "contents" },
    template: `
        <div dir="rtl" lang="ar" [class]="styles.frame">
            @for (column of columns; track column.id) {
                <section
                    [dndDroppable]="column.id"
                    (drop)="drop($event, column.id)"
                    [attr.aria-label]="column.title"
                    [class]="styles.column"
                >
                    <h3 [class]="styles.columnTitle">{{ column.title }}</h3>
                    @for (id of board()[column.id]; track id) {
                        <article
                            [dndDraggable]="id"
                            [keyboard]="keyboard"
                            [attr.aria-label]="tasks[id]"
                            [class]="styles.card"
                        >
                            {{ tasks[id] }}
                        </article>
                    }
                </section>
            }
        </div>
    `,
})
export default class Rtl {
    protected readonly styles = styles;
    protected readonly columns = COLUMNS;
    protected readonly tasks = TASKS;
    protected readonly keyboard = { mode: "targets" } as const;
    protected readonly board = signal<Board<Column>>({
        todo: ["menu", "search"],
        doing: ["docs"],
        done: ["tests"],
    });

    protected drop(event: DroppableEvent<"drop">, column: Column) {
        this.board.update((board) =>
            moveTask(board, String(event.operation.source.id), column),
        );
    }
}
