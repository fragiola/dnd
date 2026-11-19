<script setup lang="ts">
import * as styles from "./styles";

// Where the card starts: a component of its own, unaware of the box.
</script>

<template>
    <section aria-label="Tray" :class="styles.tray">
        <slot />
    </section>
</template>
