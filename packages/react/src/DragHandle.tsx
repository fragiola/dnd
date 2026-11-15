// A drag handle (D9): inside a drag source's element (a draggable, a sortable or a swappable item),
// the only place a drag starts, and its tab stop. It finds its source through the DOM
// (`./utils/handles`), never a context, so the handle may sit deep inside the source, across any
// component boundary. It is a shared part: each capability's entry re-exports it.
import type { DraggableState } from "@fragiola/dnd";
import * as React from "react";
import { addHandle, type HandleLink, type HandleOwner } from "./utils/handles";
import { createSlot, useSlotState } from "./utils/useCoreState";
import type { WrapperProps } from "./utils/useRender";
import { useWrap } from "./utils/useWrap";

/** Props of {@link DragHandle}. */
export interface DragHandleProps extends WrapperProps<DraggableState> {
    /** the id of the element describing how to drag it (`aria-describedby`): the app's text */
    describedBy?: string | undefined;
}

// The development check is written `process.env.NODE_ENV !== "production"`, literally, as React's
// are: an app's bundler (Vite, in dev too, webpack, Next, …) replaces it, and a production build
// drops the checks and their messages.
declare const process: { readonly env: { readonly NODE_ENV?: string } };

const REST: DraggableState = { dragging: false, disabled: false };

/** The handle's state (its draggable's) and props. */
function useDragHandle(describedBy: string | undefined) {
    const [live] = React.useState(() => ({
        slot: createSlot<DraggableState>(() => REST),
        linked: false,
    }));
    const ref = React.useCallback(
        (element: HTMLElement | null) => {
            if (!element) return;
            let owner: HandleOwner | undefined;
            let detach: (() => void) | undefined;
            const link: HandleLink = {
                connect(next) {
                    if (owner === next) return;
                    if (owner) link.disconnect(owner);
                    owner = next;
                    live.linked = true;
                    detach = live.slot.attach(next.source);
                    next.setHandle(element);
                },
                disconnect(gone) {
                    if (owner !== gone) return;
                    owner = undefined;
                    live.linked = false;
                    detach?.();
                    gone.setHandle(null);
                },
            };
            const remove = addHandle(element, link);
            return () => {
                remove();
                if (owner) link.disconnect(owner);
            };
        },
        [live],
    );
    React.useEffect(() => {
        if (process.env.NODE_ENV !== "production" && !live.linked)
            console.error(
                '<DragHandle> is not inside a draggable, sortable or swappable element (`data-dnd-part="draggable"`, `"sortable"` or `"swappable"`): it has no effect.',
            );
    }, [live]);
    const state = useSlotState(live.slot);
    return {
        state,
        props: {
            ref,
            "data-dnd-part": "handle",
            "data-dnd-handle": "",
            "data-dnd-dragging": state.dragging ? "" : undefined,
            "data-dnd-disabled": state.disabled ? "" : undefined,
            "aria-disabled": state.disabled ? true : undefined,
            "aria-describedby": describedBy,
        },
    };
}

/**
 * Makes its single child the only place its drag source's drag starts, and its tab stop. It must
 * be inside a draggable, sortable or swappable element; it renders no element of its own.
 */
export function DragHandle(props: DragHandleProps): React.ReactNode {
    const { describedBy, ...wrapper } = props;
    const { state, props: internal } = useDragHandle(describedBy);
    return useWrap(wrapper, { part: "DragHandle", state, props: internal });
}
