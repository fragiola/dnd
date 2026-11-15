// Type fixtures (compiled by `pnpm typecheck`, never run): the drag space is the engine, its
// surface exactly the five verbs, `use`, `subscribe` and `adapter`, each verb typed by its keys.
import type { DragSpace } from "../../src";

/** `true` when `A` and `B` are the same union. */
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

export const spaceSurface: Same<
    keyof DragSpace,
    "run" | "can" | "check" | "get" | "is" | "use" | "subscribe" | "adapter"
> = true;

export function verbs(space: DragSpace): void {
    const operation = space.get("operation");
    const ids: readonly (string | number)[] = space.get("draggable-ids");
    const state = space.get("droppable-state-by", { droppableId: "z" });
    const over: boolean | undefined = state?.over;
    const dragging: boolean = space.is("dragging");
    const allowed: boolean = space.can("drop", {
        draggableId: "a",
        droppableId: "z",
    });
    const result = space.run("cancel");
    void [operation, ids, over, dragging, allowed, result];

    // @ts-expect-error: a key that takes an id needs its payload
    space.get("draggable-state-by");
    // @ts-expect-error: the payload names the entity's id field
    space.is("droppable-over", { id: "z" });
    // @ts-expect-error: no such key
    space.get("operations");
    // @ts-expect-error: drop is checked, never run (a drop is the user's gesture)
    space.run("drop", { draggableId: "a", droppableId: "z" });
}
