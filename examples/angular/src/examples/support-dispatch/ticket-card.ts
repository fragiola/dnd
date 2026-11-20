import { Component, computed, input } from "@angular/core";
import {
    type DispatchState,
    formatSla,
    SKILL_NAMES,
    slaLeft,
    type Ticket,
} from "../_kit/dispatch";
import * as styles from "./styles";

// A ticket as the board shows it: what it is, how urgent, its SLA and, for the one an agent works
// on, a hand-drawn progress bar. Its host is the app's own `<li exampleTicket>`, so a
// `[dndSortable]` or a `[dndSwappable]` can sit on the same element (or nothing, where it does not
// drag).

@Component({
    selector: "li[exampleTicket]",
    host: {
        "[attr.aria-label]": "ticket().id + ': ' + ticket().subject",
        "[attr.data-priority]": "ticket().priority",
        "[attr.data-overdue]": "overdue() ? '' : null",
        "[attr.data-working]": "working() ? '' : null",
        "[attr.data-returning]": "returning() ? '' : null",
        "[class]": "styles.ticket",
    },
    template: `
        <span [class]="styles.ticketTop">
            <span [class]="styles.priority(ticket().priority)">P{{ ticket().priority }}</span>
            <span [class]="styles.subject">{{ ticket().subject }}</span>
        </span>
        <span [class]="styles.ticketBottom">
            <span [class]="styles.ticketId">{{ ticket().id }}</span>
            <span [class]="styles.skill(ticket().skill)">{{ SKILL_NAMES[ticket().skill] }}</span>
            <span data-sla="" [class]="styles.sla(overdue())">
                {{ resolved() ? "Resolved" : formatSla(left()) }}
            </span>
        </span>
        @if (working()) {
            <svg aria-hidden="true" viewBox="0 0 100 3" preserveAspectRatio="none" [class]="styles.progress">
                <rect width="100" height="3" [class]="styles.track" />
                <rect [attr.width]="round(ticket().progress * 100)" height="3" [class]="styles.done" />
            </svg>
        }
    `,
})
export class TicketCard {
    readonly ticket = input.required<Ticket>();
    readonly dispatch = input.required<DispatchState>();
    /** the ticket its agent works on now */
    readonly working = input(false);
    /** a refused or cancelled drag: it glides back home */
    readonly returning = input(false);
    /** done: its SLA no longer counts */
    readonly resolved = input(false);
    protected readonly styles = styles;
    protected readonly SKILL_NAMES = SKILL_NAMES;
    protected readonly formatSla = formatSla;
    protected readonly round = Math.round;
    protected readonly left = computed(() =>
        slaLeft(this.dispatch(), this.ticket()),
    );
    protected readonly overdue = computed(
        () => !this.resolved() && this.left() < 0,
    );
}
