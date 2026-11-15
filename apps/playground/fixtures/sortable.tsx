// The unstyled sortable and swappable fixture Playwright drives, the same page left-to-right
// (`sortable/`) and right-to-left (`sortable-rtl/`): a vertical list, a horizontal list and a grid
// with no wrapper around them, a kanban whose columns accept each other (the empty one through
// `SortableGroup`) beside a column that refuses them, swaps within and across groups, a list in a
// scroll container (keyboard steps scroll their slot into view), and the render counter. The app owns the data: each list applies `onSortEnd` / `onSwap` with the
// helpers, and writes one line to `log` per end (never during a preview, which commits nothing).
import {
    grid,
    horizontalList,
    moveBetween,
    Sortable,
    SortableGroup,
    type SortEndEvent,
    type SortStrategy,
} from "@fragiola/dnd-react/sortable";
import {
    type SwapEvent,
    Swappable,
    swapBetween,
} from "@fragiola/dnd-react/swappable";
import { useState } from "react";
import { mount } from "./mount";

type Lists = Readonly<Record<string, readonly string[]>>;

const ids = (prefix: string, count: number) =>
    Array.from({ length: count }, (_, i) => `${prefix}-${"abcdef"[i]}`);

/** What a sort end says, for the log: `sort v-a v:0 → v:2`, or `cancel v-a`. */
const sortLine = (event: SortEndEvent) =>
    event.canceled
        ? `cancel ${String(event.id)}`
        : `sort ${String(event.id)} ${event.from.group}:${event.from.index} → ${event.to.group}:${event.to.index}`;

/** What a swap says: `swap s1-a ⇄ s1-c`, `swap s1-a ⇄ none` or `cancel s1-a`. */
const swapLine = (event: SwapEvent) =>
    event.canceled
        ? `cancel ${String(event.source.id)}`
        : `swap ${String(event.source.id)} ⇄ ${event.target ? String(event.target.id) : "none"}`;

function Fixture() {
    const [lists, setLists] = useState<Lists>({
        v: ids("v", 4),
        h: ids("h", 4),
        g: ids("g", 6),
        locked: ids("locked", 2),
        todo: ids("todo", 3),
        doing: ids("doing", 1),
        done: [],
        s1: ids("s1", 4),
        s2: ids("s2", 2),
        sc: ids("sc", 6),
    });
    const [log, setLog] = useState<string[]>([]);
    const sorted = (event: SortEndEvent) => {
        setLog((lines) => [...lines, sortLine(event)]);
        setLists((all) => moveBetween(all, event));
    };
    const swapped = (event: SwapEvent) => {
        setLog((lines) => [...lines, swapLine(event)]);
        setLists((all) => swapBetween(all, event));
    };
    /** One list's items, in the app's order, each a `Sortable` (no wrapper around them). */
    const items = (
        group: string,
        scope: string,
        options: {
            strategy?: SortStrategy;
            accepts?: readonly string[];
        } = {},
    ) =>
        (lists[group] ?? []).map((id, index) => (
            <Sortable
                key={id}
                id={id}
                index={index}
                group={group}
                scope={scope}
                {...options}
                onSortEnd={sorted}
            >
                <li data-testid={id} className="item">
                    {id}
                </li>
            </Sortable>
        ));
    const order = (group: string) => (
        <output data-testid={`order-${group}`}>
            {(lists[group] ?? []).join(" ")}
        </output>
    );
    const kanban = ["todo", "doing", "done"];
    return (
        <>
            <p>
                commits <output data-testid="commits" />
            </p>
            <section>
                {order("v")}
                <ul data-testid="v" className="column">
                    {items("v", "v")}
                </ul>
            </section>
            <section>
                {order("h")}
                <ul data-testid="h" className="row">
                    {items("h", "h", { strategy: horizontalList })}
                </ul>
            </section>
            <section>
                {order("g")}
                <ul data-testid="g" className="grid">
                    {items("g", "g", { strategy: grid })}
                </ul>
            </section>
            <section className="board">
                {/* refuses the others, and they never take it */}
                <ul data-testid="locked" className="column">
                    {items("locked", "k")}
                </ul>
                <ul data-testid="todo" className="column">
                    {items("todo", "k", { accepts: kanban })}
                </ul>
                <ul data-testid="doing" className="column">
                    {items("doing", "k", { accepts: kanban })}
                </ul>
                {/* empty: only its container lets an item in */}
                <SortableGroup group="done" scope="k" accepts={kanban}>
                    <ul data-testid="done" className="column tall">
                        {items("done", "k", { accepts: kanban })}
                    </ul>
                </SortableGroup>
            </section>
            <p>
                {order("locked")} | {order("todo")} | {order("doing")} |{" "}
                {order("done")}
            </p>
            <section className="board">
                {["s1", "s2"].map((group) => (
                    <div key={group} data-testid={group} className="row">
                        {(lists[group] ?? []).map((id, index) => (
                            <Swappable
                                key={id}
                                id={id}
                                index={index}
                                group={group}
                                scope="s"
                                accepts={["s1", "s2"]}
                                onSwap={swapped}
                            >
                                <div data-testid={id} className="item">
                                    {id}
                                </div>
                            </Swappable>
                        ))}
                    </div>
                ))}
            </section>
            <p>
                {order("s1")} | {order("s2")}
            </p>
            <section>
                {order("sc")}
                {/* taller than its box: a keyboard step scrolls its slot into view */}
                <ul data-testid="sc" className="column scroll">
                    {items("sc", "sc")}
                </ul>
            </section>
            <ol data-testid="log">
                {log.map((line, index) => (
                    // the log only grows
                    // biome-ignore lint/suspicious/noArrayIndexKey: append-only
                    <li key={index}>{line}</li>
                ))}
            </ol>
        </>
    );
}

/** Mounts the fixture; the page's `<html dir>` sets the direction. */
export function mountSortableFixture(): void {
    mount(<Fixture />);
}
