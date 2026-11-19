import { Component, computed, signal } from "@angular/core";
import type { DroppableEvent } from "@fragiola/dnd-angular";
import { DndDraggable } from "@fragiola/dnd-angular/draggable";
import { DndDroppable } from "@fragiola/dnd-angular/droppable";
import * as styles from "./styles";

// On a touch screen a drag starts only once a finger has held still for a moment (`delay`, within
// `tolerance` px): a finger that moves first scrolls the list, as the page always does. Mouse and
// pen start after a few pixels (`distance`). One Pointer Events path serves all three.

const ITEMS = [
    "Bread",
    "Milk",
    "Eggs",
    "Apples",
    "Rice",
    "Coffee",
    "Butter",
    "Cheese",
    "Tomatoes",
    "Onions",
    "Pasta",
    "Yogurt",
    "Lemons",
    "Honey",
];

@Component({
    selector: "example-touch",
    imports: [DndDraggable, DndDroppable],
    host: { class: "contents" },
    template: `
        <div [class]="styles.frame">
            <section dndDroppable="basket" (drop)="drop($event)" aria-label="Basket" [class]="styles.basket">
                <span [class]="styles.basketTitle">
                    {{
                        basket().length === 0
                            ? "Hold an item, then drag it here"
                            : "Basket: " + basket().join(", ")
                    }}
                </span>
            </section>
            <ul aria-label="Shopping list" [class]="styles.list">
                @for (item of left(); track item) {
                    <li
                        [dndDraggable]="item"
                        [activation]="activation"
                        [attr.aria-label]="item"
                        [class]="styles.item"
                    >
                        {{ item }}
                    </li>
                }
            </ul>
        </div>
    `,
})
export default class Touch {
    protected readonly styles = styles;
    protected readonly activation = { delay: 250, tolerance: 8 };
    protected readonly basket = signal<string[]>([]);
    protected readonly left = computed(() =>
        ITEMS.filter((item) => !this.basket().includes(item)),
    );

    protected drop(event: DroppableEvent<"drop">) {
        this.basket.update((basket) => [
            ...basket,
            String(event.operation.source.id),
        ]);
    }
}
