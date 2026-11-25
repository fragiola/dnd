"use client";

import { type DragSource, useDragMonitor } from "@fragiola/dnd-react";
import { Droppable } from "@fragiola/dnd-react/droppable";
import {
    moveBetween,
    Sortable,
    SortableGroup,
    type SortEndEvent,
    type SortSource,
} from "@fragiola/dnd-react/sortable";
import {
    type SwapEvent,
    Swappable,
    type SwapSource,
    swapBetween,
} from "@fragiola/dnd-react/swappable";
import { Pause, Play } from "lucide-react";
import {
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
    useSyncExternalStore,
} from "react";
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
import { TicketCard } from "./ticket-card";

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

export default function SupportDispatch() {
    const [feed] = useState(() => createDispatchFeed());
    const state = useSyncExternalStore(
        feed.subscribe,
        () => feed.state,
        () => feed.state,
    );
    const root = useRef<HTMLDivElement>(null);
    useEffect(
        () => (root.current ? feed.watch(root.current) : undefined),
        [feed],
    );

    const [mode, setMode] = useState<Mode>("move");
    const [message, setMessage] = useState("");
    /** the ticket a drag in progress carries */
    const [dragging, setDragging] = useState<string>();
    /** the ticket gliding home after a refused or cancelled drag */
    const [returning, setReturning] = useState<string>();
    useEffect(() => {
        if (returning === undefined) return;
        const timer = setTimeout(() => setReturning(undefined), 400);
        return () => clearTimeout(timer);
    }, [returning]);
    /** the ticket to focus once it is mounted in its new column (a keyboard move) */
    const refocus = useRef<string | undefined>(undefined);
    // found after the render, by its `data-dnd-id`: a keyboard move to another column mounts the
    // ticket as a new element there, so the element to focus exists only once that render is done
    useLayoutEffect(() => {
        const id = refocus.current;
        if (id === undefined) return;
        refocus.current = undefined;
        root.current
            ?.querySelector<HTMLElement>(`[data-dnd-id="${id}"]`)
            ?.focus();
    });

    useDragMonitor((event) => {
        if (event.type === "drag-start") {
            feed.hold(true);
            setDragging(String(event.operation.source.id));
        } else if (event.type === "drop" || event.type === "drag-cancel") {
            feed.hold(false);
            setDragging(undefined);
        }
    });

    // the predicates read the feed's state when asked, so they never change identity (a new one
    // on every tick would be an option change for every part)
    const rules = useMemo(() => {
        const takes = {} as Record<AgentId, (source: SortSource) => boolean>;
        const refuses = {} as Record<AgentId, (source: DragSource) => boolean>;
        for (const agent of AGENT_IDS) {
            takes[agent] = (source) =>
                verdictOf(feed.state, agent, source.id) === "ok";
            refuses[agent] = (source) =>
                columnOf(feed.state, source.id) !== agent &&
                verdictOf(feed.state, agent, source.id) !== "ok";
        }
        // the resolved column takes tickets an agent holds, never one still in triage
        const unworked = (source: DragSource) =>
            columnOf(feed.state, source.id) === "triage";
        const swaps = new Map<string, (source: SwapSource) => boolean>();
        const swapsWith = (id: string) => {
            let rule = swaps.get(id);
            if (!rule) {
                rule = (source) => canSwap(feed.state, source.id, id);
                swaps.set(id, rule);
            }
            return rule;
        };
        return { takes, refuses, unworked, swapsWith };
    }, [feed]);

    const nameOf = (column: string) =>
        COLUMN_NAMES[column as ColumnId] ?? column;

    function sortEnd(event: SortEndEvent) {
        const id = String(event.id);
        const home =
            event.to.group === event.from.group &&
            event.to.index === event.from.index;
        if (event.canceled || home) {
            setReturning(id);
            if (event.canceled) setMessage(`Cancelled: ${id} is back.`);
            return;
        }
        if (event.input === "keyboard" && event.to.group !== event.from.group)
            refocus.current = id;
        feed.move((board) => moveBetween(board, event));
        setMessage(
            event.to.group === event.from.group
                ? `${id} is now number ${event.to.index + 1} in ${nameOf(event.to.group)}.`
                : event.to.group === "resolved"
                  ? `${id} resolved.`
                  : event.to.group === "triage"
                    ? `${id} is back in triage.`
                    : `${id} assigned to ${nameOf(event.to.group)}.`,
        );
    }

    function refused(agent: string, source: string | number) {
        const verdict = verdictOf(feed.state, agent as AgentId, source);
        setMessage(
            verdict === "full"
                ? `${nameOf(agent)} is full: ${source} stays where it was.`
                : `${nameOf(agent)} does not take ${source}: not their skill.`,
        );
    }

    function swapped(event: SwapEvent) {
        const id = String(event.source.id);
        if (!event.target || event.canceled) {
            setReturning(id);
            return;
        }
        feed.move((board) => swapBetween(board, event));
        setMessage(
            `${id} and ${event.target.id} swapped between ${nameOf(event.source.group)} and ${nameOf(event.target.group)}.`,
        );
    }

    const totals = totalsOf(state);
    const why = (agent: AgentId): Exclude<Verdict, "ok"> | undefined => {
        if (!dragging || mode !== "move") return undefined;
        if (columnOf(state, dragging) === agent) return undefined;
        const verdict = verdictOf(state, agent, dragging);
        return verdict === "ok" ? undefined : verdict;
    };

    /** a ticket of a sortable column */
    const sortable = (column: ColumnId, id: string, index: number) => {
        const ticket = state.tickets[id];
        if (!ticket) return null;
        const working = column !== "triage" && index === 0;
        return (
            <Sortable
                key={id}
                id={id}
                index={index}
                group={column}
                accepts={
                    column === "triage"
                        ? AGENT_IDS
                        : rules.takes[column as AgentId]
                }
                describedBy={HELP_ID}
                onSortEnd={sortEnd}
            >
                <TicketCard
                    ticket={ticket}
                    state={state}
                    working={working}
                    returning={returning === id}
                />
            </Sortable>
        );
    };

    return (
        <div ref={root} className={styles.frame}>
            <header className={styles.header}>
                <div className={styles.heading}>
                    <h3 className={styles.title}>Support dispatch</h3>
                    <span
                        role="timer"
                        aria-label="Shift clock"
                        className={styles.clock}
                    >
                        {formatClock(state.clock)}
                    </span>
                </div>
                <dl aria-label="Queue figures" className={styles.figures}>
                    <div className={styles.figure}>
                        <dt className={styles.figureName}>Queue</dt>
                        <dd
                            data-testid="queue-size"
                            className={styles.figureValue}
                        >
                            {totals.queued}
                        </dd>
                    </div>
                    <div className={styles.figure}>
                        <dt className={styles.figureName}>Avg wait</dt>
                        <dd
                            data-testid="average-wait"
                            className={styles.figureValue}
                        >
                            {formatDuration(totals.averageWait)}
                        </dd>
                    </div>
                    <div className={styles.figure}>
                        <dt className={styles.figureName}>Overdue</dt>
                        <dd
                            data-testid="overdue"
                            data-alert={totals.overdue > 0 ? "" : undefined}
                            className={styles.figureValue}
                        >
                            {totals.overdue}
                        </dd>
                    </div>
                    <div className={styles.figure}>
                        <dt className={styles.figureName}>Resolved</dt>
                        <dd
                            data-testid="resolved"
                            className={styles.figureValue}
                        >
                            {state.resolved}
                        </dd>
                    </div>
                </dl>
                {/* the queue over the last ticks, drawn by hand: no chart library */}
                <svg
                    aria-hidden="true"
                    viewBox="0 0 120 28"
                    preserveAspectRatio="none"
                    className={styles.sparkline}
                >
                    <polyline
                        points={sparkline(state.queue, 120, 28)}
                        className={styles.sparklineLine}
                    />
                </svg>
                <div className={styles.controls}>
                    <fieldset className={styles.modes}>
                        <legend className={styles.legend}>Drag mode</legend>
                        {(["move", "swap"] as const).map((each) => (
                            <Clickable.Button
                                key={each}
                                variant="ghost"
                                size="sm"
                                aria-pressed={mode === each}
                                className={styles.mode}
                                onClick={() => setMode(each)}
                            >
                                {each === "move" ? "Move" : "Swap"}
                            </Clickable.Button>
                        ))}
                    </fieldset>
                    <Clickable.Button
                        variant="outline"
                        size="sm"
                        shape="square"
                        aria-label={
                            state.playing ? "Pause the feed" : "Play the feed"
                        }
                        className={styles.play}
                        onClick={() =>
                            state.playing ? feed.pause() : feed.play()
                        }
                    >
                        {state.playing ? (
                            <Pause aria-hidden="true" />
                        ) : (
                            <Play aria-hidden="true" />
                        )}
                    </Clickable.Button>
                </div>
            </header>
            <div className={styles.notes}>
                <p id={HELP_ID} className={styles.help}>
                    {mode === "move"
                        ? "Drag a ticket to an agent with its skill and room, or sort a queue. Keyboard: Space picks up, arrows move, Space drops."
                        : "Drag an agent's ticket onto another agent's to swap them, when each has the other's skill."}
                </p>
                <p role="status" aria-live="polite" className={styles.status}>
                    {state.held > 0 && dragging
                        ? `${state.held} new ${state.held === 1 ? "ticket waits" : "tickets wait"} for your drop.`
                        : message}
                </p>
            </div>
            <div className={styles.board}>
                <section aria-label="Triage" className={styles.column}>
                    <h4 className={styles.columnTitle}>
                        Triage
                        <span className={styles.count}>
                            {state.board.triage.length}
                        </span>
                    </h4>
                    {mode === "move" ? (
                        <SortableGroup group="triage" accepts={AGENT_IDS}>
                            <ul
                                aria-label="Triage queue"
                                className={styles.list}
                            >
                                {state.board.triage.map((id, index) =>
                                    sortable("triage", id, index),
                                )}
                            </ul>
                        </SortableGroup>
                    ) : (
                        <ul aria-label="Triage queue" className={styles.list}>
                            {state.board.triage.map((id) => {
                                const ticket = state.tickets[id];
                                return ticket ? (
                                    <TicketCard
                                        key={id}
                                        ticket={ticket}
                                        state={state}
                                    />
                                ) : null;
                            })}
                        </ul>
                    )}
                </section>
                {AGENTS.map((agent) => {
                    const queue = state.board[agent.id];
                    const full = queue.length >= agent.capacity;
                    const reason = why(agent.id);
                    return (
                        <Droppable
                            key={agent.id}
                            id={`${agent.id}-zone`}
                            accepts={rules.refuses[agent.id]}
                            disabled={mode !== "move"}
                            onDrop={(event) =>
                                refused(agent.id, event.operation.source.id)
                            }
                        >
                            <section
                                aria-label={agent.name}
                                data-full={full ? "" : undefined}
                                data-refuses={reason}
                                className={styles.agentColumn}
                            >
                                <header className={styles.agentHeader}>
                                    <Avatar.Root className={styles.avatar}>
                                        <Avatar.Fallback>
                                            {agent.name.slice(0, 2)}
                                        </Avatar.Fallback>
                                    </Avatar.Root>
                                    <div className={styles.agentText}>
                                        <div className={styles.agentNameRow}>
                                            <h4 className={styles.agentName}>
                                                {agent.name}
                                            </h4>
                                            <span
                                                aria-hidden="true"
                                                className={styles.reason}
                                            >
                                                {REASONS[reason ?? "full"]}
                                            </span>
                                        </div>
                                        <span className={styles.agentSkills}>
                                            {agent.skills
                                                .map(
                                                    (skill) =>
                                                        SKILL_NAMES[skill],
                                                )
                                                .join(" · ")}
                                        </span>
                                    </div>
                                    <span className={styles.load}>
                                        {/* the capacity, one slot a ticket */}
                                        <svg
                                            role="img"
                                            aria-label={`${queue.length} of ${agent.capacity} tickets`}
                                            viewBox={`0 0 ${agent.capacity * 8} 8`}
                                            className={styles.meter}
                                        >
                                            {Array.from(
                                                { length: agent.capacity },
                                                (_, slot) => (
                                                    <rect
                                                        // biome-ignore lint/suspicious/noArrayIndexKey: a slot is its index
                                                        key={slot}
                                                        x={slot * 8}
                                                        width="6"
                                                        height="8"
                                                        rx="1.5"
                                                        className={styles.slot(
                                                            slot < queue.length,
                                                        )}
                                                    />
                                                ),
                                            )}
                                        </svg>
                                        <span aria-hidden="true">
                                            {queue.length}/{agent.capacity}
                                        </span>
                                    </span>
                                </header>
                                {mode === "move" ? (
                                    <SortableGroup
                                        group={agent.id}
                                        accepts={rules.takes[agent.id]}
                                    >
                                        <ul
                                            aria-label={`${agent.name}'s queue`}
                                            className={styles.list}
                                        >
                                            {queue.map((id, index) =>
                                                sortable(agent.id, id, index),
                                            )}
                                        </ul>
                                    </SortableGroup>
                                ) : (
                                    <ul
                                        aria-label={`${agent.name}'s queue`}
                                        className={styles.list}
                                    >
                                        {queue.map((id, index) => {
                                            const ticket = state.tickets[id];
                                            if (!ticket) return null;
                                            return (
                                                <Swappable
                                                    key={id}
                                                    id={id}
                                                    index={index}
                                                    group={agent.id}
                                                    accepts={rules.swapsWith(
                                                        id,
                                                    )}
                                                    describedBy={HELP_ID}
                                                    onSwap={swapped}
                                                >
                                                    <TicketCard
                                                        ticket={ticket}
                                                        state={state}
                                                        working={index === 0}
                                                        returning={
                                                            returning === id
                                                        }
                                                    />
                                                </Swappable>
                                            );
                                        })}
                                    </ul>
                                )}
                            </section>
                        </Droppable>
                    );
                })}
                <Droppable
                    id="resolved-zone"
                    accepts={rules.unworked}
                    disabled={mode !== "move"}
                    onDrop={(event) =>
                        setMessage(
                            `${event.operation.source.id} needs an agent before it is resolved.`,
                        )
                    }
                >
                    <section aria-label="Resolved" className={styles.column}>
                        <h4 className={styles.columnTitle}>
                            Resolved
                            <span className={styles.count}>
                                {state.resolved}
                            </span>
                        </h4>
                        <SortableGroup
                            group="resolved"
                            accepts={AGENT_IDS}
                            disabled={mode !== "move"}
                        >
                            <ul data-testid="resolved" className={styles.list}>
                                {state.board.resolved.map((id) => {
                                    const ticket = state.tickets[id];
                                    return ticket ? (
                                        <TicketCard
                                            key={id}
                                            ticket={ticket}
                                            state={state}
                                            resolved
                                        />
                                    ) : null;
                                })}
                            </ul>
                        </SortableGroup>
                    </section>
                </Droppable>
            </div>
        </div>
    );
}
