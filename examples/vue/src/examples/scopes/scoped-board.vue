<script lang="ts">
export type Column = "open" | "closed";
</script>

<script setup lang="ts">
import { Draggable } from "@fragiola/dnd-vue/draggable";
import { Droppable } from "@fragiola/dnd-vue/droppable";
import { ref } from "vue";
import { type Board, moveTask, taskOf } from "../_kit/tasks";
import * as styles from "./styles";

// One board, its own scope: its columns and its cards carry the same `scope` string.

const props = defineProps<{ scope: string; title: string; start: Board<Column> }>();

const COLUMNS: { id: Column; title: string }[] = [
    { id: "open", title: "Open" },
    { id: "closed", title: "Closed" },
];

const board = ref(props.start);
</script>

<template>
    <section :aria-label="`${title} board`" :class="styles.board">
        <h3 :class="styles.boardTitle">{{ `${title} (scope "${scope}")` }}</h3>
        <div :class="styles.columns">
            <!-- ids are unique within a scope: both boards have an "open" column -->
            <Droppable
                v-for="column in COLUMNS"
                :id="column.id"
                :key="column.id"
                :scope="scope"
                @drop="
                    board = moveTask(board, String($event.operation.source.id), column.id)
                "
            >
                <section :aria-label="`${title} ${column.title}`" :class="styles.column">
                    <span :class="styles.columnTitle">{{ column.title }}</span>
                    <Draggable
                        v-for="id in board[column.id]"
                        :id="id"
                        :key="id"
                        :scope="scope"
                    >
                        <article :aria-label="taskOf(id).title" :class="styles.card">
                            {{ taskOf(id).title }}
                        </article>
                    </Draggable>
                </section>
            </Droppable>
        </div>
    </section>
</template>
