// A part's state from the core (D8): a slot that follows the registration of the moment (none
// before mount and on the server, a new one after a re-register) as one external store for
// `useSyncExternalStore`. Its snapshot keeps its identity until a field changes, so a part
// re-renders only when its own state does.
import * as React from "react";

/** Anything with the core registration's store shape. */
export interface StateSource<State> {
    getState(): State;
    subscribe(listener: () => void): () => void;
}

/** A store that follows one source at a time, with a fallback state between them. */
export interface CoreSlot<State> extends StateSource<State> {
    /** follows `source` until the returned detach */
    attach(source: StateSource<State>): () => void;
}

function shallowEqual(a: object, b: object): boolean {
    const left = a as Record<string, unknown>;
    const right = b as Record<string, unknown>;
    const keys = Object.keys(left);
    return (
        keys.length === Object.keys(right).length &&
        keys.every((key) => Object.is(left[key], right[key]))
    );
}

/** A slot whose state is `fallback()` while it follows nothing. */
export function createSlot<State extends object>(
    fallback: () => State,
): CoreSlot<State> {
    let source: StateSource<State> | undefined;
    let last: State | undefined;
    const listeners = new Set<() => void>();
    const notify = () => {
        for (const listener of [...listeners]) listener();
    };
    return {
        getState() {
            const next = source ? source.getState() : fallback();
            if (last && shallowEqual(last, next)) return last;
            last = next;
            return next;
        },
        subscribe(listener) {
            listeners.add(listener);
            return () => {
                listeners.delete(listener);
            };
        },
        attach(next) {
            source = next;
            const unsubscribe = next.subscribe(notify);
            notify();
            return () => {
                unsubscribe();
                if (source === next) source = undefined;
                notify();
            };
        },
    };
}

/** A slot's state, re-rendering on its changes only; the fallback on the server. */
export function useSlotState<State extends object>(
    slot: CoreSlot<State>,
): State {
    return React.useSyncExternalStore(
        slot.subscribe,
        slot.getState,
        slot.getState,
    );
}

/** Whether two option values are the same: identical, or arrays and plain objects shallowly so. */
function same(a: unknown, b: unknown): boolean {
    if (Object.is(a, b)) return true;
    if (Array.isArray(a) && Array.isArray(b))
        return a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
    const plain = (value: unknown): value is object =>
        typeof value === "object" &&
        value !== null &&
        Object.getPrototypeOf(value) === Object.prototype;
    return plain(a) && plain(b) && shallowEqual(a, b);
}

/** Whether any of `keys` differs between two option sets (inline objects compare by content). */
export function optionsChanged<Options extends object>(
    previous: Options,
    next: Options,
    keys: readonly (keyof Options)[],
): boolean {
    return keys.some((key) => !same(previous[key], next[key]));
}
