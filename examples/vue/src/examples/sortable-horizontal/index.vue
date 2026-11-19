<script setup lang="ts">
import {
    arrayMove,
    horizontalList,
    Sortable,
    type SortEndEvent,
} from "@fragiola/dnd-vue/sortable";
import {
    MessageSquare,
    MousePointer2,
    PenLine,
    Shapes,
    Type,
} from "@lucide/vue";
import { ref } from "vue";
import * as styles from "./styles";

// A toolbar the user arranges: the same `Sortable` as a vertical list, with the `horizontalList`
// strategy (an export of its own, so a vertical list never ships it). Items of different widths
// keep their gaps, and in a right-to-left page the row flows from the right.

const TOOLS = {
    select: { label: "Select", icon: MousePointer2 },
    pen: { label: "Pen", icon: PenLine },
    shapes: { label: "Shapes", icon: Shapes },
    text: { label: "Text", icon: Type },
    comment: { label: "Comment", icon: MessageSquare },
};

type Tool = keyof typeof TOOLS;

const tools = ref<Tool[]>(["select", "pen", "shapes", "text", "comment"]);

function sortEnd({ from, to, canceled }: SortEndEvent) {
    if (!canceled) tools.value = arrayMove(tools.value, from.index, to.index);
}
</script>

<template>
    <div :class="styles.frame">
        <p :class="styles.hint">Drag a tool to rearrange the toolbar.</p>
        <ul aria-label="Toolbar" :class="styles.row">
            <Sortable
                v-for="(tool, index) in tools"
                :id="tool"
                :key="tool"
                :index="index"
                group="toolbar"
                :strategy="horizontalList"
                @sort-end="sortEnd"
            >
                <li :aria-label="TOOLS[tool].label" :class="styles.tool">
                    <component :is="TOOLS[tool].icon" aria-hidden="true" />
                    {{ TOOLS[tool].label }}
                </li>
            </Sortable>
        </ul>
        <p :class="styles.order">
            Order: <output aria-label="Order">{{ tools.join(", ") }}</output>
        </p>
    </div>
</template>
