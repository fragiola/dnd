import { createDragSpace, getDragSpace } from "@fragiola/dnd";
import { act, render, screen } from "@testing-library/react";
import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { useDragMonitor, useDragSpace } from "../src";
import { Draggable, DragHandle } from "../src/draggable";
import { Droppable } from "../src/droppable";
import { flush, key, placeAll, pointer } from "./helpers";

// The wrappers in a drag: no provider between the two halves, scopes and explicit spaces,
// handles, option updates without a re-register, StrictMode, and no React commit while the
// pointer moves inside one droppable (D8).

const BOXES = {
    card: { x: 0, y: 0, width: 50, height: 50 },
    left: { x: 100, y: 0, width: 100, height: 100 },
    right: { x: 300, y: 0, width: 100, height: 100 },
};

/** The draggable and two droppables in unrelated subtrees, with no common wrapper. */
function Page(props: {
    onDrop?: (id: string) => void;
    onDragEnd?: () => void;
    accepts?: readonly string[];
    scope?: string;
}) {
    return (
        <main>
            <aside>
                <div>
                    <Draggable
                        id="card"
                        type="task"
                        onDragEnd={props.onDragEnd}
                    >
                        <div data-testid="card" />
                    </Draggable>
                </div>
            </aside>
            <section>
                <Droppable
                    id="left"
                    scope={props.scope}
                    accepts={props.accepts}
                    onDrop={() => props.onDrop?.("left")}
                >
                    <div data-testid="left" />
                </Droppable>
            </section>
            <footer>
                <Droppable id="right" onDrop={() => props.onDrop?.("right")}>
                    <div data-testid="right" />
                </Droppable>
            </footer>
        </main>
    );
}

/** A handle deep in a component of its own: no context links it to its draggable. */
function Grip() {
    return (
        <p>
            <DragHandle>
                <span data-testid="grip" />
            </DragHandle>
        </p>
    );
}

/** A draggable whose handle comes and goes. */
function HandledCard({
    grip,
    onDragStart,
}: {
    grip: boolean;
    onDragStart: () => void;
}) {
    return (
        <Draggable id="card" onDragStart={onDragStart}>
            <div data-testid="card">
                {grip && (
                    <DragHandle>
                        <span data-testid="grip" />
                    </DragHandle>
                )}
            </div>
        </Draggable>
    );
}

/** A draggable re-rendered with new inline options and callbacks. */
function LabelledCard({
    label,
    disabled,
    calls,
}: {
    label: string;
    disabled?: boolean;
    calls: string[];
}) {
    return (
        <Draggable
            id="card"
            disabled={disabled}
            activation={{ distance: 3 }}
            onDragStart={() => calls.push(label)}
            ref={(element) => {
                if (element) calls.push("attach");
            }}
        >
            <div data-testid="card" />
        </Draggable>
    );
}

/** A drop rule from React: no drop on `left`. */
function Rule() {
    const space = useDragSpace();
    React.useEffect(
        () =>
            space?.use((ctx, next) =>
                ctx.payload.droppableId === "left"
                    ? { ok: false, error: { code: "vetoed" } }
                    : next(),
            ),
        [space],
    );
    return null;
}

/** A monitor whose listener changes on every render. */
function Monitor({ tag, seen }: { tag: string; seen: string[] }) {
    useDragMonitor((event) => {
        if (event.type !== "drag-move") seen.push(`${tag}:${event.type}`);
    });
    return null;
}
/** Drags the card from its centre to (x, y), frame by frame, inside `act`. */
function dragCard(x: number, y: number, release = true) {
    const card = screen.getByTestId("card");
    let press: ReturnType<typeof pointer> | undefined;
    act(() => {
        press = pointer(card, 25, 25);
        press.move(30, 25);
    });
    act(() => press?.move(x, y));
    if (release) act(() => press?.release(x, y));
    return press as ReturnType<typeof pointer>;
}

