import type { ExampleMeta } from "../meta-types";

export default {
    title: "Right to left",
    description:
        "An Arabic board laid out right to left: pointer drags need nothing, and the keyboard's targets mode follows the reading order.",
    category: "styling",
    order: 1,
    features: ["dir=rtl", "keyboard", "mode: targets", "logical properties"],
    docs: "/docs/concepts/keyboard-and-accessibility",
} satisfies ExampleMeta;
