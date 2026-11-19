<script setup lang="ts">
import { DragOverlay, type DropEvent } from "@fragiola/dnd-vue";
import { Draggable } from "@fragiola/dnd-vue/draggable";
import { Droppable } from "@fragiola/dnd-vue/droppable";
import { ref } from "vue";
import * as styles from "./styles";

// The strip of tags clips its content (`overflow: hidden`, as a tab row does): a tag moved by its
// own `translate` would vanish at the strip's edge. So the tags keep still (`:translate="false"`)
// and a `DragOverlay` shows a copy under the pointer, teleported into the document's body. The
// overlay is the one part that renders an element, a `div` fixed over the dragged box; what is
// inside it, and how it looks, is the app's.

const TAGS = ["Design", "Research", "Frontend", "Backend", "Ops", "Writing", "QA"];

const favourites = ref<string[]>([]);

function drop(event: DropEvent) {
    const tag = String(event.operation.source.id);
    if (!favourites.value.includes(tag))
        favourites.value = [...favourites.value, tag];
}
</script>

<template>
    <div :class="styles.frame">
        <ul aria-label="Tags" :class="styles.strip">
            <Draggable v-for="tag in TAGS" :id="tag" :key="tag" :translate="false">
                <li :aria-label="tag" :class="styles.tag">{{ tag }}</li>
            </Draggable>
        </ul>
        <Droppable id="favourites" @drop="drop">
            <section aria-label="Favourites" :class="styles.zone">
                <span v-if="favourites.length === 0" :class="styles.hint">
                    Drop tags here
                </span>
                <template v-else>
                    <span v-for="tag in favourites" :key="tag" :class="styles.chosen">
                        {{ tag }}
                    </span>
                </template>
            </section>
        </Droppable>
        <!-- Anywhere in the tree: it shows while a drag of this document runs. -->
        <DragOverlay v-slot="{ operation }" :class="styles.overlay">
            <span :class="styles.lifted">{{ String(operation.source.id) }}</span>
        </DragOverlay>
    </div>
</template>
