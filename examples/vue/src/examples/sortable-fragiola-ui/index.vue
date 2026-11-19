<script setup lang="ts">
import {
    arrayMove,
    DragHandle,
    horizontalList,
    Sortable,
    type SortEndEvent,
} from "@fragiola/dnd-vue/sortable";
import { GripVertical } from "@lucide/vue";
import { ref } from "vue";
import { Clickable } from "#/components/atoms/clickable";
import { Avatar } from "#/components/ui/avatar";
import { Switch } from "#/components/ui/switch";
import * as styles from "./styles";

// Fragiola UI items, vendored as any app gets them (a copy-paste registry), sorted as they are.
// `Sortable` renders the component it wraps with its attributes merged in and renders no element:
// an `Avatar.Root` keeps its own classes and `data-slot`, and dnd's `data-dnd-*` and `translate`
// sit beside them. In the list, a Fragiola `Clickable.Button` is the drag handle, and each row's
// `Switch` keeps its own handler: a press on it toggles, and never starts a sort (a native control
// never drags).

const PEOPLE: Record<string, string> = {
    ada: "Ada Lovelace",
    alan: "Alan Turing",
    grace: "Grace Hopper",
    linus: "Linus Torvalds",
    margaret: "Margaret Hamilton",
};

const CHANNELS: Record<string, string> = {
    email: "Email",
    push: "Push notifications",
    sms: "Text messages",
    digest: "Weekly digest",
};

const initials = (name: string) =>
    name
        .split(" ")
        .map((word) => word[0])
        .join("");

/** One list the user sorts, applied with `arrayMove`. */
function useOrder(start: string[]) {
    const order = ref(start);
    const onSortEnd = ({ from, to, canceled }: SortEndEvent) => {
        if (!canceled) order.value = arrayMove(order.value, from.index, to.index);
    };
    return [order, onSortEnd] as const;
}

const [people, onPeople] = useOrder(Object.keys(PEOPLE));
const [channels, onChannels] = useOrder(Object.keys(CHANNELS));
const enabled = ref<Record<string, boolean>>({ email: true, digest: true });

function toggle(id: string, checked: boolean) {
    enabled.value = { ...enabled.value, [id]: checked };
}
</script>

<template>
    <div :class="styles.frame">
        <section :class="styles.section">
            <h3 :class="styles.title">Reviewers, in order</h3>
            <div :class="styles.avatars">
                <Sortable
                    v-for="(id, index) in people"
                    :id="id"
                    :key="id"
                    :index="index"
                    group="reviewers"
                    :strategy="horizontalList"
                    @sort-end="onPeople"
                >
                    <!-- the Fragiola UI component itself is the sortable item -->
                    <Avatar.Root :aria-label="PEOPLE[id]" :class="styles.avatar">
                        <Avatar.Fallback>
                            {{ initials(PEOPLE[id] ?? id) }}
                        </Avatar.Fallback>
                    </Avatar.Root>
                </Sortable>
            </div>
        </section>
        <section :class="styles.section">
            <h3 :class="styles.title">Channels, by priority</h3>
            <ol aria-label="Channels" :class="styles.channels">
                <Sortable
                    v-for="(id, index) in channels"
                    :id="id"
                    :key="id"
                    :index="index"
                    group="channels"
                    @sort-end="onChannels"
                >
                    <li :aria-label="CHANNELS[id]" :class="styles.row">
                        <DragHandle>
                            <Clickable.Button
                                variant="icon"
                                shape="square"
                                size="sm"
                                :aria-label="`Move ${CHANNELS[id]}`"
                                :class="styles.handle"
                            >
                                <GripVertical aria-hidden="true" />
                            </Clickable.Button>
                        </DragHandle>
                        <span :class="styles.label">{{ CHANNELS[id] }}</span>
                        <Switch.Root
                            :model-value="!!enabled[id]"
                            :aria-label="`${CHANNELS[id]} on`"
                            @update:model-value="(checked) => toggle(id, checked)"
                        >
                            <Switch.Thumb />
                        </Switch.Root>
                    </li>
                </Sortable>
            </ol>
        </section>
    </div>
</template>
