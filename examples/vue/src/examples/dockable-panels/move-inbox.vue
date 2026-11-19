<script setup lang="ts">
import { type Model, useModelState } from "@fragiola/dockable-vue";
import { computed } from "vue";
import type { NoteTypes } from "../_kit/dockable";
import * as styles from "./styles";

// Moves the Inbox tab between the first two tabsets, through Dockable's command.

const props = defineProps<{ model: Model<NoteTypes> }>();
const where = useModelState<NoteTypes, string | undefined>(
    (_state, current) =>
        current.get("node-parent-by", { nodeId: "inbox" })?.id,
    { model: props.model },
);
const to = computed(() => (where.value === "start" ? "middle" : "start"));
</script>

<template>
    <button
        type="button"
        :class="styles.move"
        @click="model.run('tab.move', { tabId: 'inbox', to })"
    >
        {{ to === "middle" ? "Move Inbox to the middle" : "Move Inbox back" }}
    </button>
</template>
