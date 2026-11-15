// A registration's state as an external store: a snapshot that keeps its identity until a field
// changes, so `useSyncExternalStore` re-renders only on a real change (D8).

/** A tiny external store over a flat state object. */
export interface Store<State> {
    get(): State;
    set(patch: Partial<State>): void;
    subscribe(listener: () => void): () => void;
}

/** Creates a store holding `initial`. */
export function createStore<State extends object>(
    initial: State,
): Store<State> {
    let state = initial;
    const listeners = new Set<() => void>();
    return {
        get: () => state,
        set(patch) {
            for (const key in patch) {
                if (patch[key] !== state[key]) {
                    state = { ...state, ...patch };
                    for (const listener of [...listeners]) listener();
                    return;
                }
            }
        },
        subscribe(listener) {
            listeners.add(listener);
            return () => {
                listeners.delete(listener);
            };
        },
    };
}
