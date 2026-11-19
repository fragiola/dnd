import { Component, input } from "@angular/core";
import type { AutoScroll } from "@fragiola/dnd-angular";
import { DndDraggable } from "@fragiola/dnd-angular/draggable";
import * as styles from "./styles";

// The meeting card, wherever it is: a draggable with the auto-scroll strategy.

@Component({
    selector: "example-auto-scroll-meeting",
    imports: [DndDraggable],
    host: { class: "contents" },
    template: `
        <article dndDraggable="meeting" [autoScroll]="scroll()" aria-label="Meeting" [class]="styles.card">
            Meeting
        </article>
    `,
})
export class Meeting {
    readonly scroll = input.required<AutoScroll>();
    protected readonly styles = styles;
}