describe("a drag with no provider", () => {
    it("drops a draggable on a droppable in an unrelated subtree", () => {
        const onDrop = vi.fn();
        render(<Page onDrop={onDrop} />);
        placeAll(BOXES);
        const press = dragCard(150, 50, false);
        expect(screen.getByTestId("card").dataset.dndDragging).toBe("");
        expect(screen.getByTestId("left").dataset.dndOver).toBe("");
        expect(screen.getByTestId("left").dataset.dndActive).toBe("");
        act(() => press.release(150, 50));
        expect(onDrop).toHaveBeenCalledWith("left");
        expect(screen.getByTestId("card").dataset.dndDragging).toBeUndefined();
        expect(screen.getByTestId("left").dataset.dndOver).toBeUndefined();
    });

    it("writes only the allow-listed inline style: translate while dragging, nothing after", () => {
        render(<Page />);
        placeAll(BOXES);
        const card = screen.getByTestId("card");
        const press = dragCard(150, 50, false);
        expect([...card.style]).toEqual(["translate"]);
        expect(card.style.translate).toBe("125px 25px");
        for (const id of ["left", "right"])
            expect(screen.getByTestId(id).getAttribute("style")).toBeNull();
        act(() => press.release(150, 50));
        expect(card.getAttribute("style")).toBe("");
    });

    it("marks a refusing droppable and never drops on it", () => {
        const onDrop = vi.fn();
        render(<Page onDrop={onDrop} accepts={["note"]} />);
        placeAll(BOXES);
        const press = dragCard(150, 50, false);
        const left = screen.getByTestId("left");
        expect(left.dataset.dndRefused).toBe("");
        expect(left.dataset.dndOver).toBeUndefined();
        expect(left.dataset.dndActive).toBeUndefined();
        act(() => press.release(150, 50));
        expect(onDrop).not.toHaveBeenCalled();
    });

    it("never meets a droppable of another scope", () => {
        const onDrop = vi.fn();
        render(<Page onDrop={onDrop} scope="other" />);
        placeAll(BOXES);
        dragCard(150, 50);
        expect(onDrop).not.toHaveBeenCalled();
        dragCard(350, 50);
        expect(onDrop).toHaveBeenCalledWith("right");
    });

    it("keeps an explicit space isolated from the document's", () => {
        const space = createDragSpace({ document });
        const onDrop = vi.fn();
        render(
            <>
                <Draggable id="card" space={space}>
                    <div data-testid="card" />
                </Draggable>
                <Droppable id="left" onDrop={onDrop}>
                    <div data-testid="left" />
                </Droppable>
                <Droppable id="right" space={space} onDrop={onDrop}>
                    <div data-testid="right" />
                </Droppable>
            </>,
        );
        placeAll(BOXES);
        expect(space.get("draggable-ids")).toEqual(["card"]);
        expect(getDragSpace(document).get("draggable-ids")).toEqual([]);
        dragCard(150, 50);
        expect(onDrop).not.toHaveBeenCalled();
        dragCard(350, 50);
        expect(onDrop).toHaveBeenCalledTimes(1);
    });

    it("cancels on Escape: no drop, onDragCancel", () => {
        const onDrop = vi.fn();
        const onDragCancel = vi.fn();
        render(
            <>
                <Draggable id="card" onDragCancel={onDragCancel}>
                    <div data-testid="card" />
                </Draggable>
                <Droppable id="left" onDrop={onDrop}>
                    <div data-testid="left" />
                </Droppable>
            </>,
        );
        placeAll(BOXES);
        const press = dragCard(150, 50, false);
        act(() => {
            key("Escape", document.body);
        });
        act(() => press.release(150, 50));
        expect(onDragCancel).toHaveBeenCalledTimes(1);
        expect(onDrop).not.toHaveBeenCalled();
        expect(screen.getByTestId("card").dataset.dndDragging).toBeUndefined();
    });

    it("drags by the keyboard from the draggable's tab stop", () => {
        const onDrop = vi.fn();
        render(<Page onDrop={onDrop} />);
        placeAll(BOXES);
        const card = screen.getByTestId("card");
        act(() => card.focus());
        act(() => {
            key(" ");
            flush();
        });
        for (let i = 0; i < 5; i++)
            act(() => {
                key("ArrowRight");
                flush();
            });
        act(() => {
            key("Enter");
        });
        expect(onDrop).toHaveBeenCalledWith("left");
    });
});

describe("a drag handle", () => {
    it("is the only place a drag starts, found through the DOM across components", () => {
        const onDragStart = vi.fn();
        render(
            <Draggable id="card" onDragStart={onDragStart}>
                <div data-testid="card">
                    <Grip />
                </div>
            </Draggable>,
        );
        placeAll({ ...BOXES, grip: { x: 0, y: 0, width: 10, height: 10 } });
        const card = screen.getByTestId("card");
        const grip = screen.getByTestId("grip");
        expect(card.hasAttribute("tabindex")).toBe(false);
        expect(grip.getAttribute("tabindex")).toBe("0");
        act(() => {
            pointer(card, 25, 25).move(80, 25);
        });
        expect(onDragStart).not.toHaveBeenCalled();
        let press: ReturnType<typeof pointer> | undefined;
        act(() => {
            press = pointer(grip, 5, 5);
            press.move(60, 5);
        });
        expect(onDragStart).toHaveBeenCalledTimes(1);
        expect(grip.dataset.dndDragging).toBe("");
        act(() => press?.release(60, 5));
        expect(grip.dataset.dndDragging).toBeUndefined();
    });

    it("follows a handle mounted later, and gives the element back when it goes", () => {
        const onDragStart = vi.fn();
        const { rerender } = render(
            <HandledCard grip={false} onDragStart={onDragStart} />,
        );
        expect(screen.getByTestId("card").getAttribute("tabindex")).toBe("0");
        rerender(<HandledCard grip onDragStart={onDragStart} />);
        expect(screen.getByTestId("card").hasAttribute("tabindex")).toBe(false);
        expect(screen.getByTestId("grip").getAttribute("touch-action")).toBe(
            null,
        );
        expect(screen.getByTestId("grip").style.touchAction).toBe("none");
        rerender(<HandledCard grip={false} onDragStart={onDragStart} />);
        expect(screen.getByTestId("card").getAttribute("tabindex")).toBe("0");
    });
});

