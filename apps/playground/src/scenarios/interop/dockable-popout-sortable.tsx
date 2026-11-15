// A sortable list in a Dockable popout (D4, D11, S2): Dockable carries the panel's content into a
// native window without remounting it, and every sortable item registers in its own document's
// drag space, found from `ownerDocument` when the sort starts. So in the popout the list sorts
// in that window's space (a drag never crosses documents), the app applies `onSortEnd` as usual,
// and after docking back it sorts in the main window again. The popout page is
// `public/popout.html`; the e2e spec drives the window Playwright sees open.
import { arrayMove, Sortable } from "@fragiola/dnd-react/sortable";
import {
    createModel,
    Dockable,
    type LayoutJson,
    MAIN_LAYOUT,
    type RowNode,
    type TabsetNode,
    useModelState,
} from "@fragiola/dockable-react";
import { type ReactNode, useState } from "react";

type Types = { tabs: { list: { title: string } } };

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
                        id: "list",
                        component: "list",
                        label: "List",
                        data: { title: "List" },
                    },
                ],
            },
            {
                type: "tabset",
                id: "right",
                children: [
                    {
                        id: "notes",
                        component: "list",
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
        <Dockable.TabSet node={child} data-testid={`tabset-${child.id}`}>
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

export default function DockablePopoutSortable() {
    const [model] = useState(() => {
        const created = createModel<Types>(json);
        created.run("layout.configure", {
            defaults: { tab: { poppable: true } },
        });
        return created;
    });
    const [items, setItems] = useState(["one", "two", "three", "four"]);
    const [log, setLog] = useState<string[]>([]);
    const popped = useModelState(
        (_state, current) =>
            current.get("layout-id-by", { nodeId: "list" }) !== MAIN_LAYOUT,
        { model },
    );
    const toggle = () => {
        if (!popped) {
            model.run("tab.popout", { tabId: "list" });
            return;
        }
        // the tabset it left may be gone (an emptied tabset closes): the main layout's first
        const target = model.get("tabsets", { layoutId: MAIN_LAYOUT })[0];
        if (target)
            model.run("tab.move", {
                tabId: "list",
                to: target.id,
                location: "center",
                index: -1,
            });
    };
    return (
        <div className="flex flex-col gap-4 p-4">
            <div className="flex items-center gap-4">
                <button
                    type="button"
                    className="rounded border border-palette-line px-3 py-1"
                    onClick={toggle}
                >
                    {popped ? "Dock the list back" : "Pop the list out"}
                </button>
                <output data-testid="order">{items.join(" ")}</output>
            </div>
            <Dockable.Root
                model={model}
                popoutURL="/popout.html"
                supportsPopout
                className="h-72"
            >
                <Dockable.Row<Types>>{renderNode}</Dockable.Row>
                <Dockable.Panels<Types>>
                    {(tab) => (
                        <Dockable.Panel node={tab}>
                            {tab.id === "list" ? (
                                <ul
                                    data-testid="list"
                                    className="flex flex-col gap-2 p-3"
                                >
                                    {items.map((id, index) => (
                                        <Sortable
                                            key={id}
                                            id={id}
                                            index={index}
                                            group="popout"
                                            onSortEnd={(event) => {
                                                setLog((lines) => [
                                                    ...lines,
                                                    event.canceled
                                                        ? `cancel ${String(event.id)}`
                                                        : `sort ${String(event.id)} ${event.from.index} → ${event.to.index}`,
                                                ]);
                                                if (!event.canceled)
                                                    setItems((now) =>
                                                        arrayMove(
                                                            now,
                                                            event.from.index,
                                                            event.to.index,
                                                        ),
                                                    );
                                            }}
                                        >
                                            <li
                                                data-testid={`item-${id}`}
                                                className="border border-palette-line p-2"
                                            >
                                                {id}
                                            </li>
                                        </Sortable>
                                    ))}
                                </ul>
                            ) : (
                                <p className="p-4">{tab.data.title}</p>
                            )}
                        </Dockable.Panel>
                    )}
                </Dockable.Panels>
                <Dockable.Popout<Types>>
                    {() => <Dockable.Row<Types>>{renderNode}</Dockable.Row>}
                </Dockable.Popout>
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
