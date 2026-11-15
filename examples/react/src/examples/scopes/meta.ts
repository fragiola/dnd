import type { ExampleMeta } from "../meta-types";

export default {
    title: "Scopes",
    description:
        "Two independent boards on one page, each its own scope: a card meets only the columns of its board, even with the same column ids.",
    category: "droppable",
    order: 2,
    features: ["scope", "Draggable", "Droppable", "data-dnd-active"],
    docs: "/docs/concepts/no-provider-drag-space",
} satisfies ExampleMeta;
