// The page-wide observer (D4): every drag of a document (or of an explicit space), optionally of
// one scope, for announcements and app-level reactions. The only "global" API, and optional.
import {
    afterNextRender,
    DestroyRef,
    effect,
    inject,
    NgZone,
    untracked,
} from "@angular/core";
import type { DragListener, DragSpace } from "@fragiola/dnd";
import {
    injectDragSpace,
    injectRendered,
    type OptionsOf,
    readOptions,
} from "./inject-drag-space";

/** Options of {@link injectDragMonitor}. */
export interface InjectDragMonitorOptions {
    /** only the events of this scope */
    readonly scope?: string | undefined;
    /** an explicit space from `createDragSpace` */
    readonly space?: DragSpace | undefined;
    /** this document's drags (default: the app's) */
    readonly document?: Document | undefined;
}

/**
 * Calls `listener` with every drag event of the page (or of `options.space`), optionally of one
 * scope, from the caller's first render until it is destroyed; never on the server. Call it in an
 * injection context. The listener runs outside Angular's zone, when the app has one: a signal it
 * sets updates the views that read it.
 */
export function injectDragMonitor(
    listener: DragListener,
    options: OptionsOf<InjectDragMonitorOptions> = {},
): void {
    const read = readOptions(options);
    const rendered = injectRendered();
    const space = injectDragSpace(() => {
        const { space: given, document: doc } = read();
        return { space: given, document: doc };
    });
    const zone = inject(NgZone);
    let current:
        | { space: DragSpace; scope: string | undefined; off: () => void }
        | undefined;
    // follows the space and the scope of the moment, from the first render on
    const sync = () => {
        const next = rendered() ? space() : undefined;
        const scope = read().scope;
        if (current?.space === next && current?.scope === scope) return;
        current?.off();
        current = next && {
            space: next,
            scope,
            off: zone.runOutsideAngular(() =>
                next.subscribe((event) => listener(event), { scope }),
            ),
        };
    };
    // at once after the first render, so a drag right after it is seen
    afterNextRender({ write: () => untracked(sync) });
    effect(() => {
        rendered();
        space();
        read().scope;
        untracked(sync);
    });
    inject(DestroyRef).onDestroy(() => {
        current?.off();
        current = undefined;
    });
}
