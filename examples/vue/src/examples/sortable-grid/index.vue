<script setup lang="ts">
import {
    arrayMove,
    grid,
    Sortable,
    type SortEndEvent,
} from "@fragiola/dnd-vue/sortable";
import { ref } from "vue";
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

const swatches = ref<Swatch[]>([
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

function sortEnd({ from, to, canceled }: SortEndEvent) {
    if (!canceled)
        swatches.value = arrayMove(swatches.value, from.index, to.index);
}
</script>

<template>
    <div :class="styles.frame">
        <ul aria-label="Swatches" :class="styles.grid">
            <Sortable
                v-for="(swatch, index) in swatches"
                :id="swatch.id"
                :key="swatch.id"
                :index="index"
                group="swatches"
                :strategy="grid"
                @sort-end="sortEnd"
            >
                <li :aria-label="swatch.name" :class="styles.tile">
                    <span :class="styles.chip(swatch.tone)" />
                    {{ swatch.name }}
                </li>
            </Sortable>
        </ul>
    </div>
</template>
