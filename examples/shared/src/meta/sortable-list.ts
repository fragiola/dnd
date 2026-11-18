import type { ExampleMeta } from "../meta-types";

export default {
    title: "Sortable list",
    description:
        "A vertical list with no wrapper around it: the neighbours shift while a card moves, and the app applies the drop with arrayMove.",
    category: "sortable",
    order: 1,
    features: ["Sortable", "onSortEnd", "arrayMove", "transition: translate"],
    docs: "/docs/concepts/sortable",
} satisfies ExampleMeta;
