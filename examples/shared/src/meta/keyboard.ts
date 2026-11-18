import type { ExampleMeta } from "../meta-types";

export default {
    title: "Keyboard",
    description:
        "Grab a card with Space, move it with the arrows by a step or column to column, drop it with Space: a live region says each step in the app's words.",
    category: "keyboard",
    order: 1,
    features: [
        "keyboard",
        "mode: targets",
        "describedBy",
        "useDragMonitor",
        "live region",
    ],
    docs: "/docs/concepts/keyboard-and-accessibility",
} satisfies ExampleMeta;
