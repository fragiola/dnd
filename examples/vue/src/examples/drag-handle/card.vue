<script setup lang="ts">
import { Draggable, DragHandle } from "@fragiola/dnd-vue/draggable";
import { GripVertical } from "@lucide/vue";
import { computed } from "vue";
import { taskOf } from "../_kit/tasks";
import * as styles from "./styles";

// A card dragged by its grip only.

const props = defineProps<{ id: string }>();
const task = computed(() => taskOf(props.id));
</script>

<template>
    <Draggable :id="id">
        <article :aria-label="task.title" :class="styles.card">
            <DragHandle>
                <!-- the handle is the tab stop (a button may be a handle): its name is the app's -->
                <button
                    type="button"
                    :aria-label="`Move ${task.title}`"
                    :class="styles.handle"
                >
                    <GripVertical aria-hidden="true" />
                </button>
            </DragHandle>
            <p :class="styles.cardText">{{ task.title }}</p>
        </article>
    </Draggable>
</template>
