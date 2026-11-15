import { getDragSpace } from "@fragiola/dnd";
import { act, render, screen } from "@testing-library/react";
import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import {
    arrayMove,
    DragHandle,
    moveBetween,
    Sortable,
    SortableGroup,
    type SortEndEvent,
} from "../src/sortable";
import { placeAll, pointer } from "./helpers";

// The sortable wrappers: no element of their own, no wrapper around a list, the merge rules, a
// handle found through the DOM, StrictMode, and no React commit during a sort's preview: the app
// commits once, on `onSortEnd`, with the helpers.

/** A list the app owns: it applies `onSortEnd` with `arrayMove`, and counts its commits. */
function List({
    commits = [],
    handle = false,
    onSortEnd,
}: {
    commits?: string[];
    handle?: boolean;
    onSortEnd?: (event: SortEndEvent) => void;
}) {
    const [items, setItems] = React.useState(["a", "b", "c", "d"]);
    return (
        <ul>
            {items.map((id, index) => (
                <React.Profiler
                    key={id}
                    id={id}
                    onRender={() => commits.push(id)}
                >
                    <Sortable
                        id={id}
                        index={index}
                        group="list"
                        className={(state) =>
                            state.dragging ? "lifted" : undefined
                        }
                        onSortEnd={(event) => {
                            onSortEnd?.(event);
                            setItems((list) =>
                                arrayMove(
                                    list,
                                    event.from.index,
                                    event.to.index,
                                ),
                            );
                        }}
                    >
                        <li data-testid={id} className="item">
                            {handle && (
                                <DragHandle>
                                    <span data-testid={`${id}-grip`} />
                                </DragHandle>
                            )}
                            {id}
                        </li>
                    </Sortable>
                </React.Profiler>
            ))}
        </ul>
    );
}

/** Each item's box by its id, in the order rendered now: a column of 100×50, 10 px apart. */
function placeColumn(ids = ["a", "b", "c", "d"]) {
    const rendered = [...document.querySelectorAll("li")].map(
        (li) => li.dataset.testid ?? "",
    );
    placeAll(
        Object.fromEntries(
            rendered
                .filter((id) => ids.includes(id))
                .map((id, index) => [
                    id,
                    { x: 0, y: index * 60, width: 100, height: 50 },
                ]),
        ),
    );
}

const order = () =>
    [...document.querySelectorAll("li")].map((li) => li.dataset.testid);

/** Drags the item `id` from its centre by `dy`, frame by frame, inside `act`. */
function sortBy(id: string, dy: number, release = true, from = id) {
    const element = screen.getByTestId(from);
    const box = element.getBoundingClientRect();
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    let press: ReturnType<typeof pointer> | undefined;
    act(() => {
        press = pointer(element, x, y);
        press.move(x, y + 4);
    });
    act(() => press?.move(x, y + dy));
    if (release) act(() => press?.release(x, y + dy));
    return press as ReturnType<typeof pointer>;
}

describe("Sortable and SortableGroup render no element of their own", () => {
    it("render exactly the child, with their part, id and the child's own props", () => {
        const ref = vi.fn();
        const { container } = render(
            <SortableGroup group="list" className="box">
                <ul data-testid="group" className="own">
                    <Sortable
                        id="a"
                        index={0}
                        group="list"
                        ref={ref}
                        data-extra="t"
                    >
                        <li data-testid="a" onFocus={() => {}} />
                    </Sortable>
                </ul>
            </SortableGroup>,
        );
        const group = screen.getByTestId("group");
        expect(container.firstElementChild).toBe(group);
        expect(group.dataset.dndPart).toBe("sortable-group");
        expect(group.dataset.dndId).toBe("list");
        expect(group.className).toBe("own box");
        const item = screen.getByTestId("a");
        expect(group.firstElementChild).toBe(item);
        expect(item.dataset.dndPart).toBe("sortable");
        expect(item.dataset.dndId).toBe("a");
        expect(item.getAttribute("data-extra")).toBe("t");
        expect(item.tabIndex).toBe(0);
        expect(ref).toHaveBeenCalledWith(item);
    });
});

