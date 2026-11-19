<script setup lang="ts">
import { DragOverlay, type DropEvent } from "@fragiola/dnd-vue";
import { Draggable } from "@fragiola/dnd-vue/draggable";
import { Droppable } from "@fragiola/dnd-vue/droppable";
import { createModel } from "@fragiola/dockable-vue";
import { ref } from "vue";
import { type NoteTypes, panelsLayout } from "../_kit/dockable";
import { taskOf } from "../_kit/tasks";
import { Dockable } from "./dockable";
import LayoutNode from "./layout-node.vue";
import MoveInbox from "./move-inbox.vue";
import * as styles from "./styles";

// Draggables inside Dockable panels. Dockable moves a panel's content when its tab moves to
// another tabset (or into a popout) without remounting it; dnd measures when a drag starts and
// registers each element in its own document's drag space, so the cards keep dragging wherever
// the panel went. Move the Inbox tab with the button (Dockable's `tab.move` command) or by
// dragging the tab itself (Dockable's own drag), then drag a card to the Archive again. A panel
// clips its content, so the cards stay put (`:translate="false"`) and a `DragOverlay` carries a
// copy across the panels.

// the model is the source of truth: create it once (never in a ref)
const model = createModel<NoteTypes>(panelsLayout());
const inbox = ref(["login", "export", "guide", "typo"]);
const archive = ref<string[]>([]);

function toArchive(event: DropEvent) {
    const id = String(event.operation.source.id);
    inbox.value = inbox.value.filter((each) => each !== id);
    archive.value = [...archive.value, id];
}
</script>

<template>
    <div :class="styles.frame">
        <MoveInbox :model="model" />
        <Dockable.Root :model="model" :class="styles.root">
            <Dockable.Row v-slot="{ node }">
                <LayoutNode :node="node" />
            </Dockable.Row>
            <Dockable.Panels v-slot="{ tab }">
                <Dockable.Panel :node="tab" :class="styles.panel">
                    <ul
                        v-if="tab.id === 'inbox'"
                        aria-label="Inbox cards"
                        :class="styles.cards"
                    >
                        <Draggable
                            v-for="id in inbox"
                            :id="id"
                            :key="id"
                            :translate="false"
                        >
                            <li
                                :aria-label="taskOf(id).title"
                                :class="styles.card"
                            >
                                {{ taskOf(id).title }}
                            </li>
                        </Draggable>
                    </ul>
                    <Droppable
                        v-else-if="tab.id === 'archive'"
                        id="archive"
                        @drop="toArchive"
                    >
                        <ul aria-label="Archived cards" :class="styles.archive">
                            <li v-if="archive.length === 0" :class="styles.hint">
                                Drop cards here
                            </li>
                            <template v-else>
                                <li
                                    v-for="id in archive"
                                    :key="id"
                                    :class="styles.archived"
                                >
                                    {{ taskOf(id).title }}
                                </li>
                            </template>
                        </ul>
                    </Droppable>
                    <p v-else :class="styles.note">{{ tab.data.text }}</p>
                </Dockable.Panel>
            </Dockable.Panels>
            <Dockable.DropIndicator>
                <template #render="{ props, state }">
                    <div v-bind="props" :class="styles.dropIndicator(state)" />
                </template>
            </Dockable.DropIndicator>
        </Dockable.Root>
        <DragOverlay v-slot="{ operation }">
            <div :class="styles.lifted">
                {{ taskOf(operation.source.id).title }}
            </div>
        </DragOverlay>
    </div>
</template>
