import type { ExampleMeta } from "../meta-types";

export default {
    title: "Sortable handle",
    description:
        "A checklist sorted by its grips: a DragHandle inside a Sortable is the only place a sort starts, and the row's text stays selectable.",
    category: "sortable",
    order: 5,
    features: ["Sortable", "DragHandle", "arrayMove"],
    docs: "/docs/api/sortable",
    height: 360,
} satisfies ExampleMeta;
