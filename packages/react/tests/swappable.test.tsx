import { act, render, screen } from "@testing-library/react";
import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { type SwapEvent, Swappable, swapItems } from "../src/swappable";
import { placeAll, pointer } from "./helpers";

// The swappable wrapper: no element of its own, a preview the core writes (only the target moves,
// marked `data-dnd-swap-target`) with no React commit, and the app's commit with `swapItems`.

function Row({
    commits = [],
    onSwap,
}: {
    commits?: string[];
    onSwap?: (event: SwapEvent) => void;
}) {
    const [items, setItems] = React.useState(["a", "b", "c"]);
    return (
        <div>
            {items.map((id, index) => (
                <React.Profiler
                    key={id}
                    id={id}
                    onRender={() => commits.push(id)}
                >
                    <Swappable
                        id={id}
                        index={index}
                        group="row"
                        onSwap={(event) => {
                            onSwap?.(event);
                            const { target } = event;
                            if (target)
                                setItems((list) =>
                                    swapItems(
                                        list,
                                        event.source.index,
                                        target.index,
                                    ),
                                );
                        }}
                    >
                        <div data-testid={id} />
                    </Swappable>
                </React.Profiler>
            ))}
        </div>
    );
}

const place = () =>
    placeAll(
        Object.fromEntries(
            [...document.querySelectorAll<HTMLElement>("[data-testid]")]
                .filter((el) => el.dataset.dndPart === "swappable")
                .map((el, index) => [
                    el.dataset.testid ?? "",
                    { x: index * 100, y: 0, width: 80, height: 50 },
                ]),
        ),
    );

const order = () =>
    [...document.querySelectorAll<HTMLElement>("[data-dnd-part]")].map(
        (el) => el.dataset.testid,
    );

describe("Swappable", () => {
    it("renders exactly the child, with its part and id", () => {
        const { container } = render(
            <Swappable id="a" index={0} group="row" className="x">
                <div data-testid="a" />
            </Swappable>,
        );
        const a = screen.getByTestId("a");
        expect(container.firstElementChild).toBe(a);
        expect(a.dataset.dndPart).toBe("swappable");
        expect(a.dataset.dndId).toBe("a");
        expect(a.className).toBe("x");
    });

    it("previews the swap with no commit, then the app swaps once", () => {
        const commits: string[] = [];
        const onSwap = vi.fn();
        render(<Row commits={commits} onSwap={onSwap} />);
        place();
        commits.length = 0;
        let press: ReturnType<typeof pointer> | undefined;
        act(() => {
            press = pointer(screen.getByTestId("a"), 40, 25);
            press.move(44, 25);
        });
        expect(screen.getByTestId("a").dataset.dndDragging).toBe("");
        commits.length = 0;
        act(() => press?.move(140, 25));
        act(() => press?.move(240, 25));
        expect(screen.getByTestId("c").dataset.dndSwapTarget).toBe("");
        expect(screen.getByTestId("c").style.translate).toBe("-200px");
        expect(screen.getByTestId("b").style.translate).toBe("");
        expect(screen.getByTestId("b").dataset.dndSwapTarget).toBeUndefined();
        expect(commits).toEqual([]);
        act(() => press?.release(240, 25));
        expect(onSwap.mock.calls[0]?.[0]).toMatchObject({
            source: { id: "a", index: 0 },
            target: { id: "c", index: 2 },
        });
        expect(order()).toEqual(["c", "b", "a"]);
        expect(screen.getByTestId("c").style.translate).toBe("");
        expect(screen.getByTestId("c").dataset.dndSwapTarget).toBeUndefined();
    });
});
