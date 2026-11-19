// From Dockable (fragiola/dockable, packages/vue/src/utils/render.ts), same author and licence.
//
// A part's element in Vue: a function template ref, which Vue calls on every patch (and with
// `null` when the element goes), reduced to one `attach` per element.

/** The element behind a template ref: the element itself, or a component's root element. */
export function toElement(value: unknown): HTMLElement | null {
    if (value === null || typeof value !== "object") return null;
    // `nodeType`, not `instanceof HTMLElement`: an element of a popout belongs to another window
    if ((value as { nodeType?: unknown }).nodeType === 1)
        return value as HTMLElement;
    const root = (value as { $el?: unknown }).$el;
    return root !== null &&
        typeof root === "object" &&
        (root as { nodeType?: unknown }).nodeType === 1
        ? (root as HTMLElement)
        : null;
}

/** A function template ref, as a part puts it on its element. */
export type ElementRef = (value: unknown) => void;

/**
 * A function template ref that calls `attach` with the element once it is there, and the cleanup
 * it returns when the element goes or another one takes its place. Vue calls a function ref on
 * every patch; only a change reaches `attach`.
 */
export function elementRef(
    attach: (element: HTMLElement) => (() => void) | undefined,
): ElementRef {
    let current: HTMLElement | null = null;
    let cleanup: (() => void) | undefined;
    return (value) => {
        const element = toElement(value);
        if (element === current) return;
        cleanup?.();
        cleanup = undefined;
        current = element;
        if (element) cleanup = attach(element);
    };
}
