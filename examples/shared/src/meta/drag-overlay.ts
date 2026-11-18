import type { ExampleMeta } from "../meta-types";

export default {
    title: "A drag overlay",
    description:
        "Tags in a strip that clips its content: the tags stay put and a DragOverlay shows a copy under the pointer, out of the clipped strip.",
    category: "overlay-and-scroll",
    order: 1,
    features: ["DragOverlay", "translate={false}", "overflow: hidden"],
    docs: "/docs/api/drag-overlay",
} satisfies ExampleMeta;
