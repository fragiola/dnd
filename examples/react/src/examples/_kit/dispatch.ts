// Demo data and app policy for the support dispatch: tickets that arrive in a triage queue, each
// with a priority and an SLA that counts down, agents who work the first ticket of their queue and
// resolve it, and the rules of who may take what. Seeded, so the same seed gives the same shift.
// The drag and drop only says what was dropped where; moving tickets is the app's (D14). No dnd and
// no styles here: the same file runs in every framework's examples.

/** What a ticket is about, and what an agent knows how to handle. */
export type Skill = "billing" | "technical" | "account";

/** 1 is the most urgent. */
export type Priority = 1 | 2 | 3;

/** A support ticket. `created` and `due` are on the shift's clock, in seconds. */
export interface Ticket {
    readonly id: string;
    readonly subject: string;
    readonly customer: string;
    readonly skill: Skill;
    readonly priority: Priority;
    readonly created: number;
    readonly due: number;
    /** how much of it its agent has done, 0 to 1 */
    readonly progress: number;
}

export type AgentId = "ava" | "noor" | "kenji";

/** An agent: the skills they take tickets of, and how many tickets they hold at most. */
export interface Agent {
    readonly id: AgentId;
    readonly name: string;
    readonly skills: readonly Skill[];
    readonly capacity: number;
    /** the share of a ticket done per tick */
    readonly speed: number;
}

export const AGENTS: readonly Agent[] = [
    {
        id: "ava",
        name: "Ava",
        skills: ["billing", "account"],
        capacity: 3,
        speed: 0.05,
    },
    {
        id: "noor",
        name: "Noor",
        skills: ["technical"],
        capacity: 3,
        speed: 0.04,
    },
    {
        id: "kenji",
        name: "Kenji",
        skills: ["technical", "account"],
        capacity: 2,
        speed: 0.06,
    },
];

export const AGENT_IDS: readonly AgentId[] = AGENTS.map((agent) => agent.id);

/** The board's columns: the queue, one per agent, and the last resolved tickets. */
export type ColumnId = "triage" | AgentId | "resolved";

/** Which ticket ids each column holds, in order (the resolved ones newest first). */
export type DispatchBoard = Readonly<Record<ColumnId, readonly string[]>>;

/** The shift at one moment: a new object on every change. */
export interface DispatchState {
    /** the shift's clock, in seconds since midnight */
    readonly clock: number;
    readonly board: DispatchBoard;
    readonly tickets: Readonly<Record<string, Ticket>>;
    /** the queue's size on the last ticks, oldest first (the sparkline) */
    readonly queue: readonly number[];
    /** how many tickets were resolved this shift */
    readonly resolved: number;
    /** arrivals waiting for the drag in progress to end */
    readonly held: number;
    /** whether the feed is meant to run (the Pause/Play button) */
    readonly playing: boolean;
}

/** How far the shift's clock moves on a tick, in seconds. */
export const TICK_SECONDS = 15;
/** How often the feed ticks, in milliseconds: a human rate. */
export const TICK_MS = 500;
/** How many queue sizes the sparkline keeps. */
export const QUEUE_HISTORY = 40;
/** The queue never grows past this: further callers wait outside. */
export const TRIAGE_LIMIT = 8;
/** How many resolved tickets the board keeps showing. */
export const RESOLVED_SHOWN = 4;

/** An SLA, in seconds, by priority. */
const SLA: Record<Priority, number> = { 1: 15 * 60, 2: 30 * 60, 3: 45 * 60 };

export const SKILL_NAMES: Record<Skill, string> = {
    billing: "Billing",
    technical: "Technical",
    account: "Account",
};

const SUBJECTS: Record<Skill, readonly string[]> = {
    billing: [
        "Charged twice this month",
        "Invoice shows the old address",
        "Refund still pending",
        "VAT number rejected",
        "Card declined on renewal",
        "Upgrade billed in full",
    ],
    technical: [
        "Export stalls at 99%",
        "Webhook retries flood the log",
        "Login loop after SSO change",
        "Search misses new records",
        "Upload fails over 20 MB",
        "Dark mode resets on reload",
    ],
    account: [
        "Add a second admin",
        "Transfer workspace ownership",
        "Rename the workspace",
        "Merge two accounts",
        "Recover a deleted user",
        "Change the account email",
    ],
};

