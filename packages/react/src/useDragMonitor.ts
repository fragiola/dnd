// The page-wide observer (D4): every drag of a document (or of an explicit space), optionally of
// one scope, for announcements and app-level reactions. The only "global" API, and optional.
import type { DragListener, DragSpace } from "@fragiola/dnd";
import * as React from "react";
import { useDragSpace } from "./useDragSpace";

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
 * scope. The listener may change on every render; it is read when an event comes.
 */
export function useDragMonitor(
    listener: DragListener,
    options: UseDragMonitorOptions = {},
): void {
    const latest = React.useRef(listener);
    latest.current = listener;
    const space = useDragSpace({
        space: options.space,
        document: options.document,
    });
    const { scope } = options;
    React.useEffect(
        () => space?.subscribe((event) => latest.current(event), { scope }),
        [space, scope],
    );
}
