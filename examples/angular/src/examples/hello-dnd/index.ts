import { Component, signal } from "@angular/core";
import { Box } from "./box";
import { Card } from "./card";
import * as styles from "./styles";
import { Tray } from "./tray";

// No provider: the tray and the box below are siblings with nothing around them. A
// `[dndDraggable]` and a `[dndDroppable]` meet through the drag space of their document, created
// on first use. Neither directive adds an element: each adds its behaviour to the element it is on.

@Component({
    selector: "example-hello-dnd",
    imports: [Box, Card, Tray],
    host: { class: "contents" },
    template: `
        <div [class]="styles.frame">
            <example-hello-dnd-tray>
                @if (place() === "tray") {
                    <example-hello-dnd-card />
                }
            </example-hello-dnd-tray>
            <example-hello-dnd-box (dropped)="place.set('box')">
                @if (place() === "box") {
                    <example-hello-dnd-card />
                } @else {
                    <span [class]="styles.boxHint">Drop here</span>
                }
            </example-hello-dnd-box>
            <p role="status" [class]="styles.status">
                {{
                    place() === "tray"
                        ? "The card is in the tray: drag it into the box."
                        : "The card is in the box."
                }}
            </p>
        </div>
    `,
})
export default class HelloDnd {
    protected readonly styles = styles;
    protected readonly place = signal<"tray" | "box">("tray");
}
