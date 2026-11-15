// The React tests' setup: the core's harness (faked frames and pointer capture, the pointer and
// key helpers), plus boxes for the elements React renders, which jsdom cannot lay out.
export { flush, key, pointer } from "../../core/tests/harness";

/** A box in viewport coordinates. */
export interface Box {
    x: number;
    y: number;
    width: number;
    height: number;
}

/**
 * Gives `element` the box `box`, shifted by the `translate` the core writes, as a browser would
 * report it. Returns the element.
 */
export function place<E extends Element | null>(element: E, box: Box): E {
    if (!element) throw new Error("no element to place");
    element.getBoundingClientRect = () => {
        const [x = 0, y = 0] = (
            (element as unknown as HTMLElement).style?.translate || "0px 0px"
        )
            .split(" ")
            .map((value) => Number.parseFloat(value));
        return DOMRect.fromRect({
            x: box.x + x,
            y: box.y + (Number.isNaN(y) ? 0 : y),
            width: box.width,
            height: box.height,
        });
    };
    return element;
}

/** The test ids' elements that are rendered, each given its box. */
export function placeAll(
    boxes: Record<string, Box>,
    root: ParentNode = document,
): void {
    for (const [id, box] of Object.entries(boxes)) {
        const element = root.querySelector(`[data-testid="${id}"]`);
        if (element) place(element, box);
    }
}