const CUSTOMERS = [
    "Northwind",
    "Bluebird Labs",
    "Kestrel & Co",
    "Orchard Health",
    "Pinecone Studio",
    "Lumen Freight",
    "Harbor Books",
    "Quartz Legal",
];

/** A seeded random source in [0, 1) (mulberry32): the same seed, the same numbers. */
export function randomSource(seed: number): () => number {
    let state = seed >>> 0;
    return () => {
        state = (state + 0x6d2b79f5) >>> 0;
        let x = state;
        x = Math.imul(x ^ (x >>> 15), x | 1);
        x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
        return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
}

function pick<T>(items: readonly T[], random: () => number): T {
    return items[Math.floor(random() * items.length)] as T;
}

/** The shift starts at 9:00. */
const START_CLOCK = 9 * 3600;

/** A ticket of the opening board: created `age` seconds before the shift's start. */
function opening(
    id: number,
    skill: Skill,
    priority: Priority,
    subject: string,
    customer: string,
    age: number,
    progress = 0,
): Ticket {
    const created = START_CLOCK - age;
    return {
        id: `T-${id}`,
        subject,
        customer,
        skill,
        priority,
        created,
        due: created + SLA[priority],
        progress,
    };
}

/** The board the shift opens with: the same every time, so a test can name its tickets. */
const OPENING: readonly (readonly [ColumnId, Ticket])[] = [
    [
        "resolved",
        opening(
            1033,
            "billing",
            3,
            "Receipt in the wrong currency",
            "Harbor Books",
            2400,
            1,
        ),
    ],
    [
        "resolved",
        opening(
            1034,
            "account",
            2,
            "Reset two-factor",
            "Quartz Legal",
            1800,
            1,
        ),
    ],
    [
        "noor",
        opening(
            1035,
            "technical",
            1,
            "Webhook retries flood the log",
            "Lumen Freight",
            600,
            0.35,
        ),
    ],
    [
        "ava",
        opening(
            1036,
            "billing",
            2,
            "Refund to an expired card",
            "Orchard Health",
            900,
            0.2,
        ),
    ],
    [
        "noor",
        opening(
            1037,
            "technical",
            2,
            "Dark mode resets on reload",
            "Pinecone Studio",
            840,
        ),
    ],
    [
        "ava",
        opening(
            1038,
            "account",
            3,
            "Rename the workspace",
            "Kestrel & Co",
            780,
        ),
    ],
    [
        "noor",
        opening(
            1039,
            "technical",
            3,
            "CSV dates off by one",
            "Bluebird Labs",
            720,
        ),
    ],
    [
        "kenji",
        opening(
            1040,
            "account",
            2,
            "Transfer workspace ownership",
            "Northwind",
            660,
            0.5,
        ),
    ],
    [
        "triage",
        opening(
            1041,
            "billing",
            1,
            "Charged twice this month",
            "Northwind",
            300,
        ),
    ],
    [
        "triage",
        opening(
            1042,
            "technical",
            2,
            "Export stalls at 99%",
            "Orchard Health",
            240,
        ),
    ],
    [
        "triage",
        opening(1043, "account", 3, "Add a second admin", "Lumen Freight", 180),
    ],
    [
        "triage",
        opening(
            1044,
            "technical",
            1,
            "Login loop after SSO change",
            "Quartz Legal",
            60,
        ),
    ],
];

/** The shift as it opens. */
export function openingState(): DispatchState {
    const board: Record<ColumnId, string[]> = {
        triage: [],
        ava: [],
        noor: [],
        kenji: [],
        resolved: [],
    };
    const tickets: Record<string, Ticket> = {};
    for (const [column, ticket] of OPENING) {
        board[column].push(ticket.id);
        tickets[ticket.id] = ticket;
    }
    // queues read oldest first, the resolved column newest first
    board.resolved.reverse();
    return {
        clock: START_CLOCK,
        board,
        tickets,
        queue: Array.from({ length: QUEUE_HISTORY }, () => board.triage.length),
        resolved: board.resolved.length,
        held: 0,
        playing: false,
    };
}

/** An agent by id. */
export function agentOf(id: string): Agent | undefined {
    return AGENTS.find((agent) => agent.id === id);
}

/** The column a ticket is in, if it is on the board. */
export function columnOf(
    state: DispatchState,
    ticketId: string | number,
): ColumnId | undefined {
    const id = String(ticketId);
    return (Object.keys(state.board) as ColumnId[]).find((column) =>
        state.board[column].includes(id),
    );
}

/** Why an agent takes a ticket or not: `"ok"`, they are at capacity, or it is not their skill. */
export type Verdict = "ok" | "full" | "skill";

/** Whether `agent` takes ticket `ticketId` from another column (their own is always fine). */
export function verdictOf(
    state: DispatchState,
    agent: AgentId,
    ticketId: string | number,
): Verdict {
    const ticket = state.tickets[String(ticketId)];
    const who = agentOf(agent);
    if (!ticket || !who) return "skill";
    if (!who.skills.includes(ticket.skill)) return "skill";
    if (state.board[agent].length >= who.capacity) return "full";
    return "ok";
}

/**
 * Whether two tickets held by agents may change hands: each agent must have the other's skill
 * (a swap never changes how many tickets an agent holds, so capacity is no matter).
 */
export function canSwap(
    state: DispatchState,
    a: string | number,
    b: string | number,
): boolean {
    const ticketA = state.tickets[String(a)];
    const ticketB = state.tickets[String(b)];
    const agentA = agentOf(columnOf(state, a) ?? "");
    const agentB = agentOf(columnOf(state, b) ?? "");
    if (!ticketA || !ticketB || !agentA || !agentB) return false;
    return (
        agentB.skills.includes(ticketA.skill) &&
        agentA.skills.includes(ticketB.skill)
    );
}

/** Seconds left on a ticket's SLA (negative once it is overdue). */
export function slaLeft(state: DispatchState, ticket: Ticket): number {
    return ticket.due - state.clock;
}

/** The shift's figures over the queue: its size, the average wait, the overdue tickets. */
export interface DispatchTotals {
    readonly queued: number;
    readonly averageWait: number;
    readonly overdue: number;
}

export function totalsOf(state: DispatchState): DispatchTotals {
    const queued = state.board.triage.length;
    let wait = 0;
    let overdue = 0;
    for (const column of ["triage", ...AGENT_IDS] as const) {
        for (const id of state.board[column]) {
            const ticket = state.tickets[id];
            if (!ticket) continue;
            if (column === "triage") wait += state.clock - ticket.created;
            if (slaLeft(state, ticket) < 0) overdue++;
        }
    }
    return {
        queued,
        averageWait: queued === 0 ? 0 : Math.round(wait / queued),
        overdue,
    };
}

/** The board with the resolved column trimmed, and the tickets no column shows dropped. */
function settle(
    state: DispatchState,
    board: DispatchBoard,
    resolvedNow: number,
): DispatchState {
    const resolved = board.resolved.slice(0, RESOLVED_SHOWN);
    const next = { ...board, resolved };
    const shown = new Set(Object.values(next).flat());
    const tickets: Record<string, Ticket> = {};
    for (const id of shown) {
        const ticket = state.tickets[id];
        if (ticket) tickets[id] = ticket;
    }
    return {
        ...state,
        board: next,
        tickets,
        resolved: state.resolved + resolvedNow,
    };
}

/** How many ids `after` holds that `before` did not. */
function added(before: readonly string[], after: readonly string[]): number {
    return after.filter((id) => !before.includes(id)).length;
}

/** The state with the user's move (or swap) applied to its board. */
export function applyMove(
    state: DispatchState,
    change: (board: DispatchBoard) => DispatchBoard,
): DispatchState {
    const board = change(state.board);
    if (board === state.board) return state;
    return settle(state, board, added(state.board.resolved, board.resolved));
}

/** What a tick may change: with `hold`, a drag runs, and nothing moves between columns. */
export interface TickOptions {
    readonly hold: boolean;
}

/** The inside of the feed: the shift a tick later. `memory` keeps what the next tick needs. */
export interface TickMemory {
    /** ticks until the next caller */
    arrivalIn: number;
    /** the next ticket's number */
    nextId: number;
    /** ticks each agent has been without a ticket */
    idle: Record<AgentId, number>;
}

export function tick(
    state: DispatchState,
    memory: TickMemory,
    random: () => number,
    options: TickOptions,
): DispatchState {
    const clock = state.clock + TICK_SECONDS;
    const tickets: Record<string, Ticket> = { ...state.tickets };
    const board: Record<ColumnId, string[]> = {
        triage: [...state.board.triage],
        ava: [...state.board.ava],
        noor: [...state.board.noor],
        kenji: [...state.board.kenji],
        resolved: [...state.board.resolved],
    };
    let resolvedNow = 0;
    let held = state.held;

    // each agent works the first ticket of their queue; a finished one waits for the drag to end
    for (const agent of AGENTS) {
        const first = board[agent.id][0];
        const ticket = first ? tickets[first] : undefined;
        if (!ticket) continue;
        const progress = Math.min(1, ticket.progress + agent.speed);
        tickets[ticket.id] = { ...ticket, progress };
        if (progress >= 1 && !options.hold) {
            board[agent.id].shift();
            board.resolved.unshift(ticket.id);
            resolvedNow++;
        }
    }

    // a caller arrives now and then; during a drag it waits, and comes in after it, one a tick
    memory.arrivalIn--;
    if (memory.arrivalIn <= 0) {
        held++;
        memory.arrivalIn = 5 + Math.floor(random() * 8);
    }
    if (held > 0 && !options.hold) {
        held--;
        if (board.triage.length < TRIAGE_LIMIT) {
            const skill = pick(
                ["billing", "technical", "account"] as const,
                random,
            );
            const roll = random();
            const priority: Priority = roll < 0.2 ? 1 : roll < 0.65 ? 2 : 3;
            const ticket: Ticket = {
                id: `T-${memory.nextId++}`,
                subject: pick(SUBJECTS[skill], random),
                customer: pick(CUSTOMERS, random),
                skill,
                priority,
                created: clock,
                due: clock + SLA[priority],
                progress: 0,
            };
            tickets[ticket.id] = ticket;
            board.triage.push(ticket.id);
        }
    }

    // an agent left without work for a while takes the most urgent queued ticket they can
    for (const agent of AGENTS) {
        memory.idle[agent.id] =
            board[agent.id].length === 0 ? memory.idle[agent.id] + 1 : 0;
        if (options.hold || memory.idle[agent.id] < 6) continue;
        const next = board.triage
            .map((id) => tickets[id])
            .filter(
                (ticket): ticket is Ticket =>
                    !!ticket && agent.skills.includes(ticket.skill),
            )
            .sort((a, b) => a.priority - b.priority || a.due - b.due)[0];
        if (!next) continue;
        board.triage = board.triage.filter((id) => id !== next.id);
        board[agent.id].push(next.id);
        memory.idle[agent.id] = 0;
    }

    const queue = [...state.queue.slice(1), board.triage.length];
    return settle(
        { ...state, clock, tickets, queue, held },
        board,
        resolvedNow,
    );
}

/** The live feed of a shift: the state, a timer that ticks it, and the user's moves. */
export interface DispatchFeed {
    /** the shift now (a new object on every change) */
    readonly state: DispatchState;
    play(): void;
    pause(): void;
    /** a drag started (true) or ended (false): until it ends, nothing moves between columns */
    hold(on: boolean): void;
    /** applies the user's move to the board */
    move(change: (board: DispatchBoard) => DispatchBoard): void;
    /** one tick now, playing or not */
    step(): void;
    /** calls `listener` on every change; returns the unsubscribe */
    subscribe(listener: () => void): () => void;
    /**
     * Runs the feed while `element` is shown: it starts playing (paused under
     * `prefers-reduced-motion: reduce`), and stops while the document is hidden or the element is
     * off screen. Returns what stops it all, for the unmount.
     */
    watch(element: Element): () => void;
}

export function createDispatchFeed(seed = 7): DispatchFeed {
    const random = randomSource(seed);
    const memory: TickMemory = {
        arrivalIn: 8,
        nextId: 1045,
        idle: { ava: 0, noor: 0, kenji: 0 },
    };
    const listeners = new Set<() => void>();
    let state = openingState();
    let holding = false;
    let shown = true;
    let view: (Window & typeof globalThis) | null = null;
    let timer: number | undefined;

    function set(next: DispatchState) {
        if (next === state) return;
        state = next;
        for (const listener of listeners) listener();
    }

    function step() {
        set(tick(state, memory, random, { hold: holding }));
    }

    /** the timer runs only while playing, watched and shown */
    function sync() {
        const run = state.playing && shown && view !== null;
        if (run && timer === undefined) {
            timer = view?.setInterval(step, TICK_MS);
        } else if (!run && timer !== undefined) {
            view?.clearInterval(timer);
            timer = undefined;
        }
    }

    return {
        get state() {
            return state;
        },
        play() {
            set({ ...state, playing: true });
            sync();
        },
        pause() {
            set({ ...state, playing: false });
            sync();
        },
        hold(on) {
            holding = on;
        },
        move(change) {
            set(applyMove(state, change));
        },
        step,
        subscribe(listener) {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
        watch(element) {
            const document = element.ownerDocument;
            view = document.defaultView;
            if (!view) return () => {};
            let onScreen = true;
            const update = () => {
                shown = onScreen && document.visibilityState !== "hidden";
                sync();
            };
            const observer =
                "IntersectionObserver" in view
                    ? new view.IntersectionObserver((entries) => {
                          onScreen = entries.some(
                              (entry) => entry.isIntersecting,
                          );
                          update();
                      })
                    : undefined;
            observer?.observe(element);
            document.addEventListener("visibilitychange", update);
            const reduced = view.matchMedia(
                "(prefers-reduced-motion: reduce)",
            ).matches;
            set({ ...state, playing: !reduced });
            update();
            return () => {
                observer?.disconnect();
                document.removeEventListener("visibilitychange", update);
                if (timer !== undefined) view?.clearInterval(timer);
                timer = undefined;
                view = null;
            };
        },
    };
}

/** A time of day on the shift's clock, `09:15:30`. */
export function formatClock(seconds: number): string {
    const day = ((seconds % 86400) + 86400) % 86400;
    const parts = [
        Math.floor(day / 3600),
        Math.floor((day % 3600) / 60),
        day % 60,
    ];
    return parts.map((part) => String(part).padStart(2, "0")).join(":");
}

/** A duration, `12:30` (minutes and seconds; hours when it needs them, `1:02:30`). */
export function formatDuration(seconds: number): string {
    const total = Math.abs(Math.round(seconds));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const rest = String(total % 60).padStart(2, "0");
    return hours > 0
        ? `${hours}:${String(minutes).padStart(2, "0")}:${rest}`
        : `${minutes}:${rest}`;
}

/** What a ticket's SLA says: the time left, or how late it is. */
export function formatSla(left: number): string {
    return left >= 0
        ? `${formatDuration(left)} left`
        : `${formatDuration(left)} late`;
}

/** The `points` of an SVG polyline drawing `values` in a `width` × `height` box. */
export function sparkline(
    values: readonly number[],
    width: number,
    height: number,
    max = TRIAGE_LIMIT,
): string {
    const last = Math.max(values.length - 1, 1);
    return values
        .map((value, index) => {
            const x = (index / last) * width;
            const y = height - (Math.min(value, max) / max) * (height - 2) - 1;
            return `${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(" ");
}
