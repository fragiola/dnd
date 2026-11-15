import type { ExampleMeta } from "../meta-types";

export default {
    title: "Auto-scroll",
    description:
        "A meeting dragged near the bottom edge of a long list of days scrolls the list. Auto-scroll is opt-in, given to each draggable.",
    category: "overlay-and-scroll",
    order: 2,
    features: ["autoScroll", "Draggable", "scroll containers"],
    docs: "/docs/api/core",
} satisfies ExampleMeta;
