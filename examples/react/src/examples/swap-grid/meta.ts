import type { ExampleMeta } from "../meta-types";

export default {
    title: "Swap grid",
    description:
        "Dashboard widgets that trade places: only the target moves into the dragged widget's place, and the app applies it with swapItems.",
    category: "swappable",
    order: 1,
    features: ["Swappable", "onSwap", "swapItems", "data-dnd-swap-target"],
    docs: "/docs/concepts/swappable",
} satisfies ExampleMeta;
