import { Component } from "@angular/core";
import * as styles from "./styles";

// Where the card starts: a component of its own, unaware of the box.

@Component({
    selector: "example-hello-dnd-tray",
    host: { class: "contents" },
    template: `
        <section aria-label="Tray" [class]="styles.tray">
            <ng-content />
        </section>
    `,
})
export class Tray {
    protected readonly styles = styles;
}
