// What a sensor needs from the draggable it drives.
import type { Session } from "../operation";
import type { Activation, DragInput, KeyboardOptions, Point } from "../types";

/** A draggable, as its sensors see it. @internal */
export interface SensorContext {
    /** the draggable's element (the activator is it, or its handle) */
    readonly element: HTMLElement;
    /** whether a press or a grab may start a drag now: enabled, and none in the space */
    canStart(): boolean;
    /** starts the drag from `origin`, or nothing when it cannot */
    start(origin: Point, input: DragInput): Session | undefined;
    /** whether it is being dragged */
    dragging(): boolean;
    activation(): Activation | undefined;
    keyboard(): KeyboardOptions | undefined;
}
