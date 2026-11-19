<script setup lang="ts">
import type { Board } from "../_kit/tasks";
import ScopedBoard, { type Column } from "./scoped-board.vue";
import * as styles from "./styles";

// Two boards on one page, each its own `scope`: a draggable only meets the droppables of its
// scope, so a card of one board passes over the other board's columns as if they were not there.
// Still no provider: a scope is a string on each component.

const BOARDS: { scope: string; title: string; start: Board<Column> }[] = [
    {
        scope: "design",
        title: "Design",
        start: { open: ["avatar", "guide"], closed: [] },
    },
    {
        scope: "engineering",
        title: "Engineering",
        start: { open: ["login", "export"], closed: ["typo"] },
    },
];
</script>

<template>
    <div :class="styles.frame">
        <ScopedBoard v-for="board in BOARDS" :key="board.scope" v-bind="board" />
    </div>
</template>
