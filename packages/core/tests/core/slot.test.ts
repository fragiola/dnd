import { describe, expect, it, vi } from "vitest";
import { createSlot, type StateSource } from "../../src/core/slot";

/** A source whose state a test sets, notifying its listeners as a registration does. */
function source<State extends object>(initial: State) {
    let state = initial;
    const listeners = new Set<() => void>();
    return {
        getState: () => state,
        subscribe(listener: () => void) {
            listeners.add(listener);
            return () => {
                listeners.delete(listener);
            };
        },
        set(next: State) {
            state = next;
            for (const listener of [...listeners]) listener();
        },
        listeners,
    } satisfies StateSource<State> & Record<string, unknown>;
}

describe("the state slot", () => {
    it("holds the fallback while it follows nothing (before mount, on the server)", () => {
        const fallback = vi.fn(() => ({ dragging: false }));
        const slot = createSlot(fallback);
        expect(slot.getState()).toEqual({ dragging: false });
        expect(fallback).toHaveBeenCalled();
    });

    it("keeps its snapshot's identity until a field changes", () => {
        const slot = createSlot(() => ({ dragging: false, disabled: false }));
        const first = slot.getState();
        expect(slot.getState()).toBe(first);
        const followed = source({ dragging: false, disabled: false });
        slot.attach(followed);
        expect(slot.getState()).toBe(first);
        followed.set({ dragging: true, disabled: false });
        const second = slot.getState();
        expect(second).toEqual({ dragging: true, disabled: false });
        followed.set({ dragging: true, disabled: false });
        expect(slot.getState()).toBe(second);
    });

    it("follows the source attached, notifies on attach, change and detach, and falls back after", () => {
        const slot = createSlot(() => ({ over: false }));
        const listener = vi.fn();
        slot.subscribe(listener);
        const followed = source({ over: true });
        const detach = slot.attach(followed);
        expect(listener).toHaveBeenCalledTimes(1);
        expect(slot.getState()).toEqual({ over: true });
        followed.set({ over: false });
        expect(listener).toHaveBeenCalledTimes(2);
        detach();
        expect(listener).toHaveBeenCalledTimes(3);
        expect(followed.listeners.size).toBe(0);
        expect(slot.getState()).toEqual({ over: false });
    });

    it("keeps following a newer source when an older one detaches (a re-register)", () => {
        const slot = createSlot(() => ({ n: 0 }));
        const old = source({ n: 1 });
        const detachOld = slot.attach(old);
        slot.attach(source({ n: 2 }));
        detachOld();
        expect(slot.getState()).toEqual({ n: 2 });
    });

    it("stops notifying a listener once it unsubscribes", () => {
        const slot = createSlot(() => ({ n: 0 }));
        const listener = vi.fn();
        const off = slot.subscribe(listener);
        off();
        slot.attach(source({ n: 1 }));
        expect(listener).not.toHaveBeenCalled();
    });
});
