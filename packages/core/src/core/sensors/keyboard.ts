// The keyboard sensor (D10): on the activator (the draggable or its handle), Space or Enter grabs,
// the arrows move by a step or to the next or previous droppable in reading order, Space or
// Enter drops, Escape cancels, and Tab or the focus leaving cancels. Arrows are visual: in RTL,
// ArrowRight still moves right. Focus returns to the activator after a drop or Escape, unless the
// app moved it.
import { center, listen, measure } from "../dom";
import type { Candidate } from "../operation";
import type { Point } from "../types";
import type { SensorContext } from "./context";

const ARROWS: Record<string, readonly [number, number] | undefined> = {
    ArrowRight: [1, 0],
    ArrowLeft: [-1, 0],
    ArrowDown: [0, 1],
    ArrowUp: [0, -1],
};

const grabs = (key: string) => key === " " || key === "Enter";

/**
 * Takes a key for the drag: its keydown, and the keyup that follows it, are prevented, so Space
 * or Enter on a `<button>` activator never clicks it (Enter clicks on keydown, Space on keyup).
 */
function consume(key: KeyboardEvent, doc: Document): void {
    key.preventDefault();
    const remove = listen(
        doc,
        "keyup",
        (up) => {
            if (up.key !== key.key) return;
            up.preventDefault();
            remove();
        },
        { capture: true },
    );
}

/**
 * The droppables in reading order: rows top to bottom (a box starting above the middle of a
 * row's first box joins that row), each row from its inline start (the right, in RTL).
 */
export function readingOrder(
    candidates: readonly Candidate[],
    rtl: boolean,
): Candidate[] {
    const rows: Candidate[][] = [];
    for (const candidate of [...candidates].sort(
        (a, b) => a.rect.y - b.rect.y,
    )) {
        const row = rows[rows.length - 1];
        const first = row?.[0];
        if (
            row &&
            first &&
            candidate.rect.y < first.rect.y + first.rect.height / 2
        )
            row.push(candidate);
        else rows.push([candidate]);
    }
    return rows.flatMap((row) =>
        row.sort((a, b) =>
            rtl
                ? b.rect.x + b.rect.width - (a.rect.x + a.rect.width)
                : a.rect.x - b.rect.x,
        ),
    );
}

/** Drives keyboard drags of `context` from `activator`; returns the unbind. */
export function bindKeyboard(
    activator: HTMLElement,
    context: SensorContext,
): () => void {
    return listen(activator, "keydown", (grab) => {
        if (
            grab.defaultPrevented ||
            grab.target !== activator ||
            grab.repeat ||
            !grabs(grab.key) ||
            !context.canStart()
        )
            return;
        let pointer: Point = center(measure(context.element));
        const session = context.start(pointer, "keyboard");
        if (!session) return;
        consume(grab, activator.ownerDocument);
        const doc = activator.ownerDocument;
        const view = doc.defaultView;
        let at: Candidate | undefined;
        let refocus = true;
        /** the centre of the next droppable in reading order, from the one it is at */
        const nextTarget = (forward: boolean, rtl: boolean) => {
            const order = readingOrder(session.targets(), rtl);
            const current = at ?? session.hovered();
            const index = order.findIndex(
                (candidate) => candidate.entry === current?.entry,
            );
            const next =
                order[
                    index < 0
                        ? forward
                            ? 0
                            : order.length - 1
                        : Math.max(
                              0,
                              Math.min(
                                  order.length - 1,
                                  index + (forward ? 1 : -1),
                              ),
                          )
                ];
            if (!next) return undefined;
            at = next;
            return center(next.rect);
        };
        session.onEnd(
            listen(doc, "keydown", (key) => {
                // the grab itself reaches the document after the activator
                if (key === grab || key.defaultPrevented) return;
                if (key.key === "Tab") {
                    refocus = false;
                    session.cancel();
                    return;
                }
                const arrow = ARROWS[key.key];
                if (!grabs(key.key) && key.key !== "Escape" && !arrow) return;
                consume(key, doc);
                if (key.key === "Escape") session.cancel();
                else if (!arrow) session.drop();
                else if (context.keyboard()?.mode === "targets") {
                    const rtl =
                        view?.getComputedStyle(context.element).direction ===
                        "rtl";
                    // forward is down, or toward the inline end: right in LTR, left in RTL
                    const forward =
                        arrow[1] > 0 || arrow[0] * (rtl ? -1 : 1) > 0;
                    // a capability with its own order of places (a sortable's slots) says where
                    const to = context.step
                        ? context.step(session, forward, rtl)
                        : nextTarget(forward, rtl);
                    if (!to) return;
                    pointer = to;
                    session.move(pointer);
                } else {
                    const step = context.keyboard()?.step ?? 25;
                    pointer = {
                        x: pointer.x + arrow[0] * step,
                        y: pointer.y + arrow[1] * step,
                    };
                    session.move(pointer);
                }
            }),
            listen(activator, "focusout", () => {
                refocus = false;
                session.cancel();
            }),
            () => {
                // after the app's re-render, which may have moved the element (and its focus)
                view?.setTimeout(() => {
                    const active = doc.activeElement;
                    if (
                        refocus &&
                        activator.isConnected &&
                        (!active || active === doc.body)
                    )
                        activator.focus({ preventScroll: true });
                }, 0);
            },
        );
    });
}
