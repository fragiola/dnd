// @fragiola/dnd-react: headless, composable React drag and drop over @fragiola/dnd. It re-exports
// the shared core (D1), so an app installs and imports this one package, and adds the shared
// React parts: the drag overlay, the page-wide monitor and the drag space hook. The capabilities'
// wrappers are in their own entries (`/draggable`, `/droppable`, `/sortable`, `/swappable`); the
// drag handle is a shared part each drag source's entry re-exports, so it costs only who uses it.

export * from "@fragiola/dnd";
export {
    DragOverlay,
    type DragOverlayProps,
    type DragOverlayState,
} from "./DragOverlay";
export { type UseDragMonitorOptions, useDragMonitor } from "./useDragMonitor";
export { type UseDragSpaceOptions, useDragSpace } from "./useDragSpace";
export type {
    RenderedProps,
    RenderProp,
    WrapperProps,
} from "./utils/useRender";
