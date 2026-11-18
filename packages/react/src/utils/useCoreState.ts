// A part's state from the core (D8): the core's state slot (`createSlot` in
// `@fragiola/dnd/adapter`) read through `useSyncExternalStore`. The slot keeps its snapshot's
// identity until a field changes, so a part re-renders only when its own state does.
import type { StateSlot } from "@fragiola/dnd/adapter";
import * as React from "react";

/** A slot's state, re-rendering on its changes only; the fallback on the server. */
export function useSlotState<State extends object>(
    slot: StateSlot<State>,
): State {
    return React.useSyncExternalStore(
        slot.subscribe,
        slot.getState,
        slot.getState,
    );
}
