import type { ExampleMeta } from "../meta-types";

export default {
    title: "Touch",
    description:
        "A shopping list on a phone: a finger that moves scrolls the list, a finger held still for a moment picks the item up and drags it to the basket.",
    category: "mobile",
    order: 1,
    features: ["activation", "delay", "tolerance", "Pointer Events"],
    docs: "/docs/concepts/sensors-and-activation",
} satisfies ExampleMeta;
