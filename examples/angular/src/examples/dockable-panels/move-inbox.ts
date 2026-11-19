import { Component, computed, input } from "@angular/core";
import { injectModelState, type Model } from "@fragiola/dockable-angular";
import type { NoteTypes } from "../_kit/dockable";
import * as styles from "./styles";

// Moves the Inbox tab between the first two tabsets, through Dockable's command.

@Component({
    selector: "example-dockable-panels-move-inbox",
    host: { class: "contents" },
    template: `
        <button
            type="button"
            [class]="styles.move"
            (click)="model().run('tab.move', { tabId: 'inbox', to: to() })"
        >
            {{ to() === "middle" ? "Move Inbox to the middle" : "Move Inbox back" }}
        </button>
    `,
})
export class MoveInbox {
    readonly model = input.required<Model<NoteTypes>>();
    protected readonly styles = styles;
    private readonly where = injectModelState<NoteTypes, string | undefined>(
        (_state, current) =>
            current.get("node-parent-by", { nodeId: "inbox" })?.id,
        { model: this.model },
    );
    protected readonly to = computed(() =>
        this.where() === "start" ? "middle" : "start",
    );
}
