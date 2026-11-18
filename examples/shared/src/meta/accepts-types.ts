import type { ExampleMeta } from "../meta-types";

export default {
    title: "Typed sources, refusing targets",
    description:
        "Files typed by kind, and folders that take a list of types or a predicate: a folder marks a drag it would take, and refuses the rest.",
    category: "droppable",
    order: 1,
    features: ["accepts", "type", "data-dnd-refused", "data-dnd-active"],
    docs: "/docs/api/droppable",
} satisfies ExampleMeta;
