import type { ExampleMeta } from "../meta-types";

export default {
    title: "Hello DnD",
    description:
        "A card and a box in unrelated parts of the tree, with no provider between them: drag the card into the box. Neither wrapper renders an element.",
    category: "getting-started",
    order: 1,
    features: ["Draggable", "Droppable", "no provider", "accepts", "onDrop"],
    docs: "/docs/getting-started/quick-start",
} satisfies ExampleMeta;
