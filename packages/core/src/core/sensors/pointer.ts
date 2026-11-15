// From Grid Layout (fragiola/grid-layout, packages/core/src/engine/engine.ts), same author and licence.
//
// The pointer sensor (D9): Pointer Events, one path for mouse, touch and pen, listening on the
// draggable's activator (the element or its handle), never on a global. A press is a click until
// it passes the activation (a distance for mouse and pen, a hold for touch), then a drag that
// follows the pointer under `setPointerCapture` until released, cancelled, its capture lost, or
// Escape.
//
// Claiming the press (D11): a press that may become a drag is claimed with `preventDefault()` on
// `pointerdown` itself, not at activation. An ancestor library (Grid Layout's item) decides on
// that same `pointerdown` whether to start its own gesture, by `defaultPrevented`, so a later
// claim would come too late. Cancelling `pointerdown` suppresses the compatibility mouse events
// (`mousedown`, `mouseup`) and, with them, the focus a press gives: measured in Chromium and
// Firefox, so the sensor gives that focus itself (`focusPress`), to the press's focusable element
// within the activator, as the browser would have. `click` and touch scrolling are unaffected,
// and the text selection a mouse press could start is prevented while it lasts (`selectstart`).
// Native controls and `data-dnd-no-drag` subtrees are never claimed, so they keep the browser's
// own press. A press already claimed by someone else (`defaultPrevented`) is ignored.
import { listen } from "../dom";
import type { Session } from "../operation";
import type { Point } from "../types";
import type { SensorContext } from "./context";

/** What never starts a drag: native controls, editable content and opted-out subtrees (D9). */
const EXEMPT =
    'input,textarea,select,button,[contenteditable]:not([contenteditable="false"]),[data-dnd-no-drag]';

/** Whether a press on `target` belongs to a control inside `activator`, not to the drag. */
function exempt(target: EventTarget | null, activator: Element): boolean {
    for (
        let element = target as Element | null;
        element && element !== activator;
        element = element.parentElement
    ) {
        if (element.matches?.(EXEMPT)) return true;
    }
    return false;
}

const prevent = (event: Event) => event.preventDefault();

/**
 * Gives the focus a press would have given, had its `pointerdown` not been claimed: to the
 * closest focusable element from the press's target up to the activator.
 */
function focusPress(target: EventTarget | null, activator: HTMLElement): void {
    for (
        let element = target as HTMLElement | null;
        element;
        element = element.parentElement
    ) {
        if (element.tabIndex >= 0 || element.hasAttribute?.("tabindex")) {
            if (element.ownerDocument.activeElement !== element)
                element.focus?.({ preventScroll: true });
            return;
        }
        if (element === activator) return;
    }
}

const point = (event: PointerEvent): Point => ({
    x: event.clientX,
    y: event.clientY,
});

/** The click a drag's release produces belongs to the drag, not to what is under it. */
function swallowClick(doc: Document): void {
    const remove = listen(
        doc,
        "click",
        (click) => {
            click.preventDefault();
            click.stopPropagation();
            remove();
        },
        { capture: true },
    );
    doc.defaultView?.setTimeout(remove, 0);
}

/** Drives drags of `context` from pointer presses on `activator`; returns the unbind. */
export function bindPointer(
    activator: HTMLElement,
    context: SensorContext,
): () => void {
    let endPress: (() => void) | undefined;

    /** Follows the drag: the pointer captured on the activator, until it ends. */
    function follow(session: Session, down: PointerEvent, at: PointerEvent) {
        const doc = activator.ownerDocument;
        const { pointerId } = down;
        doc.getSelection()?.removeAllRanges();
        try {
            activator.setPointerCapture(pointerId);
        } catch {
            // the pointer is already gone: its pointerup or pointercancel ends the drag
        }
        session.onEnd(
            listen(doc, "pointermove", (move) => {
                if (move.pointerId !== pointerId) return;
                // released where no pointerup reached us
                if (move.buttons === 0) session.cancel();
                else session.move(point(move));
            }),
            listen(doc, "pointerup", (up) => {
                if (up.pointerId !== pointerId) return;
                session.move(point(up));
                session.drop();
                swallowClick(doc);
            }),
            listen(doc, "pointercancel", (gone) => {
                if (gone.pointerId === pointerId) session.cancel();
            }),
            listen(activator, "lostpointercapture", (lost) => {
                if (lost.pointerId === pointerId) session.cancel();
            }),
            listen(doc, "keydown", (key) => {
                // after the app's handlers, which may keep the drag going
                if (key.key === "Escape" && !key.defaultPrevented) {
                    key.preventDefault();
                    session.cancel();
                }
            }),
            // no text selection, native drag or long-press menu while dragging
            listen(doc, "selectstart", prevent),
            listen(doc, "dragstart", prevent),
            listen(doc, "contextmenu", prevent),
            () => {
                try {
                    if (activator.hasPointerCapture(pointerId))
                        activator.releasePointerCapture(pointerId);
                } catch {
                    // the element left the document
                }
            },
        );
        session.move(point(at));
    }

    const unbindDown = listen(activator, "pointerdown", (down) => {
        if (
            down.defaultPrevented ||
            !down.isPrimary ||
            down.button !== 0 ||
            endPress ||
            !context.canStart() ||
            exempt(down.target, activator)
        )
            return;
        // the claim, and the focus it took: see the header (D11)
        down.preventDefault();
        focusPress(down.target, activator);
        const doc = activator.ownerDocument;
        const view = doc.defaultView;
        const origin = point(down);
        const {
            distance = 3,
            delay = 200,
            tolerance = 5,
        } = context.activation() ?? {};
        const held = down.pointerType === "touch" && delay > 0;
        let last = down;
        const cleanup: (() => void)[] = [];
        const end = () => {
            for (const remove of cleanup.splice(0)) remove();
            endPress = undefined;
        };
        endPress = end;
        const activate = () => {
            end();
            const session = context.start(origin, "pointer");
            if (session) follow(session, down, last);
        };
        const release = (event: PointerEvent) => {
            if (event.pointerId === down.pointerId) end();
        };
        cleanup.push(
            listen(doc, "pointermove", (move) => {
                if (move.pointerId !== down.pointerId) return;
                if (move.buttons === 0) return end();
                last = move;
                const moved = Math.hypot(
                    move.clientX - origin.x,
                    move.clientY - origin.y,
                );
                // a touch that moves before it is held long enough scrolls the page
                if (held) {
                    if (moved > tolerance) end();
                } else if (moved >= distance) activate();
            }),
            listen(doc, "pointerup", release),
            listen(doc, "pointercancel", release),
            // the browser's own drag (a selection, an image) would cancel the pointer
            listen(doc, "dragstart", prevent),
            listen(doc, "selectstart", prevent),
        );
        if (held && view) {
            const timer = view.setTimeout(activate, delay);
            cleanup.push(
                () => view.clearTimeout(timer),
                listen(doc, "contextmenu", prevent),
            );
        } else if (!held && distance <= 0) activate();
    });
    // a touch that holds the source never scrolls the page: there from the touch's start, as
    // browsers require for it to be cancelable
    const unbindTouch = listen(
        activator,
        "touchmove",
        (touch) => {
            if (context.dragging()) touch.preventDefault();
        },
        { passive: false },
    );
    return () => {
        endPress?.();
        unbindDown();
        unbindTouch();
    };
}
