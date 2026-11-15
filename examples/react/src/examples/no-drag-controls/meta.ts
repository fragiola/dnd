import type { ExampleMeta } from "../meta-types";

export default {
    title: "Controls that never drag",
    description:
        "A draggable card with a field, a button, a switch and selectable notes: the controls work as usual, and only the card's empty space starts a drag.",
    category: "draggable",
    order: 2,
    features: ["Draggable", "data-dnd-no-drag", "native controls"],
    docs: "/docs/concepts/sensors-and-activation",
} satisfies ExampleMeta;
