import { Component, signal } from "@angular/core";
import {
    arrayMove,
    DndSortable,
    grid,
    type SortEndEvent,
} from "@fragiola/dnd-angular/sortable";
import * as styles from "./styles";

// A grid of swatches the user orders: the `grid` strategy places the dragged tile in reading order
// (rows from the inline start) and moves every tile between its old and new place to the next
// corner. Tiles of one size suit it best. A tile of another row takes the place only once the
// dragged tile is a quarter of its height inside it, so the preview never flickers at a row's edge.

interface Swatch {
    readonly id: string;
    readonly name: string;
    readonly tone: styles.Tone;
}

@Component({
    selector: "example-sortable-grid",
    imports: [DndSortable],
    host: { class: "contents" },
    template: `
        <div [class]="styles.frame">
            <ul aria-label="Swatches" [class]="styles.grid">
                @for (swatch of swatches(); track swatch.id) {
                    <li
                        [dndSortable]="swatch.id"
                        [index]="$index"
                        group="swatches"
                        [strategy]="grid"
                        (sortEnd)="sortEnd($event)"
                        [attr.aria-label]="swatch.name"
                        [class]="styles.tile"
                    >
                        <span [class]="styles.chip(swatch.tone)"></span>
                        {{ swatch.name }}
                    </li>
                }
            </ul>
        </div>
    `,
})
export default class SortableGrid {
    protected readonly styles = styles;
    protected readonly grid = grid;
    protected readonly swatches = signal<readonly Swatch[]>([
        { id: "ocean", name: "Ocean", tone: "blue" },
        { id: "ember", name: "Ember", tone: "orange" },
        { id: "moss", name: "Moss", tone: "green" },
        { id: "plum", name: "Plum", tone: "purple" },
        { id: "brick", name: "Brick", tone: "danger" },
        { id: "sky", name: "Sky", tone: "blue" },
        { id: "sand", name: "Sand", tone: "orange" },
        { id: "fern", name: "Fern", tone: "green" },
        { id: "iris", name: "Iris", tone: "purple" },
        { id: "rust", name: "Rust", tone: "danger" },
    ]);

    protected sortEnd({ from, to, canceled }: SortEndEvent): void {
        if (!canceled)
            this.swatches.update((now) => arrayMove(now, from.index, to.index));
    }
}
