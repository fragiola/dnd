<script setup lang="ts">
import { type DragSource, useDragMonitor } from "@fragiola/dnd-vue";
import { Droppable } from "@fragiola/dnd-vue/droppable";
import {
    moveBetween,
    Sortable,
    type SortEndEvent,
    SortableGroup,
    type SortSource,
} from "@fragiola/dnd-vue/sortable";
import {
    type SwapEvent,
    type SwapSource,
    Swappable,
    swapBetween,
} from "@fragiola/dnd-vue/swappable";
import { Pause, Play } from "@lucide/vue";
import { computed, nextTick, onMounted, onUnmounted, ref, shallowRef, watch } from "vue";
import { Clickable } from "#/components/atoms/clickable";
import { Avatar } from "#/components/ui/avatar";
import {
    AGENT_IDS,
    AGENTS,
    type AgentId,
    type ColumnId,
    canSwap,
    columnOf,
    createDispatchFeed,
    formatClock,
    formatDuration,
    SKILL_NAMES,
    sparkline,
    totalsOf,
    type Verdict,
    verdictOf,
} from "../_kit/dispatch";
import * as styles from "./styles";
import TicketCard from "./ticket-card.vue";

// A live support dispatch. Tickets keep arriving in Triage, every SLA counts down, and agents work
// the first ticket of their queue. Each column is a sortable group: a ticket sorts within it, and
// moves to an agent whose `accepts` predicate takes it (the agent has its skill and room). A
// refusing group is never entered, so each agent's column is also a plain `Droppable` that takes
// exactly the tickets its group refuses: over it, the sort goes back to rest and the ticket glides
// home. In Swap mode the agents' tickets are swappable instead, and two of them change hands when
// each agent has the other's skill. The feed holds its arrivals while a drag runs
// (`useDragMonitor`), so a new ticket never moves the list under the pointer.

type Mode = "move" | "swap";

const COLUMN_NAMES: Record<ColumnId, string> = {
    triage: "Triage",
    ava: "Ava",
    noor: "Noor",
    kenji: "Kenji",
    resolved: "Resolved",
};

const REASONS: Record<Exclude<Verdict, "ok">, string> = {
    full: "Full",
    skill: "Not their skill",
};

const HELP_ID = "support-dispatch-help";

const feed = createDispatchFeed();
const state = shallowRef(feed.state);
const unsubscribe = feed.subscribe(() => {
    state.value = feed.state;
});
const root = ref<HTMLElement>();
let unwatch: (() => void) | undefined;
onMounted(() => {
    if (root.value) unwatch = feed.watch(root.value);
});
onUnmounted(() => {
    unwatch?.();
    unsubscribe();
});

const mode = ref<Mode>("move");
const message = ref("");
/** the ticket a drag in progress carries */
const dragging = ref<string>();
/** the ticket gliding home after a refused or cancelled drag */
const returning = ref<string>();
let glide: ReturnType<typeof setTimeout> | undefined;
watch(returning, (id) => {
    clearTimeout(glide);
    if (id !== undefined) glide = setTimeout(() => (returning.value = undefined), 400);
});
/** the ticket to focus once it is mounted in its new column (a keyboard move) */
let refocus: string | undefined;

useDragMonitor((event) => {
    if (event.type === "drag-start") {
        feed.hold(true);
        dragging.value = String(event.operation.source.id);
    } else if (event.type === "drop" || event.type === "drag-cancel") {
        feed.hold(false);
        dragging.value = undefined;
    }
});

