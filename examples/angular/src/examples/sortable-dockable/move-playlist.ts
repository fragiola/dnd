import { Component, computed, input } from "@angular/core";
import { injectModelState, type Model } from "@fragiola/dockable-angular";
import type { NoteTypes } from "../_kit/dockable";
import * as styles from "./styles";

// Moves the Playlist tab between the first two tabsets, through Dockable's command.

@Component({
    selector: "example-sortable-dockable-move-playlist",
    host: { class: "contents" },
    template: `
        <button
            type="button"
            [class]="styles.move"
            (click)="model().run('tab.move', { tabId: 'playlist', to: to() })"
        >
            {{ to() === "middle" ? "Move Playlist to the middle" : "Move Playlist back" }}
        </button>
    `,
})
export class MovePlaylist {
    readonly model = input.required<Model<NoteTypes>>();
    protected readonly styles = styles;
    private readonly where = injectModelState<NoteTypes, string | undefined>(
        (_state, current) =>
            current.get("node-parent-by", { nodeId: "playlist" })?.id,
        { model: this.model },
    );
    protected readonly to = computed(() =>
        this.where() === "start" ? "middle" : "start",
    );
}
