// What every directive of the adapter shares: its host element, the boolean inputs and the
// options it passes on.
//
// The development checks are written `(typeof ngDevMode === "undefined" || ngDevMode)`, inline, as
// Angular writes its own: an app's production build (the Angular CLI and the Analog Vite plugin
// alike) defines `ngDevMode` as `false`, and its minifier drops the checks and their messages.
import { ElementRef, inject } from "@angular/core";

/**
 * The host element of the directive being created. In development, a directive on an
 * `<ng-container>` or an `<ng-template>` (a comment, no element) throws: dnd acts on one element.
 */
export function injectHost(part: string): HTMLElement {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    if ((typeof ngDevMode === "undefined" || ngDevMode) && host.nodeType !== 1)
        throw new Error(
            `[${part}] goes on an element (a DOM element, or a component's host element), not on an <ng-container> or an <ng-template>: it has no element to act on.`,
        );
    return host;
}

/**
 * A boolean input that keeps `undefined` (the core's default): a bare attribute
 * (`<li dndDraggable="a" disabled>`) is `true`, `"false"` is `false`.
 */
export function optionalBoolean(value: unknown): boolean | undefined {
    if (value === undefined || value === null) return undefined;
    return value === "" || (value !== "false" && Boolean(value));
}

/** `options` without its undefined keys, so the core's default applies to them. */
export function defined<Options extends object>(options: Options): Options {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(options))
        if (value !== undefined) result[key] = value;
    return result as Options;
}
