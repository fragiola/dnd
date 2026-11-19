// @fragiola/dnd-angular: headless, composable Angular drag and drop over @fragiola/dnd. It
// re-exports the shared core (D1), so an app installs and imports this one package, and adds the
// shared Angular parts: the drag overlay template and the injection functions. The capabilities'
// directives are in their own entries (`/draggable`, `/droppable`, `/sortable`, `/swappable`);
// the drag handle is a shared part each drag source's entry re-exports.

export * from "@fragiola/dnd";
// What the adapter's own capability entries build on: an entry imports another only through its
// public API (ng-packagr bundles each one alone), and a capability never imports another (D3). Not
// an app's API: the `ɵ` says so.
export { DndDragHandle as ɵDndDragHandle } from "./lib/directives/drag-handle.directive";
export {
    DndDragOverlay,
    type DragOverlayContext,
    type DragOverlayState,
} from "./lib/directives/drag-overlay.directive";
export {
    type InjectDragMonitorOptions,
    injectDragMonitor,
} from "./lib/inject/inject-drag-monitor";
export {
    type InjectDragSpaceOptions,
    injectDragSpace,
    type OptionsOf,
} from "./lib/inject/inject-drag-space";
export {
    defined as ɵdefined,
    optionalBoolean as ɵoptionalBoolean,
} from "./lib/utils/helpers";
export { flag as ɵflag } from "./lib/utils/host-attributes";
export {
    injectPart as ɵinjectPart,
    type PartBinding as ɵPartBinding,
} from "./lib/utils/part";
