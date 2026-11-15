import type { ExampleMeta } from "../meta-types";

export default {
    title: "Inside Dockable panels",
    description:
        "Cards dragged out of a Dockable panel into another panel's archive, still dragging after Dockable moves their tab to another tabset.",
    category: "interop",
    order: 2,
    features: [
        "Draggable",
        "Droppable",
        "Dockable.Panel",
        "tab.move",
        "moved elements",
    ],
    docs: "/docs/guides/with-dockable",
    height: 520,
} satisfies ExampleMeta;
