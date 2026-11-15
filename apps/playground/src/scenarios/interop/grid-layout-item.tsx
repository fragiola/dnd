// dnd inside Grid Layout (D11), dev-only: Grid Layout is not on npm, so its sources are aliased in
// when `../grid-layout` is beside this repository (siblings.ts), and this scenario is listed only
// then. A dnd card inside a `GridLayout.Item` drags without moving the item (dnd claims the press
// on `pointerdown`, and the grid ignores a claimed press); a card dropped on the grid (a
// `Droppable` around `GridLayout.Root`) runs Grid Layout's own `item.add` through `gridLayoutRef`.
import { Draggable } from "@fragiola/dnd-react/draggable";
import { Droppable } from "@fragiola/dnd-react/droppable";
import {
    GridLayout,
    type Layout,
    useGridLayoutRef,
} from "@fragiola/grid-layout-react";
import { useRef, useState } from "react";

const LAYOUT: Layout = [
    { id: "a", x: 0, y: 0, w: 4, h: 2 },
    { id: "b", x: 4, y: 0, w: 4, h: 2 },
];

export default function GridLayoutItem() {
    const gridLayoutRef = useGridLayoutRef();
    const [items, setItems] = useState<Layout>(LAYOUT);
    const [log, setLog] = useState<string[]>([]);
    const added = useRef(0);
    const write = (line: string) => setLog((lines) => [...lines, line]);
    return (
        <div className="flex flex-col gap-4 p-4">
            <div className="flex gap-4">
                <Draggable id="new-card" type="new">
                    <div
                        data-testid="new-card"
                        className="w-28 border border-palette-line p-3"
                    >
                        New item
                    </div>
                </Draggable>
                <Droppable
                    id="tray"
                    onDrop={(event) =>
                        write(
                            `drop ${String(event.operation.source.id)} on tray`,
                        )
                    }
                >
                    <div
                        data-testid="tray"
                        className="h-16 w-40 border border-dashed border-palette-line p-2"
                    >
                        Tray
                    </div>
                </Droppable>
            </div>
            <Droppable
                id="grid"
                accepts={["new"]}
                onDrop={() => {
                    added.current += 1;
                    const result = gridLayoutRef.current?.model.run(
                        "item.add",
                        { item: { id: `n${added.current}`, w: 2, h: 1 } },
                    );
                    write(`item.add ${result?.ok ? "ok" : "refused"}`);
                }}
            >
                <GridLayout.Root
                    gridLayoutRef={gridLayoutRef}
                    defaultLayout={LAYOUT}
                    onLayoutChange={setItems}
                    rowHeight={60}
                    gap={[8, 8]}
                    aria-label="Grid"
                    data-testid="grid"
                    className="w-[720px] border border-palette-line"
                >
                    <GridLayout.Items>
                        {(item) => (
                            <GridLayout.Item
                                itemId={item.id}
                                data-testid={`item-${item.id}`}
                                className="border border-palette-line bg-palette-soft p-2"
                            >
                                {item.id === "a" ? (
                                    <Draggable id="inner-card">
                                        <div
                                            data-testid="inner-card"
                                            className="w-24 border border-palette-line p-2"
                                        >
                                            dnd card
                                        </div>
                                    </Draggable>
                                ) : (
                                    item.id
                                )}
                            </GridLayout.Item>
                        )}
                    </GridLayout.Items>
                </GridLayout.Root>
            </Droppable>
            <pre data-testid="layout">
                {JSON.stringify(
                    items.map(({ id, x, y, w, h }) => ({ id, x, y, w, h })),
                )}
            </pre>
            <ol data-testid="log">
                {log.map((line, index) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: append-only
                    <li key={index}>{line}</li>
                ))}
            </ol>
        </div>
    );
}
