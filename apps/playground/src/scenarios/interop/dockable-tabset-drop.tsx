// A dnd card dropped on a Dockable tabset adds a tab, through Dockable's own command
// (`model.run("tab.add", …)`, D11): the `Droppable` wraps the `Dockable.TabSet` element itself,
// which forwards props and ref like every Fragiola primitive, so both libraries' attributes sit on
// one element (`data-layout-path` and `data-dnd-*`).

import { Draggable } from "@fragiola/dnd-react/draggable";
import { Droppable } from "@fragiola/dnd-react/droppable";
import {
    createModel,
    Dockable,
    type LayoutJson,
    type Model,
    type RowNode,
    type TabsetNode,
} from "@fragiola/dockable-react";
import { type ReactNode, useState } from "react";

type Types = { tabs: { note: { text: string } } };

const json: LayoutJson<Types> = {
    version: 1,
    root: {
        type: "row",
        children: [
            {
                type: "tabset",
                id: "left",
                children: [
                    { component: "note", label: "One", data: { text: "One" } },
                ],
            },
            {
                type: "tabset",
                id: "right",
                children: [
                    { component: "note", label: "Two", data: { text: "Two" } },
                ],
            },
        ],
    },
};

const CARDS = ["Alpha", "Beta"];

function layout(model: Model<Types>) {
    const renderNode = (
        child: TabsetNode<Types> | RowNode<Types>,
    ): ReactNode => {
        if (child.type === "row")
            return <Dockable.Row node={child}>{renderNode}</Dockable.Row>;
        return (
            <Droppable
                id={child.id}
                accepts={["card"]}
                onDrop={(event) => {
                    const label = String(event.operation.source.data);
                    model.run("tab.add", {
                        component: "note",
                        label,
                        data: { text: label },
                        to: child.id,
                    });
                }}
            >
                <Dockable.TabSet
                    node={child}
                    data-testid={`tabset-${child.id}`}
                    className="border border-palette-line data-[dnd-over]:outline data-[dnd-over]:outline-2"
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
            </Droppable>
        );
    };
    return renderNode;
}

export default function DockableTabsetDrop() {
    const [model] = useState(() => createModel<Types>(json));
    const [renderNode] = useState(() => layout(model));
    return (
        <div className="flex flex-col gap-4 p-4">
            <div className="flex gap-4">
                {CARDS.map((card) => (
                    <Draggable key={card} id={card} type="card" data={card}>
                        <div
                            data-testid={`card-${card}`}
                            className="w-28 border border-palette-line p-3"
                        >
                            {card}
                        </div>
                    </Draggable>
                ))}
            </div>
            <Dockable.Root model={model} className="h-72">
                <Dockable.Row<Types>>{renderNode}</Dockable.Row>
                <Dockable.Panels<Types>>
                    {(tab) => (
                        <Dockable.Panel node={tab}>
                            <p className="p-4">{tab.data.text}</p>
                        </Dockable.Panel>
                    )}
                </Dockable.Panels>
            </Dockable.Root>
        </div>
    );
}
