<script setup lang="ts">
import { ref } from "vue";
import Box from "./box.vue";
import Card from "./card.vue";
import * as styles from "./styles";
import Tray from "./tray.vue";

// No provider: the tray and the box below are siblings with nothing around them. A `Draggable`
// and a `Droppable` meet through the drag space of their document, created on first use. Neither
// component renders an element: each adds its behaviour to the one element it wraps.

const place = ref<"tray" | "box">("tray");
</script>

<template>
    <div :class="styles.frame">
        <Tray>
            <Card v-if="place === 'tray'" />
        </Tray>
        <Box @drop="place = 'box'">
            <Card v-if="place === 'box'" />
        </Box>
        <p role="status" :class="styles.status">
            {{
                place === "tray"
                    ? "The card is in the tray: drag it into the box."
                    : "The card is in the box."
            }}
        </p>
    </div>
</template>
