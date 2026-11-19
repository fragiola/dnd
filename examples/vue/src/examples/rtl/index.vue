<script setup lang="ts">
import { Draggable } from "@fragiola/dnd-vue/draggable";
import { Droppable } from "@fragiola/dnd-vue/droppable";
import { ref } from "vue";
import { type Board, moveTask } from "../_kit/tasks";
import * as styles from "./styles";

// Right to left, in Arabic: the packages have nothing to configure. The page lays the columns out
// from the right, the pointer drags where it goes, and with the keyboard's "targets" mode the
// arrows follow reading order (ArrowLeft goes to the next column, toward the inline end), while
// in "step" mode an arrow still moves the card the way it points.

type Column = "todo" | "doing" | "done";

const COLUMNS: { id: Column; title: string }[] = [
    { id: "todo", title: "للتنفيذ" },
    { id: "doing", title: "قيد العمل" },
    { id: "done", title: "منجز" },
];

const TASKS: Record<string, string> = {
    menu: "تصميم القائمة",
    search: "إصلاح البحث",
    docs: "كتابة الدليل",
    tests: "اختبارات الدفع",
};

const keyboard = { mode: "targets" } as const;

const board = ref<Board<Column>>({
    todo: ["menu", "search"],
    doing: ["docs"],
    done: ["tests"],
});
</script>

<template>
    <div dir="rtl" lang="ar" :class="styles.frame">
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
                <Draggable
                    v-for="id in board[column.id]"
                    :id="id"
                    :key="id"
                    :keyboard="keyboard"
                >
                    <article :aria-label="TASKS[id]" :class="styles.card">
                        {{ TASKS[id] }}
                    </article>
                </Draggable>
            </section>
        </Droppable>
    </div>
</template>
