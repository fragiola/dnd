<script setup lang="ts">
import type { AutoScroll } from "@fragiola/dnd-vue";
import { Draggable } from "@fragiola/dnd-vue/draggable";
import * as styles from "./styles";

// The meeting card, wherever it is: a draggable with the auto-scroll strategy.

defineProps<{ scroll: AutoScroll }>();
</script>

<template>
    <Draggable id="meeting" :auto-scroll="scroll">
        <article aria-label="Meeting" :class="styles.card">Meeting</article>
    </Draggable>
</template>
