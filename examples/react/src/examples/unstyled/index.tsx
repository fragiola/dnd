"use client";

import { Draggable } from "@fragiola/dnd-react/draggable";
import { Droppable } from "@fragiola/dnd-react/droppable";
import { useState } from "react";
import * as styles from "./styles";

// What the packages give with no styling at all: plain elements, the browser's defaults, and the
// state on each element as `data-dnd-*` attributes. The basket uses `render` instead of a child:
// the function receives the props to spread and the droppable's state.

const FRUITS = ["Apple", "Pear", "Plum"];

export default function Unstyled() {
    const [basket, setBasket] = useState<string[]>([]);
    return (
        <div className={styles.frame}>
            <ul aria-label="Fruits" className={styles.list}>
                {FRUITS.filter((fruit) => !basket.includes(fruit)).map(
                    (fruit) => (
                        <Draggable key={fruit} id={fruit}>
                            <li aria-label={fruit}>{fruit}</li>
                        </Draggable>
                    ),
                )}
            </ul>
            <Droppable
                id="basket"
                onDrop={(event) =>
                    setBasket((fruits) => [
                        ...fruits,
                        String(event.operation.source.id),
                    ])
                }
                render={(props, state) => (
                    <section
                        {...props}
                        aria-label="Basket"
                        className={styles.basket}
                    >
                        <p>
                            {state.over
                                ? "Release to drop it in the basket."
                                : `Basket: ${basket.length ? basket.join(", ") : "empty"}`}
                        </p>
                    </section>
                )}
            />
        </div>
    );
}
