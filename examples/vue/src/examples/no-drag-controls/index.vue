<script setup lang="ts">
import { Droppable } from "@fragiola/dnd-vue/droppable";
import { ref } from "vue";
import ReleaseCard from "./release-card.vue";
import * as styles from "./styles";

// The whole card drags, but its controls keep working: inputs, textareas, selects, buttons and
// editable content never start a drag, and a `data-dnd-no-drag` subtree opts out too (here, the
// notes, so their text can be selected with the mouse).

const shipped = ref(false);
const votes = ref(0);
const urgent = ref(false);
const title = ref("Release notes");
</script>

<template>
    <div :class="styles.frame">
        <section aria-label="Drafts" :class="styles.zone">
            <ReleaseCard
                v-if="!shipped"
                v-model:title="title"
                v-model:votes="votes"
                v-model:urgent="urgent"
            />
        </section>
        <Droppable id="shipped" @drop="shipped = true">
            <section aria-label="Shipped" :class="styles.target">
                <ReleaseCard
                    v-if="shipped"
                    v-model:title="title"
                    v-model:votes="votes"
                    v-model:urgent="urgent"
                />
                <span v-else :class="styles.hint">Shipped</span>
            </section>
        </Droppable>
    </div>
</template>
