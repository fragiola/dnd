<script setup lang="ts">
import { useDragMonitor } from "@fragiola/dnd-vue";
import { Draggable } from "@fragiola/dnd-vue/draggable";
import { Droppable } from "@fragiola/dnd-vue/droppable";
import { ref } from "vue";
import { Switch } from "#/components/ui/switch";
import { describeDrag, useAnnouncer } from "../_kit/announce";
import { type Board, moveTask, taskOf } from "../_kit/tasks";
import * as styles from "./styles";

// Every card is a tab stop. Space or Enter grabs it; the arrows move it, to the next column in
// reading order ("targets" mode) or 25 px at a time ("step" mode); Space or Enter drops it, and
// Escape puts it back. The words a screen reader hears are the app's: `useDragMonitor` reports
// every drag of the page, and the kit turns each event into a sentence for the live region.

type Column = "backlog" | "doing" | "done";

const COLUMNS: { id: Column; title: string }[] = [
    { id: "backlog", title: "Backlog" },
    { id: "doing", title: "Doing" },
    { id: "done", title: "Done" },
];

const KEYS = [
    ["Space / Enter", "grab, then drop"],
    ["Arrows", "move"],
    ["Escape", "put back"],
];

const nameOf = (id: string | number) =>
    COLUMNS.find((column) => column.id === id)?.title ?? taskOf(id).title;

const board = ref<Board<Column>>({
    backlog: ["login", "export"],
    doing: ["guide"],
    done: [],
});
const targets = ref(true);
const [message, announce] = useAnnouncer(
    "Tab to a card, then press Space to grab it.",
);
useDragMonitor((event) => announce(describeDrag(event, nameOf)));
</script>

<template>
    <div :class="styles.frame">
        <div :class="styles.panel">
            <ul aria-label="Keys" :class="styles.keys">
                <li v-for="[key, does] in KEYS" :key="key" :class="styles.keyRow">
                    <kbd :class="styles.key">{{ key }}</kbd>
                    {{ does }}
                </li>
            </ul>
            <div :class="styles.mode">
                <Switch.Root v-model="targets" aria-label="Jump between columns">
                    <Switch.Thumb />
                </Switch.Root>
                {{ targets ? "Arrows jump between columns" : "Arrows move 25 px" }}
            </div>
            <!-- the live region: the app's words, from the drag events -->
            <p role="status" aria-live="polite" :class="styles.status">
                {{ message }}
            </p>
        </div>
        <p id="keyboard-help" :class="styles.help">
            Press Space or Enter to grab a card, the arrow keys to move it, Space or
            Enter to drop it and Escape to cancel.
        </p>
        <div :class="styles.columns">
            <Droppable
                v-for="column in COLUMNS"
                :id="column.id"
                :key="column.id"
                @drop="
                    board = moveTask(board, String($event.operation.source.id), column.id)
                "
            >
                <section :aria-label="column.title" :class="styles.column">
                    <h3 :class="styles.columnTitle">{{ column.title }}</h3>
                    <Draggable
                        v-for="id in board[column.id]"
                        :id="id"
                        :key="id"
                        :keyboard="{ mode: targets ? 'targets' : 'step' }"
                        described-by="keyboard-help"
                    >
                        <article :aria-label="taskOf(id).title" :class="styles.card">
                            {{ taskOf(id).title }}
                        </article>
                    </Draggable>
                </section>
            </Droppable>
        </div>
    </div>
</template>
