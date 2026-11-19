<script setup lang="ts">
import type { RowNode, TabsetNode } from "@fragiola/dockable-vue";
import type { NoteTypes } from "../_kit/dockable";
import { Dockable } from "./dockable";
import * as styles from "./styles";

// One node of the layout: a row (recursing), or a tabset with its tabs.

defineProps<{ node: TabsetNode<NoteTypes> | RowNode<NoteTypes> }>();
</script>

<template>
    <Dockable.Row v-if="node.type === 'row'" :node="node">
        <template #default="{ node: child }">
            <LayoutNode :node="child" />
        </template>
    </Dockable.Row>
    <Dockable.TabSet v-else :node="node" :class="styles.tabset">
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
        <Dockable.TabSetContent />
    </Dockable.TabSet>
</template>
