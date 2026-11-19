// The page-wide observer (D4): every drag of a document (or of an explicit space), optionally of
// one scope, for announcements and app-level reactions. The only "global" API, and optional.
import type { DragListener, DragSpace } from "@fragiola/dnd";
import { type MaybeRefOrGetter, toValue, watchEffect } from "vue";
import { useDragSpace } from "./use-drag-space";

/** Options of {@link useDragMonitor}. */
export interface UseDragMonitorOptions {
    /** only the events of this scope */
    readonly scope?: string | undefined;
    /** an explicit space from `createDragSpace` */
    readonly space?: DragSpace | undefined;
    /** this document's drags (default: the page's) */
    readonly document?: Document | undefined;
}

/**
 * Calls `listener` with every drag event of the page (or of `options.space`), optionally of one
 * scope, from the mount until the component (or the scope) ends. Pass a getter or a ref for
 * options that change.
 */
export function useDragMonitor(
    listener: DragListener,
    options: MaybeRefOrGetter<UseDragMonitorOptions> = {},
): void {
    const space = useDragSpace(() => {
        const { space: given, document: doc } = toValue(options);
        return { space: given, document: doc };
    });
    watchEffect(
        (onCleanup) => {
            const current = space.value;
            if (!current) return;
            onCleanup(
                current.subscribe(listener, { scope: toValue(options).scope }),
            );
            // from the mount on: a drag right after it is seen
        },
        { flush: "sync" },
    );
}
