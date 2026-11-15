// A kanban on Grid Layout (D11, S2), dev-only: Grid Layout is not on npm, so its sources are
// aliased in when `../grid-layout` is beside this repository (siblings.ts), and this scenario is
// listed only then. Each column is a `GridLayout.Item`, its list a `SortableGroup`, its cards
// `Sortable`s whose columns accept each other. A card sorts within its column and moves into
// another without dragging the grid item: dnd claims the press on `pointerdown`, and the grid
// ignores a claimed press. The grid item still drags from its header, which dnd does not claim.
// Items paint over each other (each its own stacking context), so a card crossing columns stays
// in its list as the placeholder (`translate={false}`) and a `DragOverlay` carries its copy.
import { DragOverlay } from "@fragiola/dnd-react";
import {
    moveBetween,
    Sortable,
    SortableGroup,
} from "@fragiola/dnd-react/sortable";
import { GridLayout, type Layout } from "@fragiola/grid-layout-react";
import { useState } from "react";

const COLUMNS = ["todo", "doing", "done"] as const;

type Column = (typeof COLUMNS)[number];

const LAYOUT: Layout = COLUMNS.map((id, index) => ({
    id,
    x: index * 4,
    y: 0,
    w: 4,
    h: 4,
}));

export default function GridLayoutKanban() {
    const [layout, setLayout] = useState<Layout>(LAYOUT);
    const [board, setBoard] = useState<Record<Column, readonly string[]>>({
        todo: ["card-a", "card-b", "card-c"],
        doing: ["card-d"],
        done: [],
    });
    const [log, setLog] = useState<string[]>([]);
    return (
        <div className="flex flex-col gap-4 p-4">
            <GridLayout.Root
                defaultLayout={LAYOUT}
                onLayoutChange={setLayout}
                rowHeight={60}
                gap={[8, 8]}
                aria-label="Board"
                data-testid="grid"
                className="w-[720px] border border-palette-line"
            >
                <GridLayout.Items>
                    {(item) => {
                        const column = item.id as Column;
                        return (
                            <GridLayout.Item
                                itemId={item.id}
                                data-testid={`item-${item.id}`}
                                className="flex flex-col border border-palette-line bg-palette-soft"
                            >
                                <h3
                                    data-testid={`header-${item.id}`}
                                    className="cursor-move border-b border-palette-line p-2"
                                >
                                    {item.id}
                                </h3>
                                <SortableGroup group={column} accepts={COLUMNS}>
                                    <ul
                                        data-testid={column}
                                        className="flex flex-1 flex-col gap-2 p-2"
                                    >
                                        {board[column].map((id, index) => (
                                            <Sortable
                                                key={id}
                                                id={id}
                                                index={index}
                                                group={column}
                                                accepts={COLUMNS}
                                                translate={false}
                                                onSortEnd={(event) => {
                                                    setLog((lines) => [
                                                        ...lines,
                                                        event.canceled
                                                            ? `cancel ${String(event.id)}`
                                                            : `sort ${String(event.id)} ${event.from.group}:${event.from.index} → ${event.to.group}:${event.to.index}`,
                                                    ]);
                                                    setBoard((now) =>
                                                        moveBetween(now, event),
                                                    );
                                                }}
                                            >
                                                <li
                                                    data-testid={id}
                                                    className="border border-palette-line bg-palette-base p-2 data-[dnd-dragging]:opacity-40"
                                                >
                                                    {id}
                                                </li>
                                            </Sortable>
                                        ))}
                                    </ul>
                                </SortableGroup>
                            </GridLayout.Item>
                        );
                    }}
                </GridLayout.Items>
            </GridLayout.Root>
            <DragOverlay>
                {(operation) => (
                    <div className="border border-palette-line bg-palette-base p-2 shadow-lg">
                        {String(operation.source.id)}
                    </div>
                )}
            </DragOverlay>
            <pre data-testid="layout">
                {JSON.stringify(
                    layout.map(({ id, x, y, w, h }) => ({ id, x, y, w, h })),
                )}
            </pre>
            <p data-testid="board">
                {COLUMNS.map((column) => board[column].join(" ")).join(" | ")}
            </p>
            <ol data-testid="log">
                {log.map((line, index) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: append-only
                    <li key={index}>{line}</li>
                ))}
            </ol>
        </div>
    );
}
