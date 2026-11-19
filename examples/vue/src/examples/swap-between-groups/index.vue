<script setup lang="ts">
import { Swappable, swapBetween } from "@fragiola/dnd-vue/swappable";
import { ref } from "vue";
import * as styles from "./styles";

// Two groups that swap with each other: a starting lineup and its bench. A player swaps with a
// teammate of the lineup, or with a substitute (both groups list each other in `accepts`). The app
// keeps one list per group and applies each swap with `swapBetween`, which takes the event as it
// is: the source's and the target's group and index.

type Group = "lineup" | "bench";

const GROUPS: { id: Group; title: string }[] = [
    { id: "lineup", title: "Lineup" },
    { id: "bench", title: "Bench" },
];

const ACCEPTS: Group[] = ["lineup", "bench"];

const team = ref<Record<Group, readonly string[]>>({
    lineup: ["Ana", "Bruno", "Chiara", "Dev", "Emeka"],
    bench: ["Farah", "Goran", "Hana"],
});
</script>

<template>
    <div :class="styles.frame">
        <section v-for="group in GROUPS" :key="group.id" :class="styles.group">
            <h3 :class="styles.title">{{ group.title }}</h3>
            <ol :aria-label="group.title" :class="styles.players">
                <Swappable
                    v-for="(name, index) in team[group.id]"
                    :id="name"
                    :key="name"
                    :index="index"
                    :group="group.id"
                    :accepts="ACCEPTS"
                    @swap="(event) => (team = swapBetween(team, event))"
                >
                    <li :aria-label="name" :class="styles.player">
                        <span :class="styles.number">{{ index + 1 }}</span>
                        {{ name }}
                    </li>
                </Swappable>
            </ol>
        </section>
    </div>
</template>
