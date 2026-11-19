<script setup lang="ts">
import { Draggable } from "@fragiola/dnd-vue/draggable";
import { Droppable } from "@fragiola/dnd-vue/droppable";
import { computed, ref } from "vue";
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

const basket = ref<string[]>([]);
const left = computed(() => ITEMS.filter((item) => !basket.value.includes(item)));
</script>

<template>
    <div :class="styles.frame">
        <Droppable
            id="basket"
            @drop="basket = [...basket, String($event.operation.source.id)]"
        >
            <section aria-label="Basket" :class="styles.basket">
                <span :class="styles.basketTitle">
                    {{
                        basket.length === 0
                            ? "Hold an item, then drag it here"
                            : `Basket: ${basket.join(", ")}`
                    }}
                </span>
            </section>
        </Droppable>
        <ul aria-label="Shopping list" :class="styles.list">
            <Draggable v-for="item in left" :id="item" :key="item" :activation="activation">
                <li :aria-label="item" :class="styles.item">{{ item }}</li>
            </Draggable>
        </ul>
    </div>
</template>
