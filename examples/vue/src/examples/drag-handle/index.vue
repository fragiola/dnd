<script setup lang="ts">
import { Droppable } from "@fragiola/dnd-vue/droppable";
import { ref } from "vue";
import { type Board, moveTask } from "../_kit/tasks";
import Card from "./card.vue";
import * as styles from "./styles";

// A `DragHandle` inside a draggable makes the handle the only place a drag starts, and the tab
// stop: the card's text stays selectable. The handle finds its draggable through the DOM, not a
// provide/inject, so it can sit anywhere inside the card.

type Column = "todo" | "done";

const COLUMNS: { id: Column; title: string }[] = [
    { id: "todo", title: "To do" },
    { id: "done", title: "Done" },
];

const board = ref<Board<Column>>({
    todo: ["login", "export", "guide"],
    done: [],
});
</script>

<template>
    <div :class="styles.frame">
        <Droppable
            v-for="column in COLUMNS"
            :id="column.id"
            :key="column.id"
            @drop="
                board = moveTask(board, String($event.operation.source.id), column.id)
            "
        >
            <section :aria-label="column.title" :class="styles.column">
                <h3 :class="styles.columnTitle">{{ column.title }}</h3>
                <Card v-for="id in board[column.id]" :id="id" :key="id" />
            </section>
        </Droppable>
    </div>
</template>
