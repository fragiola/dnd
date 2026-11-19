// @fragiola/dnd-vue/swappable: the core's swappable entry, re-exported (D1), and its Vue
// component and composable. It imports only the shared core, never another capability (D3, S1);
// the shared `DragHandle`, re-exported here, works inside a `Swappable`.

export * from "@fragiola/dnd/swappable";
export { DragHandle, type DragHandleProps } from "../components/drag-handle";
export { Swappable, type SwappableProps } from "./swappable";
export {
    type SwappableBindings,
    type UseSwappableOptions,
    type UseSwappableResult,
    useSwappable,
} from "./use-swappable";
