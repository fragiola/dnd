import { describe, expect, it } from "vitest";
import {
    applyMove,
    canSwap,
    createDispatchFeed,
    formatDuration,
    formatSla,
    openingState,
    RESOLVED_SHOWN,
    sparkline,
    TICK_SECONDS,
    totalsOf,
    verdictOf,
} from "../src/examples/_kit/dispatch";

// The support dispatch's simulation (`_kit/dispatch.ts`, the same file in every framework's app):
// seeded, so a shift replays exactly, and the rules the example's `accepts` predicates ask.

/** `count` ticks of a fresh feed, with `hold` while a drag would run. */
function run(count: number, hold = false, seed = 7) {
    const feed = createDispatchFeed(seed);
    feed.hold(hold);
    for (let n = 0; n < count; n++) feed.step();
    return feed.state;
}

describe("the dispatch feed", () => {
    it("replays the same shift from the same seed", () => {
        expect(run(60)).toEqual(run(60));
        expect(run(60, false, 8)).not.toEqual(run(60));
    });

    it("moves the clock a step a tick, and starts paused until watched", () => {
        const feed = createDispatchFeed();
        expect(feed.state.playing).toBe(false);
        const start = feed.state.clock;
        feed.step();
        expect(feed.state.clock).toBe(start + TICK_SECONDS);
    });

    it("brings in callers and resolves tickets as it runs", () => {
        const opening = openingState();
        const later = run(40);
        expect(later.resolved).toBeGreaterThan(opening.resolved);
        expect(Object.keys(later.tickets)).toContain("T-1045");
        expect(later.board.resolved.length).toBeLessThanOrEqual(RESOLVED_SHOWN);
    });

    it("moves nothing between columns while a drag runs, and lets the callers in after", () => {
        const feed = createDispatchFeed();
        const opening = feed.state.board;
        feed.hold(true);
        for (let n = 0; n < 40; n++) feed.step();
        expect(feed.state.board).toEqual(opening);
        expect(feed.state.held).toBeGreaterThan(0);
        // the time still runs: SLAs count down during a drag
        expect(feed.state.clock).toBe(openingState().clock + 40 * TICK_SECONDS);
        feed.hold(false);
        feed.step();
        expect(feed.state.board.triage).toContain("T-1045");
    });
});

describe("the dispatch rules", () => {
    const state = openingState();

    it("an agent takes a ticket of their skills while they have room", () => {
        expect(verdictOf(state, "ava", "T-1041")).toBe("ok");
        expect(verdictOf(state, "ava", "T-1042")).toBe("skill");
        expect(verdictOf(state, "noor", "T-1042")).toBe("full");
    });

    it("two agents swap tickets when each has the other's skill", () => {
        expect(canSwap(state, "T-1040", "T-1038")).toBe(true);
        expect(canSwap(state, "T-1037", "T-1036")).toBe(false);
    });

    it("counts what the user resolves, and keeps the board's resolved column short", () => {
        const next = applyMove(state, (board) => ({
            ...board,
            ava: board.ava.slice(1),
            resolved: [board.ava[0] ?? "", ...board.resolved],
        }));
        expect(next.resolved).toBe(state.resolved + 1);
        expect(next.board.resolved[0]).toBe("T-1036");
        expect(applyMove(state, (board) => board)).toBe(state);
    });

    it("sums the queue: its size, its average wait and the overdue tickets", () => {
        expect(totalsOf(state)).toEqual({
            queued: 4,
            averageWait: (300 + 240 + 180 + 60) / 4,
            overdue: 0,
        });
    });
});

describe("the dispatch's formats", () => {
    it("writes durations, SLAs and a sparkline", () => {
        expect(formatDuration(750)).toBe("12:30");
        expect(formatDuration(3750)).toBe("1:02:30");
        expect(formatSla(90)).toBe("1:30 left");
        expect(formatSla(-90)).toBe("1:30 late");
        expect(sparkline([0, 8], 100, 10, 8)).toBe("0.0,9.0 100.0,1.0");
    });
});
