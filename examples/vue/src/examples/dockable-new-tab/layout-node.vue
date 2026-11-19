<script setup lang="ts">
import { Droppable } from "@fragiola/dnd-vue/droppable";
import type { Model, RowNode, TabsetNode } from "@fragiola/dockable-vue";
import type { NoteTypes } from "../_kit/dockable";
import { Dockable } from "./dockable";
import { newTab } from "./new-tab";
import * as styles from "./styles";

// One node of the layout: a row (recursing), or a tabset wrapped in a `Droppable` whose drop runs
// Dockable's `tab.add`.

defineProps<{
    node: TabsetNode<NoteTypes> | RowNode<NoteTypes>;
    model: Model<NoteTypes>;
}>();
</script>

<template>
    <Dockable.Row v-if="node.type === 'row'" :node="node">
        <template #default="{ node: child }">
            <LayoutNode :node="child" :model="model" />
        </template>
    </Dockable.Row>
    <Droppable
        v-else
        :id="node.id"
        :accepts="['card']"
        @drop="
            (event) =>
                model.run(
                    'tab.add',
                    newTab(String(event.operation.source.data), node.id),
                )
        "
    >
        <Dockable.TabSet :node="node" :class="styles.tabset">
            <div :class="styles.strip">
                <Dockable.TabList
                    :aria-label="`Tabs of ${node.id}`"
                    :class="styles.tabList"
                >
                    <template #default="{ tab }">
                        <Dockable.Tab :node="tab" :class="styles.tab">
                            {{ tab.label }}
                        </Dockable.Tab>
                    </template>
                </Dockable.TabList>
                <span aria-hidden="true" :class="styles.full">Full</span>
            </div>
            <Dockable.TabSetContent />
        </Dockable.TabSet>
    </Droppable>
</template>
