import type { ExampleMeta } from "../meta-types";

export default {
    title: "Sortable in Dockable panels",
    description:
        "A playlist and a queue in Dockable panels: songs sort and move between panels, and keep sorting after their tab moves to another tabset.",
    category: "interop",
    order: 3,
    features: [
        "Sortable",
        "SortableGroup",
        "DragOverlay",
        "translate={false}",
        "Dockable.Panel",
        "tab.move",
    ],
    docs: "/docs/guides/with-dockable",
    height: 520,
} satisfies ExampleMeta;
