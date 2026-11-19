<script setup lang="ts">
import type { DragSource } from "@fragiola/dnd-vue";
import { Droppable } from "@fragiola/dnd-vue/droppable";
import { ref } from "vue";
import { type DemoFile, FILES } from "../_kit/files";
import FileCard from "./file-card.vue";
import * as styles from "./styles";

// Each file is a draggable whose `type` is its kind. A folder's `accepts` is a list of types, or a
// predicate of the source: a folder that would take the drag in progress is marked
// `data-dnd-active`, one that refuses the source under the pointer `data-dnd-refused`, and a
// refused drop never reaches `onDrop`.

type FolderId = "desk" | "images" | "documents" | "small";

interface Folder {
    readonly id: FolderId;
    readonly title: string;
    readonly rule: string;
    readonly accepts?: readonly string[] | ((source: DragSource) => boolean);
}

const FOLDERS: readonly Folder[] = [
    { id: "images", title: "Images", rule: "image", accepts: ["image"] },
    {
        id: "documents",
        title: "Documents",
        rule: "document",
        accepts: ["document"],
    },
    {
        id: "small",
        title: "Small files",
        rule: "under 100 KB",
        // a predicate reads anything the draggable carries in `data`
        accepts: (source) => ((source.data as DemoFile).size ?? 0) < 100,
    },
];

const where = ref<Record<string, FolderId>>(
    Object.fromEntries(FILES.map((file) => [file.id, "desk"])),
);
const move = (id: string | number, to: FolderId) => {
    where.value = { ...where.value, [String(id)]: to };
};
const filesIn = (folder: FolderId) =>
    FILES.filter((file) => where.value[file.id] === folder);
</script>

<template>
    <div :class="styles.frame">
        <Droppable id="desk" @drop="move($event.operation.source.id, 'desk')">
            <ul aria-label="Desk" :class="styles.desk">
                <FileCard
                    v-for="file in filesIn('desk')"
                    :key="file.id"
                    :file="file"
                />
            </ul>
        </Droppable>
        <div :class="styles.folders">
            <Droppable
                v-for="folder in FOLDERS"
                :id="folder.id"
                :key="folder.id"
                :accepts="folder.accepts"
                @drop="move($event.operation.source.id, folder.id)"
            >
                <section :aria-label="folder.title" :class="styles.folder">
                    <header :class="styles.folderHeader">
                        <span :class="styles.folderTitle">{{ folder.title }}</span>
                        <span :class="styles.rule">{{ `takes: ${folder.rule}` }}</span>
                        <span aria-hidden="true" :class="styles.refused">Not here</span>
                    </header>
                    <ul
                        :aria-label="`Files in ${folder.title}`"
                        :class="styles.folderFiles"
                    >
                        <FileCard
                            v-for="file in filesIn(folder.id)"
                            :key="file.id"
                            :file="file"
                        />
                    </ul>
                </section>
            </Droppable>
        </div>
    </div>
</template>
