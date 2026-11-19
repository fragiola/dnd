<script setup lang="ts">
import { DragOverlay } from "@fragiola/dnd-vue";
import {
    moveBetween,
    Sortable,
    SortableGroup,
    type SortEndEvent,
} from "@fragiola/dnd-vue/sortable";
import { createModel } from "@fragiola/dockable-vue";
import { Music } from "@lucide/vue";
import { ref } from "vue";
import { type NoteTypes, playlistLayout } from "../_kit/dockable";
import { Dockable } from "./dockable";
import LayoutNode from "./layout-node.vue";
import MovePlaylist from "./move-playlist.vue";
import * as styles from "./styles";

// Sortable lists inside Dockable panels. Dockable moves a panel's content when its tab moves to
// another tabset (or into a popout) without remounting it; dnd measures when a sort starts and
// registers each item in its own document's drag space, so the list keeps sorting wherever the
// panel went. Move the Playlist tab with the button (Dockable's `tab.move`) or by dragging the tab
// (Dockable's own drag), and sort again. The queue accepts songs from the playlist and back. A
// panel clips its content, so the item stays in its list as the placeholder
// (`:translate="false"`, the core shifts it to where it lands) and a `DragOverlay` carries a copy
// across the panels.

type List = "playlist" | "queue";

const SONGS: Record<string, string> = {
    tide: "Low Tide",
    lanterns: "Paper Lanterns",
    north: "Due North",
    static: "Static Bloom",
    quiet: "The Quiet Part",
    orbit: "Slow Orbit",
};

const ACCEPTS: List[] = ["playlist", "queue"];

const TITLES: Record<List, string> = { playlist: "Playlist", queue: "Queue" };

const isList = (id: string): id is List => id === "playlist" || id === "queue";

// the model is the source of truth: create it once (never in a ref)
const model = createModel<NoteTypes>(playlistLayout());
const lists = ref<Record<List, readonly string[]>>({
    playlist: ["tide", "lanterns", "north", "static"],
    queue: ["quiet", "orbit"],
});

function sortEnd(event: SortEndEvent) {
    lists.value = moveBetween(lists.value, event);
}
</script>

<template>
    <div :class="styles.frame">
        <MovePlaylist :model="model" />
        <Dockable.Root :model="model" :class="styles.root">
            <Dockable.Row v-slot="{ node }">
                <LayoutNode :node="node" />
            </Dockable.Row>
            <Dockable.Panels v-slot="{ tab }">
                <Dockable.Panel :node="tab" :class="styles.panel">
                    <SortableGroup
                        v-if="isList(tab.id)"
                        :group="tab.id"
                        :accepts="ACCEPTS"
                    >
                        <ol :aria-label="TITLES[tab.id]" :class="styles.list">
                            <Sortable
                                v-for="(id, index) in lists[tab.id]"
                                :id="id"
                                :key="id"
                                :index="index"
                                :group="tab.id"
                                :accepts="ACCEPTS"
                                :translate="false"
                                @sort-end="sortEnd"
                            >
                                <li :aria-label="SONGS[id]" :class="styles.song">
                                    <Music aria-hidden="true" />
                                    {{ SONGS[id] }}
                                </li>
                            </Sortable>
                        </ol>
                    </SortableGroup>
                    <p v-else :class="styles.note">{{ tab.data.text }}</p>
                </Dockable.Panel>
            </Dockable.Panels>
            <Dockable.DropIndicator>
                <template #render="{ props, state }">
                    <div v-bind="props" :class="styles.dropIndicator(state)" />
                </template>
            </Dockable.DropIndicator>
        </Dockable.Root>
        <DragOverlay v-slot="{ operation }">
            <div :class="styles.lifted">
                <Music aria-hidden="true" />
                {{ SONGS[String(operation.source.id)] }}
            </div>
        </DragOverlay>
    </div>
</template>
