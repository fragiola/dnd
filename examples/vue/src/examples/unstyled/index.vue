<script setup lang="ts">
import type { DropEvent } from "@fragiola/dnd-vue";
import { Draggable } from "@fragiola/dnd-vue/draggable";
import { Droppable } from "@fragiola/dnd-vue/droppable";
import { computed, ref } from "vue";
import * as styles from "./styles";

// What the packages give with no styling at all: plain elements, the browser's defaults, and the
// state on each element as `data-dnd-*` attributes. The basket uses `as` instead of a child: it
// renders the `section` itself, and its default slot receives the droppable's state.

const FRUITS = ["Apple", "Pear", "Plum"];

const basket = ref<string[]>([]);
const left = computed(() =>
    FRUITS.filter((fruit) => !basket.value.includes(fruit)),
);

function drop(event: DropEvent) {
    basket.value = [...basket.value, String(event.operation.source.id)];
}
</script>

<template>
    <div :class="styles.frame">
        <ul aria-label="Fruits" :class="styles.list">
            <Draggable v-for="fruit in left" :id="fruit" :key="fruit">
                <li :aria-label="fruit">{{ fruit }}</li>
            </Draggable>
        </ul>
        <Droppable
            id="basket"
            as="section"
            aria-label="Basket"
            :class="styles.basket"
            @drop="drop"
        >
            <template #default="{ state }">
                <p>
                    {{
                        state.over
                            ? "Release to drop it in the basket."
                            : `Basket: ${basket.length ? basket.join(", ") : "empty"}`
                    }}
                </p>
            </template>
        </Droppable>
    </div>
</template>
