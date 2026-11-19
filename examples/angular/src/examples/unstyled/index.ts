import { Component, computed, signal } from "@angular/core";
import type { DroppableEvent } from "@fragiola/dnd-angular";
import { DndDraggable } from "@fragiola/dnd-angular/draggable";
import { DndDroppable } from "@fragiola/dnd-angular/droppable";
import * as styles from "./styles";

// What the packages give with no styling at all: plain elements, the browser's defaults, and the
// state on each element as `data-dnd-*` attributes. The basket is the `section` the directive is
// on, and its state is read through the directive's `exportAs` (`#basketZone="dndDroppable"`).

const FRUITS = ["Apple", "Pear", "Plum"];

@Component({
    selector: "example-unstyled",
    imports: [DndDraggable, DndDroppable],
    host: { class: "contents" },
    template: `
        <div [class]="styles.frame">
            <ul aria-label="Fruits" [class]="styles.list">
                @for (fruit of left(); track fruit) {
                    <li [dndDraggable]="fruit" [attr.aria-label]="fruit">{{ fruit }}</li>
                }
            </ul>
            <section
                dndDroppable="basket"
                #basketZone="dndDroppable"
                (drop)="drop($event)"
                aria-label="Basket"
                [class]="styles.basket"
            >
                <p>
                    {{
                        basketZone.state().over
                            ? "Release to drop it in the basket."
                            : "Basket: " + (basket().length ? basket().join(", ") : "empty")
                    }}
                </p>
            </section>
        </div>
    `,
})
export default class Unstyled {
    protected readonly styles = styles;
    protected readonly basket = signal<string[]>([]);
    protected readonly left = computed(() =>
        FRUITS.filter((fruit) => !this.basket().includes(fruit)),
    );

    protected drop(event: DroppableEvent<"drop">) {
        this.basket.update((basket) => [
            ...basket,
            String(event.operation.source.id),
        ]);
    }
}
