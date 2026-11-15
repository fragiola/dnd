import { act, render, screen } from "@testing-library/react";
import * as React from "react";
import { describe, expect, it } from "vitest";
import { DragOverlay } from "../src";
import { Draggable } from "../src/draggable";
import { Droppable } from "../src/droppable";
import { placeAll, pointer } from "./helpers";

// The drag overlay (D7, D9): rendered only during a drag, portalled into the document's body at
// the dragged box, moved without a React commit; the source opts out of `translate`.

const BOXES = {
    card: { x: 10, y: 20, width: 50, height: 40 },
    zone: { x: 200, y: 0, width: 100, height: 100 },
};

function Page({ commits }: { commits: string[] }) {
    return (
        <>
            <div style={{ overflow: "hidden" }}>
                <Draggable id="card" translate={false}>
                    <div data-testid="card" />
                </Draggable>
            </div>
            <Droppable id="zone">
                <div data-testid="zone" />
            </Droppable>
            <React.Profiler
                id="overlay"
                onRender={() => commits.push("overlay")}
            >
                <DragOverlay className="ghost" style={{ opacity: 0.5 }}>
                    {(operation) => (
                        <span data-testid="ghost">
                            {String(operation.source.id)} over{" "}
                            {String(operation.target?.id ?? "nothing")}
                        </span>
                    )}
                </DragOverlay>
            </React.Profiler>
        </>
    );
}

describe("DragOverlay", () => {
    it("shows the app's children in a fixed box under the pointer during a drag only", () => {
        const commits: string[] = [];
        render(<Page commits={commits} />);
        placeAll(BOXES);
        expect(document.querySelector('[data-dnd-part="overlay"]')).toBeNull();
        const card = screen.getByTestId("card");
        let press: ReturnType<typeof pointer> | undefined;
        act(() => {
            press = pointer(card, 20, 30);
            press.move(30, 30);
        });
        const overlay = document.querySelector<HTMLElement>(
            '[data-dnd-part="overlay"]',
        );
        expect(overlay?.parentElement).toBe(document.body);
        expect(overlay?.className).toBe("ghost");
        expect(overlay?.getAttribute("style")).toBe(
            "opacity: 0.5; position: fixed; left: 20px; top: 20px; width: 50px; height: 40px; box-sizing: border-box; pointer-events: none;",
        );
        expect(screen.getByTestId("ghost").textContent).toBe(
            "card over nothing",
        );
        // the source stays where it is
        expect(card.style.translate).toBe("");

        commits.length = 0;
        act(() => press?.move(60, 50));
        expect(overlay?.style.left).toBe("50px");
        expect(overlay?.style.top).toBe("40px");
        expect(commits).toEqual([]);

        act(() => press?.move(250, 50));
        expect(screen.getByTestId("ghost").textContent).toBe("card over zone");
        expect(commits).toEqual(["overlay"]);

        act(() => press?.release(250, 50));
        expect(document.querySelector('[data-dnd-part="overlay"]')).toBeNull();
    });

    it("renders plain children, or a `render` element instead of its div", () => {
        render(
            <>
                <Draggable id="card">
                    <div data-testid="card" />
                </Draggable>
                <DragOverlay render={<section />}>Ghost</DragOverlay>
            </>,
        );
        placeAll(BOXES);
        let press: ReturnType<typeof pointer> | undefined;
        act(() => {
            press = pointer(screen.getByTestId("card"), 20, 30);
            press.move(40, 30);
        });
        const overlay = document.querySelector('[data-dnd-part="overlay"]');
        expect(overlay?.tagName).toBe("SECTION");
        expect(overlay?.textContent).toBe("Ghost");
        act(() => press?.release(40, 30));
    });

    it("calls its className and style functions only during a drag, always with an operation", () => {
        const seen: unknown[] = [];
        const { rerender } = render(
            <Draggable id="card">
                <div data-testid="card" />
            </Draggable>,
        );
        const page = () => (
            <>
                <Draggable id="card">
                    <div data-testid="card" />
                </Draggable>
                <DragOverlay
                    className={(state) => {
                        seen.push(state.operation);
                        return `ghost-${String(state.operation.source.id)}`;
                    }}
                    style={(state) => {
                        seen.push(state.operation);
                        return {
                            opacity: state.operation.delta.x > 0 ? 0.5 : 1,
                        };
                    }}
                >
                    Ghost
                </DragOverlay>
            </>
        );
        rerender(page());
        rerender(page());
        expect(seen).toEqual([]);
        placeAll(BOXES);
        let press: ReturnType<typeof pointer> | undefined;
        act(() => {
            press = pointer(screen.getByTestId("card"), 20, 30);
            press.move(40, 30);
        });
        expect(
            document.querySelector('[data-dnd-part="overlay"]')?.className,
        ).toBe("ghost-card");
        act(() => press?.release(40, 30));
        rerender(page());
        expect(seen.length).toBeGreaterThan(0);
        expect(seen.every((operation) => operation !== undefined)).toBe(true);
    });
});
