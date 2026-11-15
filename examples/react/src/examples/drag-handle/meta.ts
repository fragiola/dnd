import type { ExampleMeta } from "../meta-types";

export default {
    title: "Drag handle",
    description:
        "Cards that move only by their grip, which is also their tab stop: the text of a card stays selectable.",
    category: "draggable",
    order: 1,
    features: ["DragHandle", "Draggable", "Droppable", "touch-action"],
    docs: "/docs/api/drag-handle",
} satisfies ExampleMeta;
