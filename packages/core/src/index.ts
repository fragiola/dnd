// @fragiola/dnd: the framework-free shared core of the headless drag and drop (D3, D5): the drag
// space, the collision strategies, events, auto-scroll, the overlay geometry and the types.
// Every capability entry (`/draggable`, `/droppable`) imports this core and never another
// capability.

export {
    type AutoScroll,
    type AutoScrollOptions,
    type AutoScrollSession,
    autoScroll,
} from "./core/auto-scroll";
export {
    closestCenter,
    pointerWithin,
    rectIntersection,
} from "./core/collision";
export { grabOffset, type OverlayStyle, overlayStyle } from "./core/overlay";
export {
    type CreateDragSpaceOptions,
    createDragSpace,
    DEFAULT_SCOPE,
    type DragSpace,
    getDragSpace,
    type SubscribeOptions,
    subscribe,
} from "./core/space";
export type * from "./core/types";
