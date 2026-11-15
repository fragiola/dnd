import type { ExampleMeta } from "../meta-types";

export default {
    title: "Sorting by keyboard",
    description:
        "Pick up a task with Space, move it one place at a time with the arrows, across lists, and hear each position in the app's words.",
    category: "keyboard",
    order: 2,
    features: [
        "Sortable",
        "keyboard",
        "describedBy",
        "onSortOver",
        "live region",
    ],
    docs: "/docs/concepts/keyboard-and-accessibility",
} satisfies ExampleMeta;
