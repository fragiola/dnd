import { Component, signal } from "@angular/core";
import { autoScroll } from "@fragiola/dnd-angular";
import { DndDroppable } from "@fragiola/dnd-angular/droppable";
import { Meeting } from "./meeting";
import * as styles from "./styles";

// Auto-scroll is opt-in: a strategy from the shared entry, given to each draggable that needs it,
// so an app that never imports `autoScroll` never ships it. Held near the top or bottom edge of
// the list, the card scrolls the list, faster the closer it gets to the edge.

const scroll = autoScroll({ threshold: 56, speed: 14 });

const DAYS = Array.from({ length: 24 }, (_, index) => `Day ${index + 1}`);

@Component({
    selector: "example-auto-scroll",
    imports: [DndDroppable, Meeting],
    host: { class: "contents" },
    template: `
        <div [class]="styles.frame">
            <p [class]="styles.hint">Drag the meeting toward the bottom edge of the list: it scrolls.</p>
            <ul aria-label="Days" [class]="styles.list">
                <li [class]="styles.unplanned">
                    @if (day() === undefined) {
                        <example-auto-scroll-meeting [scroll]="scroll" />
                    } @else {
                        <span>Unplanned</span>
                    }
                </li>
                @for (name of DAYS; track name) {
                    <li [dndDroppable]="name" (drop)="day.set(name)" [attr.aria-label]="name" [class]="styles.day">
                        <span [class]="styles.dayName">{{ name }}</span>
                        @if (day() === name) {
                            <example-auto-scroll-meeting [scroll]="scroll" />
                        }
                    </li>
                }
            </ul>
        </div>
    `,
})
export default class AutoScrollExample {
    protected readonly styles = styles;
    protected readonly scroll = scroll;
    protected readonly DAYS = DAYS;
    protected readonly day = signal<string | undefined>(undefined);
}
