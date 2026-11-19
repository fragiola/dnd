// Type fixtures, checked by `tsc` (not run): the components take their capability's options as
// props (callbacks included) and any other attribute (passed on to the element), their default slot is scoped with the part's
// state, and the composables return `{ state, props }` with readonly refs. `@ts-expect-error`
// marks what must not compile.
import { h, ref } from "vue";
import {
    DragOverlay,
    type DragOverlaySlotProps,
    type DropEvent,
    useDragMonitor,
    useDragSpace,
} from "../../src";
import {
    Draggable,
    type DraggableState,
    DragHandle,
    useDraggable,
} from "../../src/draggable";
import { Droppable, useDroppable } from "../../src/droppable";
import {
    Sortable,
    SortableGroup,
    type SortEndEvent,
    useSortable,
    useSortableGroup,
} from "../../src/sortable";
import { type SwapEvent, Swappable, useSwappable } from "../../src/swappable";

h(Draggable, { id: "a", disabled: true, as: "li", class: "card" });
h(Draggable, {
    id: 1,
    translate: false,
    onDragStart: (event) => event.operation.source.id,
});
// @ts-expect-error an id is required
h(Draggable, { type: "task" });
// @ts-expect-error `translate` is a boolean
h(Draggable, { id: "a", translate: "no" });
h(
    Draggable,
    { id: "a" },
    {
        default: ({ state }: { state: DraggableState }) =>
            h("li", { class: state.dragging ? "on" : undefined }),
    },
);
h(DragHandle, { describedBy: "help" }, () => h("span"));
h(Droppable, {
    id: "z",
    accepts: ["task"],
    onDrop: (event: DropEvent) => event,
});
// @ts-expect-error `accepts` is a list or a predicate
h(Droppable, { id: "z", accepts: "task" });
h(Sortable, {
    id: "a",
    index: 0,
    group: "list",
    onSortEnd: (event: SortEndEvent) => event.to.index,
});
// @ts-expect-error an item needs its index
h(Sortable, { id: "a", group: "list" });
h(SortableGroup, { group: "list", accepts: ["done"] });
h(Swappable, {
    id: "a",
    index: 0,
    group: "row",
    onSwap: (event: SwapEvent) => event,
});
h(
    DragOverlay,
    { scope: "board" },
    {
        default: ({ operation }: DragOverlaySlotProps) =>
            String(operation.source.id),
    },
);

const draggable = useDraggable(() => ({ id: "a", describedBy: "help" }));
const dragging: boolean = draggable.state.value.dragging;
const part: "draggable" = draggable.props.value["data-dnd-part"];
// @ts-expect-error the state is read-only
draggable.state.value = { dragging, disabled: false };
const droppable = useDroppable(ref({ id: "z" }));
const over: boolean = droppable.state.value.over;
const sorting: boolean = useSortable({ id: "a", index: 0, group: "list" }).state
    .value.sorting;
const group: string = useSortableGroup({ group: "list" }).props.value[
    "data-dnd-id"
];
const swap: "swappable" = useSwappable({ id: "a", index: 0, group: "row" })
    .props.value["data-dnd-part"];
useDragMonitor(
    (event) => event.type,
    () => ({ scope: "board" }),
);
const space = useDragSpace().value?.get("draggable-ids");

export const used = [part, over, sorting, group, swap, space];
