<script setup lang="ts">
import { Draggable } from "@fragiola/dnd-vue/draggable";
import * as styles from "./styles";

// The card: a plain `article`, made draggable by the component around it.
</script>

<template>
    <Draggable id="card" type="card">
        <article aria-label="Card" :class="styles.card">
            <span :class="styles.cardTitle">Drag me</span>
            <span :class="styles.cardHint">a plain element, wrapped</span>
        </article>
    </Draggable>
</template>
