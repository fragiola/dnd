"use client";

import { Draggable } from "@fragiola/dnd-react/draggable";
import { Droppable } from "@fragiola/dnd-react/droppable";
import { useState } from "react";
import * as styles from "./styles";

// On a touch screen a drag starts only once a finger has held still for a moment (`delay`, within
// `tolerance` px): a finger that moves first scrolls the list, as the page always does. Mouse and
// pen start after a few pixels (`distance`). One Pointer Events path serves all three.

const activation = { delay: 250, tolerance: 8 };

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

export default function Touch() {
    const [basket, setBasket] = useState<string[]>([]);
    return (
        <div className={styles.frame}>
            <Droppable
                id="basket"
                onDrop={(event) => {
                    const item = String(event.operation.source.id);
                    setBasket((now) => [...now, item]);
                }}
            >
                <section aria-label="Basket" className={styles.basket}>
                    <span className={styles.basketTitle}>
                        {basket.length === 0
                            ? "Hold an item, then drag it here"
                            : `Basket: ${basket.join(", ")}`}
                    </span>
                </section>
            </Droppable>
            <ul aria-label="Shopping list" className={styles.list}>
                {ITEMS.filter((item) => !basket.includes(item)).map((item) => (
                    <Draggable key={item} id={item} activation={activation}>
                        <li aria-label={item} className={styles.item}>
                            {item}
                        </li>
                    </Draggable>
                ))}
            </ul>
        </div>
    );
}
