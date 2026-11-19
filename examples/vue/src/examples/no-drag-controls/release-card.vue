<script setup lang="ts">
import { Draggable } from "@fragiola/dnd-vue/draggable";
import { Clickable } from "#/components/atoms/clickable";
import { Input } from "#/components/atoms/fields";
import { Switch } from "#/components/ui/switch";
import * as styles from "./styles";

// The card, wherever it is: its state is the page's, so it survives the move.

const title = defineModel<string>("title", { required: true });
const votes = defineModel<number>("votes", { required: true });
const urgent = defineModel<boolean>("urgent", { required: true });
</script>

<template>
    <Draggable id="release">
        <article aria-label="Release card" :class="styles.card">
            <Input
                aria-label="Title"
                :value="title"
                :class="styles.input"
                @input="title = ($event.target as HTMLInputElement).value"
            />
            <div :class="styles.row">
                <Clickable.Button variant="outline" size="sm" @click="votes++">
                    {{ `Upvote (${votes})` }}
                </Clickable.Button>
                <div :class="styles.switchLabel">
                    <Switch.Root v-model="urgent" aria-label="Urgent">
                        <Switch.Thumb />
                    </Switch.Root>
                    Urgent
                </div>
            </div>
            <p data-dnd-no-drag="" :class="styles.notes">
                These notes opt out with data-dnd-no-drag: select this text with the
                mouse. Drag the card by its empty space.
            </p>
        </article>
    </Draggable>
</template>
