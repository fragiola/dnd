import { Component } from "@angular/core";
import type { Board } from "../_kit/tasks";
import { type Column, ScopedBoard } from "./scoped-board";
import * as styles from "./styles";

// Two boards on one page, each its own `scope`: a draggable only meets the droppables of its
// scope, so a card of one board passes over the other board's columns as if they were not there.
// Still no provider: a scope is a string on each directive.

const BOARDS: { scope: string; title: string; start: Board<Column> }[] = [
    {
        scope: "design",
        title: "Design",
        start: { open: ["avatar", "guide"], closed: [] },
    },
    {
        scope: "engineering",
        title: "Engineering",
        start: { open: ["login", "export"], closed: ["typo"] },
    },
];

@Component({
    selector: "example-scopes",
    imports: [ScopedBoard],
    host: { class: "contents" },
    template: `
        <div [class]="styles.frame">
            @for (board of boards; track board.scope) {
                <example-scopes-scoped-board
                    [scope]="board.scope"
                    [title]="board.title"
                    [start]="board.start"
                />
            }
        </div>
    `,
})
export default class Scopes {
    protected readonly styles = styles;
    protected readonly boards = BOARDS;
}
