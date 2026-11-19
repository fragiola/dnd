<script setup lang="ts">
import { autoScroll } from "@fragiola/dnd-vue";
import { Droppable } from "@fragiola/dnd-vue/droppable";
import { ref } from "vue";
import Meeting from "./meeting.vue";
import * as styles from "./styles";

// Auto-scroll is opt-in: a strategy from the shared entry, given to each draggable that needs it,
// so an app that never imports `autoScroll` never ships it. Held near the top or bottom edge of
// the list, the card scrolls the list, faster the closer it gets to the edge.

const scroll = autoScroll({ threshold: 56, speed: 14 });

const DAYS = Array.from({ length: 24 }, (_, index) => `Day ${index + 1}`);

const day = ref<string | undefined>(undefined);
</script>

<template>
    <div :class="styles.frame">
        <p :class="styles.hint">
            Drag the meeting toward the bottom edge of the list: it scrolls.
        </p>
        <ul aria-label="Days" :class="styles.list">
            <li :class="styles.unplanned">
                <Meeting v-if="day === undefined" :scroll="scroll" />
                <span v-else>Unplanned</span>
            </li>
            <Droppable v-for="name in DAYS" :id="name" :key="name" @drop="day = name">
                <li :aria-label="name" :class="styles.day">
                    <span :class="styles.dayName">{{ name }}</span>
                    <Meeting v-if="day === name" :scroll="scroll" />
                </li>
            </Droppable>
        </ul>
    </div>
</template>
