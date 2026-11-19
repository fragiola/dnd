import { Component } from "@angular/core";
import { DndDraggable } from "@fragiola/dnd-angular/draggable";
import * as styles from "./styles";

// The card: a plain `article`, made draggable by the directive on it.

@Component({
    selector: "example-hello-dnd-card",
    imports: [DndDraggable],
    host: { class: "contents" },
    template: `
        <article dndDraggable="card" type="card" aria-label="Card" [class]="styles.card">
            <span [class]="styles.cardTitle">Drag me</span>
            <span [class]="styles.cardHint">a plain element, wrapped</span>
        </article>
    `,
})
export class Card {
    protected readonly styles = styles;
}