// the predicates read the feed's state when asked, so they never change identity (a new one on
// every tick would be an option change for every part)
const takes = {} as Record<AgentId, (source: SortSource) => boolean>;
const refuses = {} as Record<AgentId, (source: DragSource) => boolean>;
for (const agent of AGENT_IDS) {
    takes[agent] = (source) => verdictOf(feed.state, agent, source.id) === "ok";
    refuses[agent] = (source) =>
        columnOf(feed.state, source.id) !== agent &&
        verdictOf(feed.state, agent, source.id) !== "ok";
}
// the resolved column takes tickets an agent holds, never one still in triage
const unworked = (source: DragSource) => columnOf(feed.state, source.id) === "triage";
const swaps = new Map<string, (source: SwapSource) => boolean>();
function swapsWith(id: string) {
    let rule = swaps.get(id);
    if (!rule) {
        rule = (source) => canSwap(feed.state, source.id, id);
        swaps.set(id, rule);
    }
    return rule;
}

const nameOf = (column: string) => COLUMN_NAMES[column as ColumnId] ?? column;

function sortEnd(event: SortEndEvent) {
    const id = String(event.id);
    const home = event.to.group === event.from.group && event.to.index === event.from.index;
    if (event.canceled || home) {
        returning.value = id;
        if (event.canceled) message.value = `Cancelled: ${id} is back.`;
        return;
    }
    if (event.input === "keyboard" && event.to.group !== event.from.group) refocus = id;
    feed.move((board) => moveBetween(board, event));
    message.value =
        event.to.group === event.from.group
            ? `${id} is now number ${event.to.index + 1} in ${nameOf(event.to.group)}.`
            : event.to.group === "resolved"
              ? `${id} resolved.`
              : event.to.group === "triage"
                ? `${id} is back in triage.`
                : `${id} assigned to ${nameOf(event.to.group)}.`;
}

function refused(agent: string, source: string | number) {
    const verdict = verdictOf(feed.state, agent as AgentId, source);
    message.value =
        verdict === "full"
            ? `${nameOf(agent)} is full: ${source} stays where it was.`
            : `${nameOf(agent)} does not take ${source}: not their skill.`;
}

function swapped(event: SwapEvent) {
    const id = String(event.source.id);
    if (!event.target || event.canceled) {
        returning.value = id;
        return;
    }
    feed.move((board) => swapBetween(board, event));
    message.value = `${id} and ${event.target.id} swapped between ${nameOf(event.source.group)} and ${nameOf(event.target.group)}.`;
}

// found after the render, by its `data-dnd-id`: a keyboard move to another column mounts the
// ticket as a new element there, so the element to focus exists only once the DOM is patched
watch(state, () => {
    const id = refocus;
    if (id === undefined) return;
    refocus = undefined;
    nextTick(() =>
        root.value?.querySelector<HTMLElement>(`[data-dnd-id="${id}"]`)?.focus(),
    );
});

const totals = computed(() => totalsOf(state.value));

function why(agent: AgentId): Exclude<Verdict, "ok"> | undefined {
    const id = dragging.value;
    if (!id || mode.value !== "move") return undefined;
    if (columnOf(state.value, id) === agent) return undefined;
    const verdict = verdictOf(state.value, agent, id);
    return verdict === "ok" ? undefined : verdict;
}

const skillsOf = (agent: (typeof AGENTS)[number]) =>
    agent.skills.map((skill) => SKILL_NAMES[skill]).join(" · ");
</script>

