// @fragiola/dnd-vue: headless, composable Vue drag and drop over @fragiola/dnd. It re-exports the
// shared core (D1), so an app installs and imports this one package, and adds the shared Vue
// parts: the drag overlay, the page-wide monitor and the drag space composable. The capabilities'
// components are in their own entries (`/draggable`, `/droppable`, `/sortable`, `/swappable`);
// the drag handle is a shared part each drag source's entry re-exports, so it costs only who uses
// it.

export * from "@fragiola/dnd";
export {
    DragOverlay,
    type DragOverlayProps,
    type DragOverlaySlotProps,
    type DragOverlaySlots,
    type DragOverlayState,
} from "./components/drag-overlay";
export {
    type UseDragMonitorOptions,
    useDragMonitor,
} from "./composables/use-drag-monitor";
export {
    type UseDragSpaceOptions,
    useDragSpace,
} from "./composables/use-drag-space";
export type { ElementRef } from "./utils/element-ref";
export type {
    AsProp,
    WrapperComponent,
    WrapperProps,
    WrapperSlotProps,
    WrapperSlots,
} from "./utils/wrap";
