import { expect, type Locator, type Page } from "@playwright/test";

// What the example specs share: an element of the stage by its accessible name, its centre, a drag
// by the mouse, and a touch through Chromium's real touch input.

/** An element of the stage by its exact accessible name. */
export function named(page: Page, name: string): Locator {
    return page.getByTestId("stage").getByLabel(name, { exact: true });
}

/** The centre of an element on screen. */
export async function center(
    locator: Locator,
): Promise<{ x: number; y: number }> {
    const box = await locator.boundingBox();
    expect(box, "on screen").not.toBeNull();
    return {
        x: (box?.x ?? 0) + (box?.width ?? 0) / 2,
        y: (box?.y ?? 0) + (box?.height ?? 0) / 2,
    };
}

/** Presses `from` with the mouse (at `at`, or its centre) and moves past the activation. */
export async function press(
    page: Page,
    from: Locator,
    at?: { x: number; y: number },
): Promise<void> {
    const point = at ?? (await center(from));
    await page.mouse.move(point.x, point.y);
    await page.mouse.down();
    await page.mouse.move(point.x + 6, point.y + 6, { steps: 3 });
}

/** Drags `from` onto `to`'s centre with the mouse, and releases unless told not to. */
export async function drag(
    page: Page,
    from: Locator,
    to: Locator,
    options: { release?: boolean; at?: { x: number; y: number } } = {},
): Promise<void> {
    await press(page, from, options.at);
    const target = await center(to);
    await page.mouse.move(target.x, target.y, { steps: 10 });
    if (options.release !== false) await page.mouse.up();
}

/** Whether an element is inside another one in the DOM. */
export async function isInside(
    inner: Locator,
    outer: Locator,
): Promise<boolean> {
    const handle = await outer.elementHandle();
    return inner.evaluate(
        (element, container) => !!container?.contains(element),
        handle,
    );
}

/**
 * A touch along `points` (Chromium's real touch, through the DevTools protocol), held `hold` ms
 * before it moves.
 */
export async function touchPath(
    page: Page,
    points: readonly { x: number; y: number }[],
    hold = 0,
): Promise<void> {
    const [first, ...rest] = points;
    if (!first) return;
    const client = await page.context().newCDPSession(page);
    await client.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [first],
    });
    if (hold > 0) await page.waitForTimeout(hold);
    let from = first;
    for (const to of rest) {
        for (let step = 1; step <= 10; step++) {
            await client.send("Input.dispatchTouchEvent", {
                type: "touchMove",
                touchPoints: [
                    {
                        x: from.x + ((to.x - from.x) * step) / 10,
                        y: from.y + ((to.y - from.y) * step) / 10,
                    },
                ],
            });
        }
        from = to;
    }
    await client.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
    });
    await client.detach();
}

/** The accessible names (`aria-label`) of the elements `locator` matches, in DOM order. */
export function labels(locator: Locator): Promise<(string | null)[]> {
    return locator.evaluateAll((elements) =>
        elements.map((element) => element.getAttribute("aria-label")),
    );
}