<template>
    <div ref="root" :class="styles.frame">
        <header :class="styles.header">
            <div :class="styles.heading">
                <h3 :class="styles.title">Support dispatch</h3>
                <span role="timer" aria-label="Shift clock" :class="styles.clock">
                    {{ formatClock(state.clock) }}
                </span>
            </div>
            <dl aria-label="Queue figures" :class="styles.figures">
                <div :class="styles.figure">
                    <dt :class="styles.figureName">Queue</dt>
                    <dd data-testid="queue-size" :class="styles.figureValue">{{ totals.queued }}</dd>
                </div>
                <div :class="styles.figure">
                    <dt :class="styles.figureName">Avg wait</dt>
                    <dd data-testid="average-wait" :class="styles.figureValue">
                        {{ formatDuration(totals.averageWait) }}
                    </dd>
                </div>
                <div :class="styles.figure">
                    <dt :class="styles.figureName">Overdue</dt>
                    <dd
                        data-testid="overdue"
                        :data-alert="totals.overdue > 0 ? '' : undefined"
                        :class="styles.figureValue"
                    >
                        {{ totals.overdue }}
                    </dd>
                </div>
                <div :class="styles.figure">
                    <dt :class="styles.figureName">Resolved</dt>
                    <dd data-testid="resolved" :class="styles.figureValue">{{ state.resolved }}</dd>
                </div>
            </dl>
            <!-- the queue over the last ticks, drawn by hand: no chart library -->
            <svg
                aria-hidden="true"
                viewBox="0 0 120 28"
                preserveAspectRatio="none"
                :class="styles.sparkline"
            >
                <polyline :points="sparkline(state.queue, 120, 28)" :class="styles.sparklineLine" />
            </svg>
            <div :class="styles.controls">
                <fieldset :class="styles.modes">
                    <legend :class="styles.legend">Drag mode</legend>
                    <Clickable.Button
                        v-for="each in ['move', 'swap'] as const"
                        :key="each"
                        variant="ghost"
                        size="sm"
                        :aria-pressed="mode === each"
                        :class="styles.mode"
                        @click="mode = each"
                    >
                        {{ each === "move" ? "Move" : "Swap" }}
                    </Clickable.Button>
                </fieldset>
                <Clickable.Button
                    variant="outline"
                    size="sm"
                    shape="square"
                    :aria-label="state.playing ? 'Pause the feed' : 'Play the feed'"
                    :class="styles.play"
                    @click="state.playing ? feed.pause() : feed.play()"
                >
                    <Pause v-if="state.playing" aria-hidden="true" />
                    <Play v-else aria-hidden="true" />
                </Clickable.Button>
            </div>
        </header>
        <div :class="styles.notes">
            <p :id="HELP_ID" :class="styles.help">
                {{
                    mode === "move"
                        ? "Drag a ticket to an agent with its skill and room, or sort a queue. Keyboard: Space picks up, arrows move, Space drops."
                        : "Drag an agent's ticket onto another agent's to swap them, when each has the other's skill."
                }}
            </p>
            <p role="status" aria-live="polite" :class="styles.status">
                {{
                    state.held > 0 && dragging
                        ? `${state.held} new ${state.held === 1 ? "ticket waits" : "tickets wait"} for your drop.`
                        : message
                }}
            </p>
        </div>
        <div :class="styles.board">
            <section aria-label="Triage" :class="styles.column">
                <h4 :class="styles.columnTitle">
                    Triage
                    <span :class="styles.count">{{ state.board.triage.length }}</span>
                </h4>
                <SortableGroup v-if="mode === 'move'" group="triage" :accepts="AGENT_IDS">
                    <ul aria-label="Triage queue" :class="styles.list">
                        <template v-for="(id, index) in state.board.triage" :key="id">
                            <Sortable
                                v-if="state.tickets[id]"
                                :id="id"
                                :index="index"
                                group="triage"
                                :accepts="AGENT_IDS"
                                :described-by="HELP_ID"
                                @sort-end="sortEnd"
                            >
                                <TicketCard
                                    :ticket="state.tickets[id]"
                                    :state="state"
                                    :returning="returning === id"
                                />
                            </Sortable>
                        </template>
                    </ul>
                </SortableGroup>
                <ul v-else aria-label="Triage queue" :class="styles.list">
                    <template v-for="id in state.board.triage" :key="id">
                        <TicketCard v-if="state.tickets[id]" :ticket="state.tickets[id]" :state="state" />
                    </template>
                </ul>
            </section>
            <Droppable
                v-for="agent in AGENTS"
                :id="`${agent.id}-zone`"
                :key="agent.id"
                :accepts="refuses[agent.id]"
                :disabled="mode !== 'move'"
                @drop="refused(agent.id, $event.operation.source.id)"
            >
                <section
                    :aria-label="agent.name"
                    :data-full="state.board[agent.id].length >= agent.capacity ? '' : undefined"
                    :data-refuses="why(agent.id)"
                    :class="styles.agentColumn"
                >
                    <header :class="styles.agentHeader">
                        <Avatar.Root :class="styles.avatar">
                            <Avatar.Fallback>{{ agent.name.slice(0, 2) }}</Avatar.Fallback>
                        </Avatar.Root>
                        <div :class="styles.agentText">
                            <div :class="styles.agentNameRow">
                                <h4 :class="styles.agentName">{{ agent.name }}</h4>
                                <span aria-hidden="true" :class="styles.reason">
                                    {{ REASONS[why(agent.id) ?? "full"] }}
                                </span>
                            </div>
                            <span :class="styles.agentSkills">{{ skillsOf(agent) }}</span>
                        </div>
                        <span :class="styles.load">
                            <!-- the capacity, one slot a ticket -->
                            <svg
                                role="img"
                                :aria-label="`${state.board[agent.id].length} of ${agent.capacity} tickets`"
                                :viewBox="`0 0 ${agent.capacity * 8} 8`"
                                :class="styles.meter"
                            >
                                <rect
                                    v-for="slot in agent.capacity"
                                    :key="slot"
                                    :x="(slot - 1) * 8"
                                    width="6"
                                    height="8"
                                    rx="1.5"
                                    :class="styles.slot(slot <= state.board[agent.id].length)"
                                />
                            </svg>
                            <span aria-hidden="true">
                                {{ state.board[agent.id].length }}/{{ agent.capacity }}
                            </span>
                        </span>
                    </header>
                    <SortableGroup v-if="mode === 'move'" :group="agent.id" :accepts="takes[agent.id]">
                        <ul :aria-label="`${agent.name}'s queue`" :class="styles.list">
                            <template v-for="(id, index) in state.board[agent.id]" :key="id">
                                <Sortable
                                    v-if="state.tickets[id]"
                                    :id="id"
                                    :index="index"
                                    :group="agent.id"
                                    :accepts="takes[agent.id]"
                                    :described-by="HELP_ID"
                                    @sort-end="sortEnd"
                                >
                                    <TicketCard
                                            :ticket="state.tickets[id]"
                                        :state="state"
                                        :working="index === 0"
                                        :returning="returning === id"
                                    />
                                </Sortable>
                            </template>
                        </ul>
                    </SortableGroup>
                    <ul v-else :aria-label="`${agent.name}'s queue`" :class="styles.list">
                        <template v-for="(id, index) in state.board[agent.id]" :key="id">
                            <Swappable
                                v-if="state.tickets[id]"
                                :id="id"
                                :index="index"
                                :group="agent.id"
                                :accepts="swapsWith(id)"
                                :described-by="HELP_ID"
                                @swap="swapped"
                            >
                                <TicketCard
                                    :ticket="state.tickets[id]"
                                    :state="state"
                                    :working="index === 0"
                                    :returning="returning === id"
                                />
                            </Swappable>
                        </template>
                    </ul>
                </section>
            </Droppable>
            <Droppable
                id="resolved-zone"
                :accepts="unworked"
                :disabled="mode !== 'move'"
                @drop="message = `${$event.operation.source.id} needs an agent before it is resolved.`"
            >
                <section aria-label="Resolved" :class="styles.column">
                    <h4 :class="styles.columnTitle">
                        Resolved
                        <span :class="styles.count">{{ state.resolved }}</span>
                    </h4>
                    <SortableGroup group="resolved" :accepts="AGENT_IDS" :disabled="mode !== 'move'">
                        <ul aria-label="Resolved tickets" :class="styles.list">
                            <template v-for="id in state.board.resolved" :key="id">
                                <TicketCard
                                    v-if="state.tickets[id]"
                                    :ticket="state.tickets[id]"
                                    :state="state"
                                    resolved
                                />
                            </template>
                        </ul>
                    </SortableGroup>
                </section>
            </Droppable>
        </div>
    </div>
</template>