describe("a sort from React", () => {
    it("previews with the core's shifts, then the app commits the new order once", () => {
        const onSortEnd = vi.fn();
        render(<List onSortEnd={onSortEnd} />);
        placeColumn();
        const press = sortBy("a", 130, false);
        const a = screen.getByTestId("a");
        expect(a.dataset.dndDragging).toBe("");
        expect(a.className).toBe("item lifted");
        // every item takes part in the sort
        expect(
            ["a", "b", "c", "d"].map(
                (id) => screen.getByTestId(id).dataset.dndSorting,
            ),
        ).toEqual(["", "", "", ""]);
        expect(screen.getByTestId("b").style.translate).toBe("0px -60px");
        expect(screen.getByTestId("c").style.translate).toBe("0px -60px");
        // the app's DOM order is untouched during the preview
        expect(order()).toEqual(["a", "b", "c", "d"]);
        act(() => press.release(50, 159));
        expect(onSortEnd.mock.calls[0]?.[0]).toMatchObject({
            from: { group: "list", index: 0 },
            to: { group: "list", index: 2 },
        });
        expect(order()).toEqual(["b", "c", "a", "d"]);
        for (const id of ["a", "b", "c", "d"]) {
            const item = screen.getByTestId(id);
            expect(item.style.translate, id).toBe("");
            expect(item.dataset.dndSorting, id).toBeUndefined();
        }
    });

    it("commits nothing while the preview changes, once at the start and once at the end", () => {
        const commits: string[] = [];
        render(<List commits={commits} />);
        placeColumn();
        commits.length = 0;
        const press = sortBy("a", 10, false);
        // the start: every item becomes `sorting`
        expect([...new Set(commits)].sort()).toEqual(["a", "b", "c", "d"]);
        commits.length = 0;
        for (let dy = 10; dy <= 190; dy += 15)
            act(() => press.move(50, 25 + dy));
        expect(screen.getByTestId("d").style.translate).toBe("0px -60px");
        expect(commits).toEqual([]);
        act(() => press.release(50, 215));
        expect(order()).toEqual(["b", "c", "d", "a"]);
        // the end: back to rest, in the new order, in one commit per item
        expect(commits.sort()).toEqual(["a", "b", "c", "d"]);
    });

    it("writes only the allow-listed inline style: translate during a sort, nothing after", () => {
        render(<List />);
        placeColumn();
        const press = sortBy("a", 70, false);
        for (const id of ["a", "b"]) {
            const style = screen.getByTestId(id).style;
            expect([...style], id).toEqual(["translate"]);
        }
        act(() => press.release(50, 95));
        for (const id of ["a", "b", "c", "d"])
            expect([...screen.getByTestId(id).style], id).toEqual([]);
    });

    it("drags from a DragHandle only, found through the DOM", () => {
        const onSortEnd = vi.fn();
        render(<List handle onSortEnd={onSortEnd} />);
        placeColumn();
        placeAll({ "a-grip": { x: 0, y: 0, width: 10, height: 10 } });
        sortBy("a", 130);
        expect(onSortEnd).not.toHaveBeenCalled();
        expect(screen.getByTestId("a-grip").dataset.dndHandle).toBe("");
        sortBy("a", 130, true, "a-grip");
        expect(onSortEnd).toHaveBeenCalledOnce();
        expect(order()).toEqual(["b", "c", "a", "d"]);
    });

    it("registers once under StrictMode, and unregisters on unmount", () => {
        const space = getDragSpace(document);
        const { unmount } = render(
            <React.StrictMode>
                <List />
            </React.StrictMode>,
        );
        expect(space.get("draggable-ids")).toEqual(["a", "b", "c", "d"]);
        placeColumn();
        sortBy("d", -190);
        expect(order()).toEqual(["d", "a", "b", "c"]);
        unmount();
        expect(space.get("draggable-ids")).toEqual([]);
        expect(space.get("droppable-ids")).toEqual([]);
    });
});

/** A kanban the app owns: `todo` and an empty `done` with its container, applied with moveBetween. */
function Board() {
    const [lists, setLists] = React.useState<Record<string, readonly string[]>>(
        {
            todo: ["a", "b"],
            done: [],
        },
    );
    return (
        <>
            {Object.entries(lists).map(([group, ids]) => (
                <SortableGroup
                    key={group}
                    group={group}
                    accepts={["todo", "done"]}
                >
                    <ul data-testid={group}>
                        {ids.map((id, index) => (
                            <Sortable
                                key={id}
                                id={id}
                                index={index}
                                group={group}
                                accepts={["todo", "done"]}
                                onSortEnd={(event) =>
                                    setLists((all) => moveBetween(all, event))
                                }
                            >
                                <li data-testid={id} />
                            </Sortable>
                        ))}
                    </ul>
                </SortableGroup>
            ))}
        </>
    );
}

describe("groups from React", () => {
    it("moves an item into an empty group through SortableGroup, with moveBetween", () => {
        render(<Board />);
        placeAll({
            todo: { x: 0, y: 0, width: 100, height: 300 },
            done: { x: 200, y: 0, width: 100, height: 300 },
            a: { x: 0, y: 0, width: 100, height: 50 },
            b: { x: 0, y: 60, width: 100, height: 50 },
        });
        const a = screen.getByTestId("a");
        let press: ReturnType<typeof pointer> | undefined;
        act(() => {
            press = pointer(a, 50, 25);
            press.move(50, 29);
        });
        act(() => press?.move(250, 100));
        expect(screen.getByTestId("done").dataset.dndSorting).toBe("");
        expect(screen.getByTestId("b").style.translate).toBe("0px -60px");
        act(() => press?.release(250, 100));
        expect(
            screen.getByTestId("done").contains(screen.getByTestId("a")),
        ).toBe(true);
        expect(screen.getByTestId("b").style.translate).toBe("");
    });
});
