import {
    afterNextRender,
    Component,
    ElementRef,
    Injector,
    inject,
    signal,
} from "@angular/core";
import {
    DndSortable,
    DndSortableGroup,
    moveBetween,
    type SortEndEvent,
    type SortEvent,
} from "@fragiola/dnd-angular/sortable";
import {
    createAnnouncer,
    describeSort,
    type SortNames,
} from "../_kit/announce";
import { type Board, taskOf } from "../_kit/tasks";
import * as styles from "./styles";

// Sorting without a pointer. Every item is a tab stop: Space or Enter picks it up, the arrows move
// it one place at a time (past the end of Today, on into Later, which accepts it), Space or Enter
// drops it and Escape puts it back. The words are the app's: the item's sort events go through
// the kit's `describeSort` into a live region, with positions a screen reader can say. An item
// moved into the other list is a new element there (Angular creates it under its new parent), so
// the app gives it the focus back after the render; within a list the core refocuses the item
// itself.

type List = "today" | "later";

const LISTS: { id: List; title: string }[] = [
    { id: "today", title: "Today" },
    { id: "later", title: "Later" },
];

const KEYS = [
    ["Space / Enter", "pick up, then drop"],
    ["Arrows", "move one place"],
    ["Escape", "put back"],
];

const ACCEPTS: List[] = ["today", "later"];

@Component({
    selector: "example-sortable-keyboard",
    imports: [DndSortable, DndSortableGroup],
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
                <!-- the live region: the app's words, from the sort events -->
                <p role="status" aria-live="polite" [class]="styles.status">
                    {{ message() }}
                </p>
            </div>
            <p id="sortable-keyboard-help" [class]="styles.help">
                Press Space or Enter to pick up a task, the arrow keys to move it,
                Space or Enter to drop it and Escape to cancel.
            </p>
            <div [class]="styles.lists">
                @for (list of LISTS; track list.id) {
                    <section [class]="styles.column">
                        <h3 [class]="styles.title">{{ list.title }}</h3>
                        <ol
                            [dndSortableGroup]="list.id"
                            [accepts]="ACCEPTS"
                            [attr.aria-label]="list.title"
                            [class]="styles.list"
                        >
                            @for (id of board()[list.id]; track id) {
                                <li
                                    [dndSortable]="id"
                                    [index]="$index"
                                    [group]="list.id"
                                    [accepts]="ACCEPTS"
                                    describedBy="sortable-keyboard-help"
                                    (sortStart)="say($event)"
                                    (sortOver)="say($event)"
                                    (sortEnd)="sortEnd($event)"
                                    [attr.aria-label]="taskOf(id).title"
                                    [class]="styles.item"
                                >
                                    {{ taskOf(id).title }}
                                </li>
                            }
                        </ol>
                    </section>
                }
            </div>
        </div>
    `,
})
export default class SortableKeyboard {
    protected readonly styles = styles;
    protected readonly LISTS = LISTS;
    protected readonly KEYS = KEYS;
    protected readonly ACCEPTS = ACCEPTS;
    protected readonly taskOf = taskOf;
    protected readonly board = signal<Board<List>>({
        today: ["login", "guide", "typo"],
        later: ["export", "search"],
    });
    private readonly announcer = createAnnouncer(
        "Tab to a task, then press Space to pick it up.",
    );
    protected readonly message = this.announcer[0];
    private readonly names: SortNames = {
        item: (id) => taskOf(id).title,
        group: (group) =>
            LISTS.find((list) => list.id === group)?.title ?? group,
        size: (group) => this.board()[group as List]?.length ?? 0,
    };
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
    private readonly injector = inject(Injector);

    protected say(event: SortEvent): void {
        this.announcer[1](describeSort(event, this.names));
    }

    protected sortEnd(event: SortEndEvent): void {
        this.say(event);
        this.board.update((now) => moveBetween(now, event));
        if (event.input !== "keyboard" || event.to.group === event.from.group)
            return;
        // the item is a new element in its new list once rendered: give it the focus back
        const id = String(event.id);
        afterNextRender(
            () => {
                for (const item of this.host.nativeElement.querySelectorAll<HTMLElement>(
                    'li[data-dnd-part~="sortable"]',
                ))
                    if (item.getAttribute("data-dnd-id") === id) item.focus();
            },
            { injector: this.injector },
        );
    }
}
