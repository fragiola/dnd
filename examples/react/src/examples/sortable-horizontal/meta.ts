import type { ExampleMeta } from "../meta-types";

export default {
    title: "Horizontal list",
    description:
        "A toolbar the user rearranges: the horizontalList strategy over tools of different widths, each its own import.",
    category: "sortable",
    order: 2,
    features: ["Sortable", "horizontalList", "arrayMove"],
    docs: "/docs/api/sortable",
    height: 300,
} satisfies ExampleMeta;
