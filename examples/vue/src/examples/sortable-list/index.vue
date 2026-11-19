<script setup lang="ts">
import { arrayMove, Sortable, type SortEndEvent } from "@fragiola/dnd-vue/sortable";
import { ref } from "vue";
import { taskOf } from "../_kit/tasks";
import * as styles from "./styles";

// A sortable list with no wrapper around it: each `li` is a `Sortable` of the group "tasks", at
// its index in the app's array. While a card is dragged the core shifts its neighbours with
// `translate` (the app's CSS animates them, see styles.ts); nothing renders. On the drop the app
// applies `onSortEnd` to its own array with `arrayMove`, and the DOM follows the new order.

const tasks = ref(["login", "export", "guide", "avatar", "typo"]);

function sortEnd({ from, to, canceled }: SortEndEvent) {
    if (!canceled) tasks.value = arrayMove(tasks.value, from.index, to.index);
}
</script>

<template>
    <div :class="styles.frame">
        <ul aria-label="Tasks" :class="styles.list">
            <Sortable
                v-for="(id, index) in tasks"
                :id="id"
                :key="id"
                :index="index"
                group="tasks"
                @sort-end="sortEnd"
            >
                <li :aria-label="taskOf(id).title" :class="styles.item">
                    <span :class="styles.rank">{{ index + 1 }}</span>
                    {{ taskOf(id).title }}
                </li>
            </Sortable>
        </ul>
    </div>
</template>
