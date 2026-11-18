// A part's state for an adapter (D8): a slot that follows the registration of the moment (none
// before mount and on the server, a new one after a re-register) as one external store, the
// shape React's `useSyncExternalStore`, a Vue `shallowRef` or an Angular signal reads. Its
// snapshot keeps its identity until a field changes, so a part re-renders only when its own
// state does. Adapter-only (`@fragiola/dnd/adapter`): an app never needs it.

/** Anything with the core registration's store shape. */
export interface StateSource<State> {
    getState(): State;
    subscribe(listener: () => void): () => void;
}

/** A store that follows one source at a time, with a fallback state between them. */
export interface StateSlot<State> extends StateSource<State> {
    /** follows `source` until the returned detach */
    attach(source: StateSource<State>): () => void;
}

/** Whether two objects have the same own keys, each holding the same value (`Object.is`). */
export function shallowEqual(a: object, b: object): boolean {
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
): StateSlot<State> {
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
