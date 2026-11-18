import type { ExampleMeta } from "../meta-types";

export default {
    title: "Kanban",
    description:
        "Columns as sortable groups: cards sort and move where a column accepts them, into an empty column through SortableGroup.",
    category: "sortable",
    order: 4,
    features: ["Sortable", "SortableGroup", "accepts", "moveBetween"],
    docs: "/docs/guides/kanban",
    height: 520,
} satisfies ExampleMeta;
