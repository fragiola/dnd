import { Component, type Signal, signal } from "@angular/core";
import { injectDragMonitor, type KeyboardOptions } from "@fragiola/dnd-angular";
import { DndDraggable } from "@fragiola/dnd-angular/draggable";
import { DndDroppable } from "@fragiola/dnd-angular/droppable";
import { SWITCH } from "#/components/ui/switch";
import { createAnnouncer, describeDrag } from "../_kit/announce";
import { type Board, moveTask, taskOf } from "../_kit/tasks";
import * as styles from "./styles";

// Every card is a tab stop. Space or Enter grabs it; the arrows move it, to the next column in
// reading order ("targets" mode) or 25 px at a time ("step" mode); Space or Enter drops it, and
// Escape puts it back. The words a screen reader hears are the app's: `injectDragMonitor` reports
// every drag of the page, and the kit turns each event into a sentence for the live region.

type Column = "backlog" | "doing" | "done";

const COLUMNS: { id: Column; title: string }[] = [
    { id: "backlog", title: "Backlog" },
    { id: "doing", title: "Doing" },
    { id: "done", title: "Done" },
];

const KEYS = [
    ["Space / Enter", "grab, then drop"],
    ["Arrows", "move"],
    ["Escape", "put back"],
] as const;

const nameOf = (id: string | number) =>
    COLUMNS.find((column) => column.id === id)?.title ?? taskOf(id).title;

/** Keyboard options whose mode is the switch's at the moment an arrow key reads it. */
function followMode(targets: Signal<boolean>): KeyboardOptions {
    return {
        get mode() {
            return targets() ? "targets" : "step";
        },
    };
}

@Component({
    selector: "example-keyboard",
    imports: [DndDraggable, DndDroppable, SWITCH],
    host: { class: "contents" },
    template: `
        <div [class]="styles.frame">
            <div [class]="styles.panel">
                <ul aria-label="Keys" [class]="styles.keys">
                    @for (row of KEYS; track row[0]) {
                        <li [class]="styles.keyRow">
                            <kbd [class]="styles.key">{{ row[0] }}</kbd>
                            {{ row[1] }}
                        </li>
                    }
                </ul>
                <div [class]="styles.mode">
                    <button kitSwitch [(checked)]="targets" aria-label="Jump between columns">
                        <span kitSwitchThumb></span>
                    </button>
                    {{ targets() ? "Arrows jump between columns" : "Arrows move 25 px" }}
                </div>
                <!-- the live region: the app's words, from the drag events -->
                <p role="status" aria-live="polite" [class]="styles.status">{{ message() }}</p>
            </div>
            <p id="keyboard-help" [class]="styles.help">
                Press Space or Enter to grab a card, the arrow keys to move it, Space or Enter to drop
                it and Escape to cancel.
            </p>
            <div [class]="styles.columns">
                @for (column of COLUMNS; track column.id) {
                    <section
                        [dndDroppable]="column.id"
                        (drop)="move($event.operation.source.id, column.id)"
                        [attr.aria-label]="column.title"
                        [class]="styles.column"
                    >
                        <h3 [class]="styles.columnTitle">{{ column.title }}</h3>
                        @for (id of board()[column.id]; track id) {
                            <article
                                [dndDraggable]="id"
                                [keyboard]="keyboard"
                                describedBy="keyboard-help"
                                [attr.aria-label]="taskOf(id).title"
                                [class]="styles.card"
                            >
                                {{ taskOf(id).title }}
                            </article>
                        }
                    </section>
                }
            </div>
        </div>
    `,
})
export default class Keyboard {
    protected readonly styles = styles;
    protected readonly COLUMNS = COLUMNS;
    protected readonly KEYS = KEYS;
    protected readonly taskOf = taskOf;
    protected readonly board = signal<Board<Column>>({
        backlog: ["login", "export"],
        doing: ["guide"],
        done: [],
    });
    protected readonly targets = signal(true);
    // the mode is read from the switch on each arrow key, not bound as a new object: a zoneless
    // app renders the switch's change on its next frame, and a key pressed right after the click
    // would still meet the mode before it
    protected readonly keyboard = followMode(this.targets);
    private readonly announcer = createAnnouncer(
        "Tab to a card, then press Space to grab it.",
    );
    protected readonly message = this.announcer[0];

    constructor() {
        const announce = this.announcer[1];
        injectDragMonitor((event) => announce(describeDrag(event, nameOf)));
    }

    protected move(id: string | number, to: Column): void {
        this.board.update((now) => moveTask(now, String(id), to));
    }
}
