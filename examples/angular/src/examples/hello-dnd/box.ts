import { Component, output } from "@angular/core";
import { DndDroppable } from "@fragiola/dnd-angular/droppable";
import * as styles from "./styles";

// The drop target: another component, in another part of the page.

@Component({
    selector: "example-hello-dnd-box",
    imports: [DndDroppable],
    host: { class: "contents" },
    template: `
        <section dndDroppable="box" [accepts]="['card']" (drop)="dropped.emit()" aria-label="Box" [class]="styles.box">
            <ng-content />
        </section>
    `,
})
export class Box {
    readonly dropped = output();
    protected readonly styles = styles;
}
