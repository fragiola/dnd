import { Component, signal } from "@angular/core";
import type { DropEvent } from "@fragiola/dnd-angular";
import { DndDraggable } from "@fragiola/dnd-angular/draggable";
import { DndDroppable } from "@fragiola/dnd-angular/droppable";
import { LucideLock } from "@lucide/angular";
import { type Board, moveTask, taskOf } from "../_kit/tasks";
import * as styles from "./styles";

// Every look of a drag, from outside: the packages set `translate` while a card follows the
// pointer and the `data-dnd-*` attributes, and `styles.ts` does the rest. The lift (a tilt, a
// scale, a deeper shadow) uses the CSS `scale` and `rotate` properties, which compose with the
// `translate` the core writes. A cancelled drag glides home: the card's transition includes
// `translate` except while it is dragged (see `styles.card`). The column's state comes from its
// directive's `exportAs` (`#zone="dndDroppable"`, then `zone.state()`), and the card's too
// (`#card="dndDraggable"`).

type Column = "ready" | "review" | "locked";

const COLUMNS: { id: Column; title: string; locked?: true }[] = [
    { id: "ready", title: "Ready" },
    { id: "review", title: "In review" },
    { id: "locked", title: "Frozen", locked: true },
];

const refuseAll = () => false;

@Component({
    selector: "example-styling-showcase",
    imports: [DndDraggable, DndDroppable, LucideLock],
    host: { class: "contents" },
    template: `
        <div [class]="styles.frame">
            @for (column of COLUMNS; track column.id) {
                <section
                    [dndDroppable]="column.id"
                    #zone="dndDroppable"
                    [accepts]="column.locked ? refuseAll : undefined"
                    (drop)="drop($event, column.id)"
                    [attr.aria-label]="column.title"
                    [class]="styles.column(zone.state())"
                >
                    <h3 [class]="styles.columnTitle">
                        @if (column.locked) {
                            <svg lucideLock aria-hidden="true" [class]="styles.lock"></svg>
                        }
                        {{ column.title }}
                        <span [class]="styles.count">{{ board()[column.id].length }}</span>
                    </h3>
                    @for (id of board()[column.id]; track id) {
                        <article
                            [dndDraggable]="id"
                            [disabled]="column.locked"
                            [attr.aria-label]="taskOf(id).title"
                            #card="dndDraggable"
                            [class]="styles.card(card.state())"
                        >
                            <span [class]="styles.tag(taskOf(id).tag)">{{ taskOf(id).tag }}</span>
                            <p [class]="styles.title">{{ taskOf(id).title }}</p>
                        </article>
                    }
                </section>
            }
        </div>
    `,
})
export default class StylingShowcase {
    protected readonly styles = styles;
    protected readonly COLUMNS = COLUMNS;
    protected readonly refuseAll = refuseAll;
    protected readonly taskOf = taskOf;
    protected readonly board = signal<Board<Column>>({
        ready: ["login", "avatar", "typo"],
        review: ["export"],
        locked: ["guide"],
    });

    protected drop(event: DropEvent, column: Column): void {
        this.board.update((board) =>
            moveTask(board, String(event.operation.source.id), column),
        );
    }
}
