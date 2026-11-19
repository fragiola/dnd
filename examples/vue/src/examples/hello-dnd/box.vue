<script setup lang="ts">
import { Droppable } from "@fragiola/dnd-vue/droppable";
import * as styles from "./styles";

// The drop target: another component, in another part of the tree.

const emit = defineEmits<{ drop: [] }>();
</script>

<template>
    <Droppable id="box" :accepts="['card']" @drop="emit('drop')">
        <section aria-label="Box" :class="styles.box">
            <slot>
                <span :class="styles.boxHint">Drop here</span>
            </slot>
        </section>
    </Droppable>
</template>
