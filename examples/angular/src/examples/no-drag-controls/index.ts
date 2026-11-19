import { Component, signal } from "@angular/core";
import { DndDroppable } from "@fragiola/dnd-angular/droppable";
import { ReleaseCard } from "./release-card";
import * as styles from "./styles";

// The whole card drags, but its controls keep working: inputs, textareas, selects, buttons and
// editable content never start a drag, and a `data-dnd-no-drag` subtree opts out too (here, the
// notes, so their text can be selected with the mouse).

@Component({
    selector: "example-no-drag-controls",
    imports: [DndDroppable, ReleaseCard],
    host: { class: "contents" },
    template: `
        <div [class]="styles.frame">
            <section aria-label="Drafts" [class]="styles.zone">
                @if (!shipped()) {
                    <example-no-drag-controls-release-card
                        [(title)]="title"
                        [(votes)]="votes"
                        [(urgent)]="urgent"
                    />
                }
            </section>
            <section dndDroppable="shipped" (drop)="shipped.set(true)" aria-label="Shipped" [class]="styles.target">
                @if (shipped()) {
                    <example-no-drag-controls-release-card
                        [(title)]="title"
                        [(votes)]="votes"
                        [(urgent)]="urgent"
                    />
                } @else {
                    <span [class]="styles.hint">Shipped</span>
                }
            </section>
        </div>
    `,
})
export default class NoDragControls {
    protected readonly styles = styles;
    protected readonly shipped = signal(false);
    protected readonly votes = signal(0);
    protected readonly urgent = signal(false);
    protected readonly title = signal("Release notes");
}
