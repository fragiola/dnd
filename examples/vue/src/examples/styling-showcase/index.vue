<script setup lang="ts">
import { Draggable } from "@fragiola/dnd-vue/draggable";
import type { DropEvent } from "@fragiola/dnd-vue";
import { Droppable } from "@fragiola/dnd-vue/droppable";
import { Lock } from "@lucide/vue";
import { ref } from "vue";
import { type Board, moveTask, taskOf } from "../_kit/tasks";
import * as styles from "./styles";

// Every look of a drag, from outside: the packages set `translate` while a card follows the
// pointer and the `data-dnd-*` attributes, and `styles.ts` does the rest. The lift (a tilt, a
// scale, a deeper shadow) uses the CSS `scale` and `rotate` properties, which compose with the
// `translate` the core writes. A cancelled drag glides home: the card's transition includes
// `translate` except while it is dragged (see `styles.card`). Each part's state comes from its
// default slot (`v-slot="{ state }"`).

type Column = "ready" | "review" | "locked";

const COLUMNS: { id: Column; title: string; locked?: true }[] = [
    { id: "ready", title: "Ready" },
    { id: "review", title: "In review" },
    { id: "locked", title: "Frozen", locked: true },
];

const board = ref<Board<Column>>({
    ready: ["login", "avatar", "typo"],
    review: ["export"],
    locked: ["guide"],
});

const refuseAll = () => false;

function drop(event: DropEvent, column: Column) {
    board.value = moveTask(board.value, String(event.operation.source.id), column);
}
</script>

<template>
    <div :class="styles.frame">
        <Droppable
            v-for="column in COLUMNS"
            :id="column.id"
            :key="column.id"
            v-slot="{ state: zone }"
            :accepts="column.locked ? refuseAll : undefined"
            @drop="(event) => drop(event, column.id)"
        >
            <section :aria-label="column.title" :class="styles.column(zone)">
                <h3 :class="styles.columnTitle">
                    <Lock v-if="column.locked" aria-hidden="true" :class="styles.lock" />
                    {{ column.title }}
                    <span :class="styles.count">{{ board[column.id].length }}</span>
                </h3>
                <Draggable
                    v-for="id in board[column.id]"
                    :id="id"
                    :key="id"
                    v-slot="{ state }"
                    :disabled="column.locked"
                >
                    <article :aria-label="taskOf(id).title" :class="styles.card(state)">
                        <span :class="styles.tag(taskOf(id).tag)">{{ taskOf(id).tag }}</span>
                        <p :class="styles.title">{{ taskOf(id).title }}</p>
                    </article>
                </Draggable>
            </section>
        </Droppable>
    </div>
</template>
