import type { ExampleMeta } from "../meta-types";

export default {
    title: "Support dispatch",
    description:
        "A live support desk: tickets stream into triage with priorities and ticking SLAs, and you drag them to agents who have the skill and the room, sort a queue, or swap two agents' tickets. A full agent refuses the drop, and a new ticket never interrupts a drag.",
    category: "apps",
    order: 1,
    features: [
        "Sortable",
        "SortableGroup",
        "accepts predicate",
        "Droppable",
        "Swappable",
        "useDragMonitor",
        "keyboard",
        "live data",
    ],
    docs: "/docs/guides/kanban",
    layout: "fill",
    height: 600,
} satisfies ExampleMeta;
