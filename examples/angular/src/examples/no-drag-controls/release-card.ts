import { Component, model } from "@angular/core";
import { DndDraggable } from "@fragiola/dnd-angular/draggable";
import { ClickableButton } from "#/components/atoms/clickable";
import { Input } from "#/components/atoms/fields";
import { SWITCH } from "#/components/ui/switch";
import * as styles from "./styles";

// The card, wherever it is: its state is the page's, so it survives the move.

@Component({
    selector: "example-no-drag-controls-release-card",
    imports: [ClickableButton, DndDraggable, Input, SWITCH],
    host: { class: "contents" },
    template: `
        <article dndDraggable="release" aria-label="Release card" [class]="styles.card">
            <input
                kitInput
                aria-label="Title"
                [value]="title()"
                (input)="typed($event)"
                [class]="styles.input"
            />
            <div [class]="styles.row">
                <button kitClickable variant="outline" size="sm" (click)="votes.set(votes() + 1)">
                    {{ "Upvote (" + votes() + ")" }}
                </button>
                <div [class]="styles.switchLabel">
                    <button kitSwitch [(checked)]="urgent" aria-label="Urgent">
                        <span kitSwitchThumb></span>
                    </button>
                    Urgent
                </div>
            </div>
            <p data-dnd-no-drag="" [class]="styles.notes">
                These notes opt out with data-dnd-no-drag: select this text with the
                mouse. Drag the card by its empty space.
            </p>
        </article>
    `,
})
export class ReleaseCard {
    readonly title = model.required<string>();
    readonly votes = model.required<number>();
    readonly urgent = model.required<boolean>();
    protected readonly styles = styles;

    protected typed(event: Event) {
        this.title.set((event.target as HTMLInputElement).value);
    }
}
