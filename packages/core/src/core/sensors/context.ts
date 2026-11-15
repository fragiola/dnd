// What a sensor needs from the draggable it drives.
import type { Session } from "../operation";
import type {
    Activation,
    DragInput,
    KeyboardOptions,
    Point,
    Rect,
} from "../types";

/** Where a keyboard step goes: the pointer there, and the box it shows, inside `element`. @internal */
export interface KeyStep {
    readonly point: Point;
    /** the destination's box on screen, scrolled into view within `element`'s scroll containers */
    readonly rect: Rect;
    readonly element: Element;
}

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
    /**
     * where an arrow moves the drag in the "targets" mode, when the capability orders its own
     * places (a sortable's slots); by default, the next droppable in reading order
     */
    step?(
        session: Session,
        forward: boolean,
        rtl: boolean,
    ): KeyStep | undefined;
}
