<script setup lang="ts">
import { Draggable } from "@fragiola/dnd-vue/draggable";
import { FileAudio, FileImage, FileText } from "@lucide/vue";
import { type DemoFile, formatSize } from "../_kit/files";
import * as styles from "./styles";

// A file: a draggable whose `type` is its kind, carrying the file in `data`.

defineProps<{ file: DemoFile }>();

const ICONS = { image: FileImage, document: FileText, audio: FileAudio };
</script>

<template>
    <Draggable :id="file.id" :type="file.kind" :data="file">
        <li :aria-label="file.name" :class="styles.file">
            <component :is="ICONS[file.kind]" aria-hidden="true" :class="styles.icon" />
            <span :class="styles.fileName">{{ file.name }}</span>
            <span :class="styles.size">{{ formatSize(file.size) }}</span>
        </li>
    </Draggable>
</template>
