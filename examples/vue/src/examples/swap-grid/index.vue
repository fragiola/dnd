<script setup lang="ts">
import { type SwapEvent, Swappable, swapItems } from "@fragiola/dnd-vue/swappable";
import { Activity, Gauge, Globe, Timer, Users, Wallet } from "@lucide/vue";
import { ref } from "vue";
import * as styles from "./styles";

// A dashboard whose widgets trade places. Over another widget, only that one moves, into the
// dragged widget's place, and the core marks it `data-dnd-swap-target` (styled in styles.ts):
// nothing else shifts and nothing renders. On the drop the app swaps the two with `swapItems`;
// dropped over no widget, nothing changes.

const WIDGETS = {
    visitors: { label: "Visitors", value: "12.4k", icon: Users },
    revenue: { label: "Revenue", value: "$8,210", icon: Wallet },
    uptime: { label: "Uptime", value: "99.98%", icon: Activity },
    latency: { label: "Latency", value: "142 ms", icon: Timer },
    regions: { label: "Regions", value: "14", icon: Globe },
    load: { label: "Load", value: "61%", icon: Gauge },
};

type Widget = keyof typeof WIDGETS;

const widgets = ref(Object.keys(WIDGETS) as Widget[]);

function swap({ source, target, canceled }: SwapEvent) {
    if (!canceled && target)
        widgets.value = swapItems(widgets.value, source.index, target.index);
}
</script>

<template>
    <div :class="styles.frame">
        <ul aria-label="Dashboard" :class="styles.grid">
            <Swappable
                v-for="(widget, index) in widgets"
                :id="widget"
                :key="widget"
                :index="index"
                group="dashboard"
                @swap="swap"
            >
                <li :aria-label="WIDGETS[widget].label" :class="styles.widget">
                    <span :class="styles.label">
                        <component :is="WIDGETS[widget].icon" aria-hidden="true" />
                        {{ WIDGETS[widget].label }}
                    </span>
                    <span :class="styles.value">{{ WIDGETS[widget].value }}</span>
                </li>
            </Swappable>
        </ul>
    </div>
</template>
