// The drag overlay (D7, D9): the one part that renders HTML, and only because the app asks for
// it. While a drag of its space (and scope) runs, it portals the app's children into that
// space's document `body`, in a fixed box where the source would be (the core's `overlayStyle`),
// inert to the pointer: for drags out of `overflow: hidden` containers and between scroll
// containers. It re-renders on the drag's start, its target changes and its end; the pointer's
// moves write its `left`/`top` directly (D8). Give the draggable `translate={false}` so the source
// stays in place while the overlay moves.
import {
    type DragOperation,
    type DragSpace,
    type DragSpaceEvent,
    overlayStyle,
} from "@fragiola/dnd";
import * as React from "react";
import { createPortal } from "react-dom";
import { useDragSpace } from "./useDragSpace";
import type { WrapperProps } from "./utils/useRender";
import { useWrap } from "./utils/useWrap";

/**
 * The overlay's state: the drag it shows. The overlay renders nothing while idle, so its
 * `className`, `style` and `render` functions are only called during a drag, with an operation.
 */
export interface DragOverlayState {
    readonly operation: DragOperation;
}

/** Props of {@link DragOverlay}. */
export interface DragOverlayProps
    extends Omit<WrapperProps<DragOverlayState>, "children"> {
    /** what it shows: a node, or a function of the drag in progress */
    children?:
        | React.ReactNode
        | ((operation: DragOperation) => React.ReactNode)
        | undefined;
    /** only the drags of this scope */
    scope?: string | undefined;
    /** an explicit space from `createDragSpace` */
    space?: DragSpace | undefined;
    /** this document's drags (default: the page's) */
    document?: Document | undefined;
}

const FALLBACK = <div />;

/** The overlay's own props: its part attribute, its structural style and its ref. */
interface OverlayProps {
    readonly ref: React.RefCallback<HTMLElement>;
    readonly "data-dnd-part": "overlay";
    readonly style: React.CSSProperties;
}

/** Writes the overlay's position for `operation`, outside React. */
function place(element: HTMLElement | null, operation: DragOperation): void {
    if (!element) return;
    const { left, top } = overlayStyle(operation);
    element.style.left = `${left}px`;
    element.style.top = `${top}px`;
}

/**
 * Shows the app's children under the pointer while a drag runs, portalled into the document's
 * `body`. It can sit anywhere in the tree; it needs no provider.
 */
export function DragOverlay(props: DragOverlayProps): React.ReactNode {
    const {
        children,
        scope,
        space: given,
        document: doc,
        render,
        className,
        style,
        ref,
    } = props;
    const space = useDragSpace({ space: given, document: doc });
    const [operation, setOperation] = React.useState<DragOperation>();
    const element = React.useRef<HTMLElement | null>(null);
    const latest = React.useRef<DragOperation | undefined>(undefined);

    React.useEffect(() => {
        if (!space) return;
        const show = (next: DragOperation | undefined) => {
            latest.current = next;
            setOperation(next);
        };
        // a drag already running when it mounts
        const running = space.get("operation");
        if (running && (scope === undefined || running.scope === scope))
            show(running);
        const off = space.subscribe(
            (event: DragSpaceEvent) => {
                if (event.type === "drag-move") {
                    latest.current = event.operation;
                    place(element.current, event.operation);
                } else if (
                    event.type === "drag-start" ||
                    event.type === "drag-over"
                )
                    show(event.operation);
                else show(undefined);
            },
            { scope },
        );
        return () => {
            off();
            show(undefined);
        };
    }, [space, scope]);

    const shown = latest.current ?? operation;
    const ownRef = React.useCallback((node: HTMLElement | null) => {
        element.current = node;
    }, []);
    if (!space || !operation || !shown) return null;
    // the content renders only while a drag runs: its `className`/`style`/`render` functions and
    // its children function are never called while idle, so `state.operation` is always there
    return createPortal(
        <OverlayContent
            operation={shown}
            ownRef={ownRef}
            wrapper={{ children, render, className, style, ref }}
        />,
        space.get("document").body,
    );
}

/** The overlay's element, for the drag in progress. */
function OverlayContent({
    operation,
    ownRef,
    wrapper,
}: {
    readonly operation: DragOperation;
    readonly ownRef: React.RefCallback<HTMLElement>;
    readonly wrapper: Omit<DragOverlayProps, "scope" | "space" | "document">;
}): React.ReactNode {
    const { children, render, className, style, ref } = wrapper;
    const overlayProps: OverlayProps = {
        ref: ownRef,
        "data-dnd-part": "overlay",
        style: overlayStyle(operation),
    };
    return useWrap(
        {
            children:
                typeof children === "function" ? children(operation) : children,
            render,
            className,
            style,
            ref,
        },
        {
            part: "DragOverlay",
            state: { operation },
            props: overlayProps,
            fallback: FALLBACK,
            checkRef: false,
        },
    );
}
