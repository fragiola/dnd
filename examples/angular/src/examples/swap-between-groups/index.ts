import { Component, signal } from "@angular/core";
import {
    DndSwappable,
    type SwapEvent,
    swapBetween,
} from "@fragiola/dnd-angular/swappable";
import * as styles from "./styles";

// Two groups that swap with each other: a starting lineup and its bench. A player swaps with a
// teammate of the lineup, or with a substitute (both groups list each other in `accepts`). The app
// keeps one list per group and applies each swap with `swapBetween`, which takes the event as it
// is: the source's and the target's group and index.

type Group = "lineup" | "bench";

const GROUPS: { id: Group; title: string }[] = [
    { id: "lineup", title: "Lineup" },
    { id: "bench", title: "Bench" },
];

const ACCEPTS: Group[] = ["lineup", "bench"];

@Component({
    selector: "example-swap-between-groups",
    imports: [DndSwappable],
    host: { class: "contents" },
    template: `
        <div [class]="styles.frame">
            @for (group of GROUPS; track group.id) {
                <section [class]="styles.group">
                    <h3 [class]="styles.title">{{ group.title }}</h3>
                    <ol [attr.aria-label]="group.title" [class]="styles.players">
                        @for (name of team()[group.id]; track name) {
                            <li
                                [dndSwappable]="name"
                                [index]="$index"
                                [group]="group.id"
                                [accepts]="ACCEPTS"
                                (swap)="swap($event)"
                                [attr.aria-label]="name"
                                [class]="styles.player"
                            >
                                <span [class]="styles.number">{{ $index + 1 }}</span>
                                {{ name }}
                            </li>
                        }
                    </ol>
                </section>
            }
        </div>
    `,
})
export default class SwapBetweenGroups {
    protected readonly styles = styles;
    protected readonly GROUPS = GROUPS;
    protected readonly ACCEPTS = ACCEPTS;
    protected readonly team = signal<Record<Group, readonly string[]>>({
        lineup: ["Ana", "Bruno", "Chiara", "Dev", "Emeka"],
        bench: ["Farah", "Goran", "Hana"],
    });

    protected swap(event: SwapEvent): void {
        this.team.update((team) => swapBetween(team, event));
    }
}