describe("the hooks' lifecycle", () => {
    it("updates options without re-registering, and reads the latest inline callback", () => {
        const calls: string[] = [];
        const { rerender } = render(
            <LabelledCard label="first" calls={calls} />,
        );
        rerender(<LabelledCard label="second" calls={calls} />);
        placeAll(BOXES);
        const press = dragCard(60, 25, false);
        act(() => press.release(60, 25));
        expect(calls).toEqual(["attach", "second"]);
        rerender(<LabelledCard label="third" disabled calls={calls} />);
        const card = screen.getByTestId("card");
        expect(card.dataset.dndDisabled).toBe("");
        expect(card.getAttribute("aria-disabled")).toBe("true");
        dragCard(60, 25);
        expect(calls).toEqual(["attach", "second"]);
    });

    it("registers once under StrictMode, and unregisters on unmount", () => {
        const space = getDragSpace(document);
        const { unmount } = render(
            <React.StrictMode>
                <Page />
            </React.StrictMode>,
        );
        expect(space.get("draggable-ids")).toEqual(["card"]);
        expect(space.get("droppable-ids")).toEqual(["left", "right"]);
        const onDrop = vi.fn();
        unmount();
        expect(space.get("draggable-ids")).toEqual([]);
        expect(space.get("droppable-ids")).toEqual([]);
        render(
            <React.StrictMode>
                <Page onDrop={onDrop} />
            </React.StrictMode>,
        );
        placeAll(BOXES);
        dragCard(150, 50);
        expect(onDrop).toHaveBeenCalledTimes(1);
    });

    it("re-renders only the parts whose state changed, and never while moving inside one droppable", () => {
        const commits: string[] = [];
        const counted = (id: string) => (
            <React.Profiler id={id} onRender={() => commits.push(id)}>
                {id === "card" ? (
                    <Draggable id="card">
                        <div data-testid="card" />
                    </Draggable>
                ) : (
                    <Droppable id={id}>
                        <div data-testid={id} />
                    </Droppable>
                )}
            </React.Profiler>
        );
        render(
            <>
                {counted("card")}
                {counted("left")}
                {counted("right")}
            </>,
        );
        placeAll(BOXES);
        commits.length = 0;
        const press = dragCard(150, 50, false);
        // the start (the source, the droppables now active), then entering `left`
        expect(commits.sort()).toEqual(["card", "left", "left", "right"]);
        commits.length = 0;
        for (let x = 110; x < 200; x += 10) act(() => press.move(x, 50));
        expect(commits).toEqual([]);
        act(() => press.release(190, 50));
        expect(commits.sort()).toEqual(["card", "left", "right"]);
    });
});

describe("the space from React", () => {
    it("vetoes a drop through middleware added with useDragSpace().use", () => {
        const onDrop = vi.fn();
        render(
            <>
                <Rule />
                <Page onDrop={onDrop} />
            </>,
        );
        placeAll(BOXES);
        const press = dragCard(150, 50, false);
        expect(screen.getByTestId("left").dataset.dndRefused).toBe("");
        act(() => press.release(150, 50));
        expect(onDrop).not.toHaveBeenCalled();
        dragCard(350, 50);
        expect(onDrop).toHaveBeenCalledWith("right");
    });

    it("tells a monitor of every drag, with the latest listener", () => {
        const seen: string[] = [];
        const { rerender } = render(
            <>
                <Monitor tag="a" seen={seen} />
                <Page />
            </>,
        );
        rerender(
            <>
                <Monitor tag="b" seen={seen} />
                <Page />
            </>,
        );
        placeAll(BOXES);
        dragCard(150, 50);
        expect(seen).toEqual(["b:drag-start", "b:drag-over", "b:drop"]);
    });
});
