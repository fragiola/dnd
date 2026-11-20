import {
    afterNextRender,
    Component,
    DestroyRef,
    ElementRef,
    Injector,
    inject,
    signal,
} from "@angular/core";
import { type DragSource, injectDragMonitor } from "@fragiola/dnd-angular";
import { DndDroppable } from "@fragiola/dnd-angular/droppable";
import {
    DndSortable,
    DndSortableGroup,
    moveBetween,
    type SortEndEvent,
    type SortSource,
} from "@fragiola/dnd-angular/sortable";
import {
    DndSwappable,
    type SwapEvent,
    type SwapSource,
    swapBetween,
} from "@fragiola/dnd-angular/swappable";
import { LucidePause, LucidePlay } from "@lucide/angular";
import { ClickableButton } from "#/components/atoms/clickable";
import { AVATAR } from "#/components/ui/avatar";
import {
    AGENT_IDS,
    AGENTS,
    type Agent,
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
// refusing group is never entered, so each agent's column is also a plain `[dndDroppable]` that
// takes exactly the tickets its group refuses: over it, the sort goes back to rest and the ticket
// glides home. In Swap mode the agents' tickets are swappable instead, and two of them change
// hands when each agent has the other's skill. The feed holds its arrivals while a drag runs
// (`injectDragMonitor`), so a new ticket never moves the list under the pointer.

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

@Component({
    selector: "example-support-dispatch",
    imports: [
        AVATAR,
        ClickableButton,
        DndDroppable,
        DndSortable,
        DndSortableGroup,
        DndSwappable,
        LucidePause,
        LucidePlay,
        TicketCard,
    ],
    host: { class: "contents" },
    template: `
        @let now = state();
        @let totals = totalsOf(now);
        <div [class]="styles.frame">
            <header [class]="styles.header">
                <div [class]="styles.heading">
                    <h3 [class]="styles.title">Support dispatch</h3>
                    <span role="timer" aria-label="Shift clock" [class]="styles.clock">{{ formatClock(now.clock) }}</span>
                </div>
                <dl aria-label="Queue figures" [class]="styles.figures">
                    <div [class]="styles.figure">
                        <dt [class]="styles.figureName">Queue</dt>
                        <dd data-testid="queue-size" [class]="styles.figureValue">{{ totals.queued }}</dd>
                    </div>
                    <div [class]="styles.figure">
                        <dt [class]="styles.figureName">Avg wait</dt>
                        <dd data-testid="average-wait" [class]="styles.figureValue">{{ formatDuration(totals.averageWait) }}</dd>
                    </div>
                    <div [class]="styles.figure">
                        <dt [class]="styles.figureName">Overdue</dt>
                        <dd
                            data-testid="overdue"
                            [attr.data-alert]="totals.overdue > 0 ? '' : null"
                            [class]="styles.figureValue"
                        >{{ totals.overdue }}</dd>
                    </div>
                    <div [class]="styles.figure">
                        <dt [class]="styles.figureName">Resolved</dt>
                        <dd data-testid="resolved" [class]="styles.figureValue">{{ now.resolved }}</dd>
                    </div>
                </dl>
                <!-- the queue over the last ticks, drawn by hand: no chart library -->
                <svg aria-hidden="true" viewBox="0 0 120 28" preserveAspectRatio="none" [class]="styles.sparkline">
                    <polyline [attr.points]="sparkline(now.queue, 120, 28)" [class]="styles.sparklineLine" />
                </svg>
                <div [class]="styles.controls">
                    <fieldset [class]="styles.modes">
                        <legend [class]="styles.legend">Drag mode</legend>
                        @for (each of MODES; track each) {
                            <button
                                kitClickable
                                variant="ghost"
                                size="sm"
                                [attr.aria-pressed]="mode() === each"
                                [class]="styles.mode"
                                (click)="mode.set(each)"
                            >{{ each === "move" ? "Move" : "Swap" }}</button>
                        }
                    </fieldset>
                    <button
                        kitClickable
                        variant="outline"
                        size="sm"
                        shape="square"
                        [attr.aria-label]="now.playing ? 'Pause the feed' : 'Play the feed'"
                        [class]="styles.play"
                        (click)="now.playing ? feed.pause() : feed.play()"
                    >
                        @if (now.playing) {
                            <svg lucidePause aria-hidden="true"></svg>
                        } @else {
                            <svg lucidePlay aria-hidden="true"></svg>
                        }
                    </button>
                </div>
            </header>
            <div [class]="styles.notes">
                <p [id]="HELP_ID" [class]="styles.help">
                    {{
                        mode() === "move"
                            ? "Drag a ticket to an agent with its skill and room, or sort a queue. Keyboard: Space picks up, arrows move, Space drops."
                            : "Drag an agent's ticket onto another agent's to swap them, when each has the other's skill."
                    }}
                </p>
                <p role="status" aria-live="polite" [class]="styles.status">{{
                    now.held > 0 && dragging()
                        ? now.held + " new " + (now.held === 1 ? "ticket waits" : "tickets wait") + " for your drop."
                        : message()
                }}</p>
            </div>
            <div [class]="styles.board">
                <section aria-label="Triage" [class]="styles.column">
                    <h4 [class]="styles.columnTitle">
                        Triage
                        <span [class]="styles.count">{{ now.board.triage.length }}</span>
                    </h4>
                    @if (mode() === "move") {
                        <ul dndSortableGroup="triage" [accepts]="AGENT_IDS" aria-label="Triage queue" [class]="styles.list">
                            @for (id of now.board.triage; track id) {
                                @if (now.tickets[id]; as ticket) {
                                    <li
                                        exampleTicket
                                        [ticket]="ticket"
                                        [dispatch]="now"
                                        [returning]="returning() === id"
                                        [dndSortable]="id"
                                        [index]="$index"
                                        group="triage"
                                        [accepts]="AGENT_IDS"
                                        [describedBy]="HELP_ID"
                                        (sortEnd)="sortEnd($event)"
                                    ></li>
                                }
                            }
                        </ul>
                    } @else {
                        <ul aria-label="Triage queue" [class]="styles.list">
                            @for (id of now.board.triage; track id) {
                                @if (now.tickets[id]; as ticket) {
                                    <li exampleTicket [ticket]="ticket" [dispatch]="now"></li>
                                }
                            }
                        </ul>
                    }
                </section>
                @for (agent of AGENTS; track agent.id) {
                    @let queue = now.board[agent.id];
                    @let reason = why(agent.id);
                    <section
                        [dndDroppable]="agent.id + '-zone'"
                        [accepts]="refuses[agent.id]"
                        [disabled]="mode() !== 'move'"
                        (drop)="refused(agent.id, $event.operation.source.id)"
                        [attr.aria-label]="agent.name"
                        [attr.data-full]="queue.length >= agent.capacity ? '' : null"
                        [attr.data-refuses]="reason ?? null"
                        [class]="styles.agentColumn"
                    >
                        <header [class]="styles.agentHeader">
                            <span kitAvatar [class]="styles.avatar">
                                <span kitAvatarFallback>{{ agent.name.slice(0, 2) }}</span>
                            </span>
                            <div [class]="styles.agentText">
                                <div [class]="styles.agentNameRow">
                                    <h4 [class]="styles.agentName">{{ agent.name }}</h4>
                                    <span aria-hidden="true" [class]="styles.reason">{{ REASONS[reason ?? "full"] }}</span>
                                </div>
                                <span [class]="styles.agentSkills">{{ skillsOf(agent) }}</span>
                            </div>
                            <span [class]="styles.load">
                                <!-- the capacity, one slot a ticket -->
                                <svg
                                    role="img"
                                    [attr.aria-label]="queue.length + ' of ' + agent.capacity + ' tickets'"
                                    [attr.viewBox]="'0 0 ' + agent.capacity * 8 + ' 8'"
                                    [class]="styles.meter"
                                >
                                    @for (slot of slotsOf(agent); track slot) {
                                        <rect
                                            [attr.x]="slot * 8"
                                            width="6"
                                            height="8"
                                            rx="1.5"
                                            [class]="styles.slot(slot < queue.length)"
                                        />
                                    }
                                </svg>
                                <span aria-hidden="true">{{ queue.length }}/{{ agent.capacity }}</span>
                            </span>
                        </header>
                        @if (mode() === "move") {
                            <ul
                                [dndSortableGroup]="agent.id"
                                [accepts]="takes[agent.id]"
                                [attr.aria-label]="agent.name + &quot;'s queue&quot;"
                                [class]="styles.list"
                            >
                                @for (id of queue; track id) {
                                    @if (now.tickets[id]; as ticket) {
                                        <li
                                            exampleTicket
                                            [ticket]="ticket"
                                            [dispatch]="now"
                                            [working]="$index === 0"
                                            [returning]="returning() === id"
                                            [dndSortable]="id"
                                            [index]="$index"
                                            [group]="agent.id"
                                            [accepts]="takes[agent.id]"
                                            [describedBy]="HELP_ID"
                                            (sortEnd)="sortEnd($event)"
                                        ></li>
                                    }
                                }
                            </ul>
                        } @else {
                            <ul [attr.aria-label]="agent.name + &quot;'s queue&quot;" [class]="styles.list">
                                @for (id of queue; track id) {
                                    @if (now.tickets[id]; as ticket) {
                                        <li
                                            exampleTicket
                                            [ticket]="ticket"
                                            [dispatch]="now"
                                            [working]="$index === 0"
                                            [returning]="returning() === id"
                                            [dndSwappable]="id"
                                            [index]="$index"
                                            [group]="agent.id"
                                            [accepts]="swapsWith(id)"
                                            [describedBy]="HELP_ID"
                                            (swap)="swapped($event)"
                                        ></li>
                                    }
                                }
                            </ul>
                        }
                    </section>
                }
                <section
                    dndDroppable="resolved-zone"
                    [accepts]="unworked"
                    [disabled]="mode() !== 'move'"
                    (drop)="message.set($event.operation.source.id + ' needs an agent before it is resolved.')"
                    aria-label="Resolved"
                    [class]="styles.column"
                >
                    <h4 [class]="styles.columnTitle">
                        Resolved
                        <span [class]="styles.count">{{ now.resolved }}</span>
                    </h4>
                    <ul
                        dndSortableGroup="resolved"
                        [accepts]="AGENT_IDS"
                        [disabled]="mode() !== 'move'"
                        aria-label="Resolved tickets"
                        [class]="styles.list"
                    >
                        @for (id of now.board.resolved; track id) {
                            @if (now.tickets[id]; as ticket) {
                                <li exampleTicket [ticket]="ticket" [dispatch]="now" [resolved]="true"></li>
                            }
                        }
                    </ul>
                </section>
            </div>
        </div>
    `,
})
export default class SupportDispatch {
    protected readonly styles = styles;
    protected readonly AGENTS = AGENTS;
    protected readonly AGENT_IDS = AGENT_IDS;
    protected readonly REASONS = REASONS;
    protected readonly HELP_ID = HELP_ID;
    protected readonly MODES: readonly Mode[] = ["move", "swap"];
    protected readonly formatClock = formatClock;
    protected readonly formatDuration = formatDuration;
    protected readonly sparkline = sparkline;
    protected readonly totalsOf = totalsOf;

    protected readonly feed = createDispatchFeed();
    protected readonly state = signal(this.feed.state);
    protected readonly mode = signal<Mode>("move");
    protected readonly message = signal("");
    /** the ticket a drag in progress carries */
    protected readonly dragging = signal<string | undefined>(undefined);
    /** the ticket gliding home after a refused or cancelled drag */
    protected readonly returning = signal<string | undefined>(undefined);
    private glide: ReturnType<typeof setTimeout> | undefined;

    // the predicates read the feed's state when asked, so they never change identity (a new one
    // on every tick would be an option change for every part)
    protected readonly takes = {} as Record<
        AgentId,
        (source: SortSource) => boolean
    >;
    protected readonly refuses = {} as Record<
        AgentId,
        (source: DragSource) => boolean
    >;
    /** the resolved column takes tickets an agent holds, never one still in triage */
    protected readonly unworked = (source: DragSource) =>
        columnOf(this.feed.state, source.id) === "triage";
    private readonly swaps = new Map<string, (source: SwapSource) => boolean>();

    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
    private readonly injector = inject(Injector);

    constructor() {
        for (const agent of AGENT_IDS) {
            this.takes[agent] = (source) =>
                verdictOf(this.feed.state, agent, source.id) === "ok";
            this.refuses[agent] = (source) =>
                columnOf(this.feed.state, source.id) !== agent &&
                verdictOf(this.feed.state, agent, source.id) !== "ok";
        }
        const unsubscribe = this.feed.subscribe(() =>
            this.state.set(this.feed.state),
        );
        let unwatch: (() => void) | undefined;
        afterNextRender(() => {
            const root = this.host.nativeElement.firstElementChild;
            if (root) unwatch = this.feed.watch(root);
        });
        inject(DestroyRef).onDestroy(() => {
            unwatch?.();
            unsubscribe();
            clearTimeout(this.glide);
        });
        injectDragMonitor((event) => {
            if (event.type === "drag-start") {
                this.feed.hold(true);
                this.dragging.set(String(event.operation.source.id));
            } else if (event.type === "drop" || event.type === "drag-cancel") {
                this.feed.hold(false);
                this.dragging.set(undefined);
            }
        });
    }

    protected swapsWith(id: string): (source: SwapSource) => boolean {
        let rule = this.swaps.get(id);
        if (!rule) {
            rule = (source) => canSwap(this.feed.state, source.id, id);
            this.swaps.set(id, rule);
        }
        return rule;
    }

    protected why(agent: AgentId): Exclude<Verdict, "ok"> | undefined {
        const id = this.dragging();
        if (!id || this.mode() !== "move") return undefined;
        if (columnOf(this.state(), id) === agent) return undefined;
        const verdict = verdictOf(this.state(), agent, id);
        return verdict === "ok" ? undefined : verdict;
    }

    protected skillsOf(agent: Agent): string {
        return agent.skills.map((skill) => SKILL_NAMES[skill]).join(" · ");
    }

    protected slotsOf(agent: Agent): number[] {
        return Array.from({ length: agent.capacity }, (_, slot) => slot);
    }

    private glideHome(id: string): void {
        clearTimeout(this.glide);
        this.returning.set(id);
        this.glide = setTimeout(() => this.returning.set(undefined), 400);
    }

    private nameOf(column: string): string {
        return COLUMN_NAMES[column as ColumnId] ?? column;
    }

    protected sortEnd(event: SortEndEvent): void {
        const id = String(event.id);
        const home =
            event.to.group === event.from.group &&
            event.to.index === event.from.index;
        if (event.canceled || home) {
            this.glideHome(id);
            if (event.canceled) this.message.set(`Cancelled: ${id} is back.`);
            return;
        }
        this.feed.move((board) => moveBetween(board, event));
        this.message.set(
            event.to.group === event.from.group
                ? `${id} is now number ${event.to.index + 1} in ${this.nameOf(event.to.group)}.`
                : event.to.group === "resolved"
                  ? `${id} resolved.`
                  : event.to.group === "triage"
                    ? `${id} is back in triage.`
                    : `${id} assigned to ${this.nameOf(event.to.group)}.`,
        );
        if (event.input !== "keyboard" || event.to.group === event.from.group)
            return;
        // the ticket is a new element in its new column once rendered: give it the focus back
        afterNextRender(
            () => {
                for (const item of this.host.nativeElement.querySelectorAll<HTMLElement>(
                    'li[data-dnd-part~="sortable"]',
                ))
                    if (item.getAttribute("data-dnd-id") === id) item.focus();
            },
            { injector: this.injector },
        );
    }

    protected refused(agent: string, source: string | number): void {
        const verdict = verdictOf(this.feed.state, agent as AgentId, source);
        this.message.set(
            verdict === "full"
                ? `${this.nameOf(agent)} is full: ${source} stays where it was.`
                : `${this.nameOf(agent)} does not take ${source}: not their skill.`,
        );
    }

    protected swapped(event: SwapEvent): void {
        const id = String(event.source.id);
        if (!event.target || event.canceled) {
            this.glideHome(id);
            return;
        }
        this.feed.move((board) => swapBetween(board, event));
        this.message.set(
            `${id} and ${event.target.id} swapped between ${this.nameOf(event.source.group)} and ${this.nameOf(event.target.group)}.`,
        );
    }
}
