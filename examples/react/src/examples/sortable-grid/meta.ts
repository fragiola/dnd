import type { ExampleMeta } from "../meta-types";

export default {
    title: "Sortable grid",
    description:
        "Swatches ordered in a grid: the grid strategy places the tile in reading order and steadies the preview at row edges.",
    category: "sortable",
    order: 3,
    features: ["Sortable", "grid", "arrayMove", "overflow-anchor"],
    docs: "/docs/concepts/sortable",
} satisfies ExampleMeta;
