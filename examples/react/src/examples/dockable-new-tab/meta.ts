import type { ExampleMeta } from "../meta-types";

export default {
    title: "A new Dockable tab",
    description:
        "Drop a card on a Dockable tabset and it opens as a tab through tab.add. A drop rule asks Dockable's model.can, so a full tabset refuses while hovered.",
    category: "interop",
    order: 1,
    features: [
        "Droppable",
        "Dockable.TabSet",
        "tab.add",
        "space.use",
        "model.can",
    ],
    docs: "/docs/guides/with-dockable",
    height: 520,
} satisfies ExampleMeta;
