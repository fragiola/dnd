<script setup lang="ts">
import { useDragSpace } from "@fragiola/dnd-vue";
import { Draggable } from "@fragiola/dnd-vue/draggable";
import { createModel } from "@fragiola/dockable-vue";
import { onScopeDispose, watchEffect } from "vue";
import {
    limitTabs,
    MAX_TABS,
    type NoteTypes,
    notesLayout,
} from "../_kit/dockable";
import { Dockable } from "./dockable";
import LayoutNode from "./layout-node.vue";
import { newTab } from "./new-tab";
import * as styles from "./styles";

// Drag a card onto a Dockable tabset and it opens as a tab. The `Droppable` wraps the
// `Dockable.TabSet` element itself (it passes its attributes and template ref on, as every
// Fragiola primitive does), and its `@drop` runs Dockable's own command, `model.run("tab.add", …)`:
// the drop goes through Dockable's rules like any other change. One of them, written as a
// Dockable middleware in the kit, caps a tabset at three tabs. A dnd drop middleware (`space.use`)
// asks Dockable the same question with `model.can`, so a full tabset is refused while the card
// hovers it, not after.

const CARDS = ["Roadmap", "Budget", "Hiring", "Retro"];

// the model is the source of truth: create it once (never in a ref)
const model = createModel<NoteTypes>(notesLayout());
// Dockable's rule, in Dockable
onScopeDispose(limitTabs(model));
// the cross-library rule: dnd asks Dockable before it lets a card drop on a tabset
const space = useDragSpace();
watchEffect((onCleanup) => {
    const current = space.value;
    if (!current) return;
    onCleanup(
        current.use((ctx, next) => {
            const tabset = String(ctx.payload.droppableId);
            if (model.get("node-by", { id: tabset })?.type !== "tabset")
                return next();
            return model.can("tab.add", newTab(String(ctx.source.data), tabset))
                ? next()
                : {
                      ok: false,
                      error: { code: "vetoed", message: "That tabset is full." },
                  };
        }),
    );
});
</script>

<template>
    <div :class="styles.frame">
        <div :class="styles.toolbar">
            <ul aria-label="Cards" :class="styles.cards">
                <Draggable
                    v-for="card in CARDS"
                    :id="card"
                    :key="card"
                    type="card"
                    :data="card"
                >
                    <li :aria-label="card" :class="styles.card">{{ card }}</li>
                </Draggable>
            </ul>
            <span :class="styles.hint">{{
                `At most ${MAX_TABS} tabs per tabset`
            }}</span>
        </div>
        <Dockable.Root :model="model" :class="styles.root">
            <!-- The developer owns Dockable's recursion: each tabset is wrapped in a `Droppable`. -->
            <Dockable.Row v-slot="{ node }">
                <LayoutNode :node="node" :model="model" />
            </Dockable.Row>
            <Dockable.Panels v-slot="{ tab }">
                <Dockable.Panel :node="tab" :class="styles.panel">
                    <p>{{ tab.data.text }}</p>
                </Dockable.Panel>
            </Dockable.Panels>
        </Dockable.Root>
    </div>
</template>
