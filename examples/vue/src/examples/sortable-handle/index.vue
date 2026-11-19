<script setup lang="ts">
import {
    arrayMove,
    DragHandle,
    Sortable,
    type SortEndEvent,
} from "@fragiola/dnd-vue/sortable";
import { GripVertical } from "@lucide/vue";
import { ref } from "vue";
import { taskOf } from "../_kit/tasks";
import * as styles from "./styles";

// The same `DragHandle` as a draggable's, from the sortable entry: inside a `Sortable` it is the
// only place a sort starts, and the tab stop, so the row's text stays selectable. It finds its
// item through the DOM, so it can sit anywhere inside the row.

const tasks = ref(["guide", "api", "login", "flaky"]);

function sortEnd({ from, to, canceled }: SortEndEvent) {
    if (!canceled) tasks.value = arrayMove(tasks.value, from.index, to.index);
}
</script>

<template>
    <div :class="styles.frame">
        <ol aria-label="Release checklist" :class="styles.list">
            <Sortable
                v-for="(id, index) in tasks"
                :id="id"
                :key="id"
                :index="index"
                group="checklist"
                @sort-end="sortEnd"
            >
                <li :aria-label="taskOf(id).title" :class="styles.row">
                    <DragHandle>
                        <!-- the handle's name is the app's -->
                        <button
                            type="button"
                            :aria-label="`Move ${taskOf(id).title}`"
                            :class="styles.handle"
                        >
                            <GripVertical aria-hidden="true" />
                        </button>
                    </DragHandle>
                    <p :class="styles.text">{{ taskOf(id).title }}</p>
                </li>
            </Sortable>
        </ol>
    </div>
</template>
