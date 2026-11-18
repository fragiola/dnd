// @fragiola/dnd/adapter: what only a framework adapter calls (`@fragiola/dnd-react`, and the Vue
// and Angular adapters to come), so every adapter only renders and wires (D4: "what only an
// adapter calls"). It holds the decisions an adapter would otherwise re-implement: a part's state
// slot, the option-change rule, the part and source connections (with the drag handle link
// through the DOM), the overlay's following of a drag, and each capability's binding. It is part
// of the shared core: it imports no capability, and no adapter re-exports it. An app never
// imports it: it is not a stable app API.

export {
    draggableBinding,
    droppableBinding,
    handleRest,
    sortableBinding,
    sortableGroupBinding,
    swappableBinding,
} from "./core/bindings";
export {
    type Connection,
    connectHandle,
    connectPart,
    connectSource,
    type HandleConnection,
    type HandleOption,
    type Register,
} from "./core/connect";
export { followOverlay, type OverlayView } from "./core/follow-overlay";
export { optionsChanged, withLatestCallbacks } from "./core/options";
export {
    createSlot,
    type StateSlot,
    type StateSource,
} from "./core/slot";
