import type { ComponentProps } from "react";
import {
    type DispatchState,
    formatSla,
    SKILL_NAMES,
    slaLeft,
    type Ticket,
} from "../_kit/dispatch";
import * as styles from "./styles";

// A ticket as the board shows it: what it is, how urgent, its SLA and, for the one an agent works
// on, a hand-drawn progress bar. A plain `<li>` that passes its props and `ref` on, so a
// `Sortable` or a `Swappable` can wrap it (or nothing, where it does not drag).

interface TicketCardProps extends ComponentProps<"li"> {
    readonly ticket: Ticket;
    readonly state: DispatchState;
    /** the ticket its agent works on now */
    readonly working?: boolean;
    /** a refused or cancelled drag: it glides back home */
    readonly returning?: boolean;
    /** done: its SLA no longer counts */
    readonly resolved?: boolean;
}

export function TicketCard({
    ticket,
    state,
    working = false,
    returning = false,
    resolved = false,
    ...props
}: TicketCardProps) {
    const left = slaLeft(state, ticket);
    const overdue = !resolved && left < 0;
    return (
        <li
            {...props}
            aria-label={`${ticket.id}: ${ticket.subject}`}
            data-priority={ticket.priority}
            data-overdue={overdue ? "" : undefined}
            data-working={working ? "" : undefined}
            data-returning={returning ? "" : undefined}
            className={styles.ticket}
        >
            <span className={styles.ticketTop}>
                <span className={styles.priority(ticket.priority)}>
                    P{ticket.priority}
                </span>
                <span className={styles.subject}>{ticket.subject}</span>
            </span>
            <span className={styles.ticketBottom}>
                <span className={styles.ticketId}>{ticket.id}</span>
                <span className={styles.skill(ticket.skill)}>
                    {SKILL_NAMES[ticket.skill]}
                </span>
                <span data-sla="" className={styles.sla(overdue)}>
                    {resolved ? "Resolved" : formatSla(left)}
                </span>
            </span>
            {working ? (
                <svg
                    aria-hidden="true"
                    viewBox="0 0 100 3"
                    preserveAspectRatio="none"
                    className={styles.progress}
                >
                    <rect width="100" height="3" className={styles.track} />
                    <rect
                        width={Math.round(ticket.progress * 100)}
                        height="3"
                        className={styles.done}
                    />
                </svg>
            ) : null}
        </li>
    );
}
