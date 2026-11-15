// A dnd draggable inside a Dockable panel keeps working after its tab moves to another tabset
// (D11): Dockable re-parents the panel's content without remounting it, and dnd measures at
// drag start, so the card drags from wherever it is now. The move runs through Dockable's model
// (`model.run("tab.move", …)`), as any app would.

import { Draggable } from "@fragiola/dnd-react/draggable";
import { Droppable } from "@fragiola/dnd-react/droppable";
import {
    createModel,
    Dockable,
    type LayoutJson,
    type RowNode,
    type TabsetNode,
} from "@fragiola/dockable-react";
import { type ReactNode, useState } from "react";

type Types = { tabs: { cards: { title: string } } };

const json: LayoutJson<Types> = {
    version: 1,
    root: {
        type: "row",
        children: [
            {
                type: "tabset",
                id: "left",
                children: [
                    {
                        id: "cards",
                        component: "cards",
                        label: "Cards",
                        data: { title: "Cards" },
                    },
                ],
            },
            {
                type: "tabset",
                id: "right",
                children: [
                    {
                        id: "notes",
                        component: "cards",
                        label: "Notes",
                        data: { title: "Notes" },
                    },
                ],
            },
        ],
    },
};

function renderNode(child: TabsetNode<Types> | RowNode<Types>): ReactNode {
    if (child.type === "row")
        return <Dockable.Row node={child}>{renderNode}</Dockable.Row>;
    return (
        <Dockable.TabSet
            node={child}
            data-testid={`tabset-${child.id}`}
            className="border border-palette-line"
        >
            <Dockable.TabList<Types>
                aria-label={`Tabs of ${child.id}`}
                className="flex"
            >
                {(tab) => (
                    <Dockable.Tab node={tab} className="px-3 py-1">
                        {tab.label}
                    </Dockable.Tab>
                )}
            </Dockable.TabList>
            <Dockable.TabSetContent />
        </Dockable.TabSet>
    );
}

export default function DockablePanelMove() {
    const [model] = useState(() => createModel<Types>(json));
    const [log, setLog] = useState<string[]>([]);
    return (
        <div className="flex flex-col gap-4 p-4">
            <div className="flex items-center gap-4">
                <button
                    type="button"
                    className="rounded border border-palette-line px-3 py-1"
                    onClick={() =>
                        model.run("tab.move", { tabId: "cards", to: "right" })
                    }
                >
                    Move Cards to the right tabset
                </button>
                <Droppable
                    id="bin"
                    onDrop={(event) =>
                        setLog((lines) => [
                            ...lines,
                            `drop ${String(event.operation.source.id)} on bin`,
                        ])
                    }
                >
                    <div
                        data-testid="bin"
                        className="h-16 w-40 border border-dashed border-palette-line p-2 data-[dnd-over]:bg-palette-soft"
                    >
                        Bin
                    </div>
                </Droppable>
            </div>
            <Dockable.Root model={model} className="h-72">
                <Dockable.Row<Types>>{renderNode}</Dockable.Row>
                <Dockable.Panels<Types>>
                    {(tab) => (
                        <Dockable.Panel node={tab}>
                            {tab.id === "cards" ? (
                                <Draggable id="panel-card">
                                    <div
                                        data-testid="panel-card"
                                        className="m-4 w-32 border border-palette-line p-3 data-[dnd-dragging]:opacity-70"
                                    >
                                        A card
                                    </div>
                                </Draggable>
                            ) : (
                                <p className="p-4">{tab.data.title}</p>
                            )}
                        </Dockable.Panel>
                    )}
                </Dockable.Panels>
            </Dockable.Root>
            <ol data-testid="log">
                {log.map((line, index) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: append-only
                    <li key={index}>{line}</li>
                ))}
            </ol>
        </div>
    );
}
