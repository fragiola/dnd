<script setup lang="ts">
import { moveBetween, Sortable, SortableGroup } from "@fragiola/dnd-vue/sortable";
import { ref } from "vue";
import { type Board, taskOf } from "../_kit/tasks";
import * as styles from "./styles";

// A kanban: each column is a sortable group, and a card moves into another column when that
// column `accepts` the card's. The rule here is the app's: a card reaches Done only from Doing,
// so over Done a card from the Backlog changes nothing (the column is never entered). Every
// column's list is a `SortableGroup`, which an empty column needs (Done starts empty) and which
// lets a card drop below the last one. The app applies each drop with `moveBetween`.

type Column = "backlog" | "doing" | "done";

const COLUMNS: { id: Column; title: string; accepts: Column[] }[] = [
    { id: "backlog", title: "Backlog", accepts: ["doing", "done"] },
    { id: "doing", title: "Doing", accepts: ["backlog", "done"] },
    { id: "done", title: "Done", accepts: ["doing"] },
];

const board = ref<Board<Column>>({
    backlog: ["login", "export", "search", "typo"],
    doing: ["guide", "avatar"],
    done: [],
});
</script>

<template>
    <div :class="styles.frame">
        <section
            v-for="column in COLUMNS"
            :key="column.id"
            :aria-labelledby="`kanban-${column.id}`"
            :class="styles.column"
        >
            <h3 :id="`kanban-${column.id}`" :class="styles.title">
                {{ column.title }}
                <span :class="styles.count">{{ board[column.id].length }}</span>
            </h3>
            <SortableGroup :group="column.id" :accepts="column.accepts">
                <ul :aria-label="column.title" :class="styles.list">
                    <Sortable
                        v-for="(id, index) in board[column.id]"
                        :id="id"
                        :key="id"
                        :index="index"
                        :group="column.id"
                        :accepts="column.accepts"
                        @sort-end="(event) => (board = moveBetween(board, event))"
                    >
                        <li :aria-label="taskOf(id).title" :class="styles.card">
                            {{ taskOf(id).title }}
                            <span :class="styles.tag(taskOf(id).tag)">
                                {{ taskOf(id).tag }}
                            </span>
                        </li>
                    </Sortable>
                </ul>
            </SortableGroup>
        </section>
    </div>
</template>
