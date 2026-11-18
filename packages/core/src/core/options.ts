// The option rules every adapter follows, so each re-registers on the same changes and calls the
// same callbacks: an option change is an `update` only when a compared option differs (inline
// arrays and plain objects compare by content, so a literal written in the markup is no change),
// and the callbacks the core holds read the latest ones when called (an inline callback is never
// a change). Adapter-only (`@fragiola/dnd/adapter`): an app never needs it.
import { shallowEqual } from "./slot";

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

/**
 * `values` with each of its `callbacks` replaced by one that calls the latest options' callback
 * (`latest()`) when the core calls it, or nothing when there is none then.
 */
export function withLatestCallbacks<Options extends object>(
    values: Options,
    callbacks: readonly (keyof Options)[],
    latest: () => Options,
): Options {
    const next = { ...values } as Record<PropertyKey, unknown>;
    for (const name of callbacks)
        next[name] = (event: unknown) =>
            (latest()[name] as ((event: unknown) => void) | undefined)?.(event);
    return next as Options;
}
