// @fragiola/dnd-react/swappable: the core's swappable entry, re-exported (D1), and its React
// wrapper and hook. It imports only the shared core, never another capability (D3, S1); the
// shared `DragHandle`, re-exported here, works inside a `Swappable`.

export * from "@fragiola/dnd/swappable";
export { DragHandle, type DragHandleProps } from "../DragHandle";
export { Swappable, type SwappableProps } from "./Swappable";
export {
    type SwappableHookProps,
    type UseSwappableOptions,
    type UseSwappableResult,
    useSwappable,
} from "./useSwappable";
