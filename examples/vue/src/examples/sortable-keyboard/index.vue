<script setup lang="ts">
import {
    moveBetween,
    Sortable,
    type SortEndEvent,
    type SortEvent,
    SortableGroup,
} from "@fragiola/dnd-vue/sortable";
import { ref } from "vue";
import { describeSort, type SortNames, useAnnouncer } from "../_kit/announce";
import { type Board, taskOf } from "../_kit/tasks";
import * as styles from "./styles";

// Sorting without a pointer. Every item is a tab stop: Space or Enter picks it up, the arrows move
// it one place at a time (past the end of Today, on into Later, which accepts it), Space or Enter
// drops it and Escape puts it back. The words are the app's: the item's sort events go through
// the kit's `describeSort` into a live region, with positions a screen reader can say. An item
// moved into the other list is a new element there (Vue mounts it under its new parent), so the
// app gives it the focus back; within a list the core refocuses the item itself.

type List = "today" | "later";

const LISTS: { id: List; title: string }[] = [
    { id: "today", title: "Today" },
    { id: "later", title: "Later" },
];

const KEYS = [
    ["Space / Enter", "pick up, then drop"],
    ["Arrows", "move one place"],
    ["Escape", "put back"],
];

const ACCEPTS: List[] = ["today", "later"];

const board = ref<Board<List>>({
    today: ["login", "guide", "typo"],
    later: ["export", "search"],
});
const [message, announce] = useAnnouncer(
    "Tab to a task, then press Space to pick it up.",
);
const names: SortNames = {
    item: (id) => taskOf(id).title,
    group: (group) => LISTS.find((list) => list.id === group)?.title ?? group,
    size: (group) => board.value[group as List]?.length ?? 0,
};
const say = (event: SortEvent) => announce(describeSort(event, names));

/** the item to focus once it is mounted in its new list */
let refocus: string | number | undefined;

function sortEnd(event: SortEndEvent) {
    say(event);
    if (event.input === "keyboard" && event.to.group !== event.from.group)
        refocus = event.id;
    board.value = moveBetween(board.value, event);
}

/** The item's own template ref: focuses it when it is the one just moved into this list. */
function focusMoved(id: string) {
    return (element: unknown) => {
        if (element instanceof HTMLElement && refocus === id) {
            refocus = undefined;
            element.focus();
        }
    };
}
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
            <!-- the live region: the app's words, from the sort events -->
            <p role="status" aria-live="polite" :class="styles.status">
                {{ message }}
            </p>
        </div>
        <p id="sortable-keyboard-help" :class="styles.help">
            Press Space or Enter to pick up a task, the arrow keys to move it,
            Space or Enter to drop it and Escape to cancel.
        </p>
        <div :class="styles.lists">
            <section v-for="list in LISTS" :key="list.id" :class="styles.column">
                <h3 :class="styles.title">{{ list.title }}</h3>
                <SortableGroup :group="list.id" :accepts="ACCEPTS">
                    <ol :aria-label="list.title" :class="styles.list">
                        <Sortable
                            v-for="(id, index) in board[list.id]"
                            :id="id"
                            :key="id"
                            :index="index"
                            :group="list.id"
                            :accepts="ACCEPTS"
                            described-by="sortable-keyboard-help"
                            @sort-start="say"
                            @sort-over="say"
                            @sort-end="sortEnd"
                        >
                            <li
                                :ref="focusMoved(id)"
                                :aria-label="taskOf(id).title"
                                :class="styles.item"
                            >
                                {{ taskOf(id).title }}
                            </li>
                        </Sortable>
                    </ol>
                </SortableGroup>
            </section>
        </div>
    </div>
</template>
