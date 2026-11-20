<script setup lang="ts">
import { computed } from "vue";
import {
    type DispatchState,
    formatSla,
    SKILL_NAMES,
    slaLeft,
    type Ticket,
} from "../_kit/dispatch";
import * as styles from "./styles";

// A ticket as the board shows it: what it is, how urgent, its SLA and, for the one an agent works
// on, a hand-drawn progress bar. One `<li>` root that takes the attributes given to it, so a
// `Sortable` or a `Swappable` can wrap it (or nothing, where it does not drag).

const props = withDefaults(
    defineProps<{
        ticket: Ticket;
        state: DispatchState;
        /** the ticket its agent works on now */
        working?: boolean;
        /** a refused or cancelled drag: it glides back home */
        returning?: boolean;
        /** done: its SLA no longer counts */
        resolved?: boolean;
    }>(),
    { working: false, returning: false, resolved: false },
);

const left = computed(() => slaLeft(props.state, props.ticket));
const overdue = computed(() => !props.resolved && left.value < 0);
</script>

<template>
    <li
        :aria-label="`${ticket.id}: ${ticket.subject}`"
        :data-priority="ticket.priority"
        :data-overdue="overdue ? '' : undefined"
        :data-working="working ? '' : undefined"
        :data-returning="returning ? '' : undefined"
        :class="styles.ticket"
    >
        <span :class="styles.ticketTop">
            <span :class="styles.priority(ticket.priority)">P{{ ticket.priority }}</span>
            <span :class="styles.subject">{{ ticket.subject }}</span>
        </span>
        <span :class="styles.ticketBottom">
            <span :class="styles.ticketId">{{ ticket.id }}</span>
            <span :class="styles.skill(ticket.skill)">{{ SKILL_NAMES[ticket.skill] }}</span>
            <span data-sla="" :class="styles.sla(overdue)">
                {{ resolved ? "Resolved" : formatSla(left) }}
            </span>
        </span>
        <svg
            v-if="working"
            aria-hidden="true"
            viewBox="0 0 100 3"
            preserveAspectRatio="none"
            :class="styles.progress"
        >
            <rect width="100" height="3" :class="styles.track" />
            <rect :width="Math.round(ticket.progress * 100)" height="3" :class="styles.done" />
        </svg>
    </li>
</template>
