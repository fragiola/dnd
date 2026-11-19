<script setup lang="ts">
import {
    arrayMove,
    grid,
    horizontalList,
    Sortable,
    type SortEndEvent,
} from "@fragiola/dnd-vue/sortable";
import { ref } from "vue";
import * as styles from "./styles";

// Right to left, in Arabic: nothing to configure. The strategies read the direction from the page,
// so the row of tabs flows from the right and the grid fills its rows from the right, as the page
// does. The keyboard follows reading order: ArrowLeft moves an item forward, toward the inline end.

const TABS: Record<string, string> = {
    home: "الرئيسية",
    reports: "التقارير",
    team: "الفريق",
    settings: "الإعدادات",
};

const APPS: Record<string, string> = {
    mail: "البريد",
    calendar: "التقويم",
    notes: "الملاحظات",
    files: "الملفات",
    photos: "الصور",
    music: "الموسيقى",
};

/** One list the user sorts, applied with `arrayMove`. */
function useOrder(start: string[]) {
    const order = ref(start);
    const sortEnd = ({ from, to, canceled }: SortEndEvent) => {
        if (!canceled) order.value = arrayMove(order.value, from.index, to.index);
    };
    return [order, sortEnd] as const;
}

const [tabs, sortTabs] = useOrder(Object.keys(TABS));
const [apps, sortApps] = useOrder(Object.keys(APPS));
</script>

<template>
    <div dir="rtl" lang="ar" :class="styles.frame">
        <ul aria-label="علامات التبويب" :class="styles.tabs">
            <Sortable
                v-for="(id, index) in tabs"
                :id="id"
                :key="id"
                :index="index"
                group="tabs"
                :strategy="horizontalList"
                @sort-end="sortTabs"
            >
                <li :aria-label="TABS[id]" :class="styles.tab">{{ TABS[id] }}</li>
            </Sortable>
        </ul>
        <ul aria-label="التطبيقات" :class="styles.grid">
            <Sortable
                v-for="(id, index) in apps"
                :id="id"
                :key="id"
                :index="index"
                group="apps"
                :strategy="grid"
                @sort-end="sortApps"
            >
                <li :aria-label="APPS[id]" :class="styles.app">
                    <span :class="styles.icon" />
                    {{ APPS[id] }}
                </li>
            </Sortable>
        </ul>
    </div>
</template>
