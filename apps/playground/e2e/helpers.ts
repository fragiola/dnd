import { expect, type Locator, type Page } from "@playwright/test";

// The fixtures (fixtures/fixture.tsx, fixtures/sortable.tsx) read and driven from a spec: their
// page per direction, the lines they log, their commit counter, and drags by mouse and by touch.

export const DIRS = ["ltr", "rtl"] as const;
export type Dir = (typeof DIRS)[number];

/** The fixture's page for a direction. */
export function fixture(dir: Dir): string {
    return `/fixtures/${dir === "rtl" ? "rtl" : "basic"}/`;
}

/** The sortable and swappable fixture's page for a direction. */
export function sortFixture(dir: Dir): string {
    return `/fixtures/${dir === "rtl" ? "sortable-rtl" : "sortable"}/`;
}

/** What the fixture logged: one line per drop, end and cancel. */
export async function logOf(page: Page): Promise<string[]> {
    return page.getByTestId("log").locator("li").allTextContents();
}

/** How many times React committed so far. */
export async function commits(page: Page): Promise<number> {
    return Number(await page.getByTestId("commits").textContent());
}

/** The centre of an element on screen. */
export async function center(
    locator: Locator,
): Promise<{ x: number; y: number }> {
    const box = await locator.boundingBox();
    expect(box).not.toBeNull();
    return {
        x: (box?.x ?? 0) + (box?.width ?? 0) / 2,
        y: (box?.y ?? 0) + (box?.height ?? 0) / 2,
    };
}

/** Presses `from` with the mouse, past the activation, without moving further. */
export async function press(page: Page, from: Locator): Promise<void> {
    const at = await center(from);
    await page.mouse.move(at.x, at.y);
    await page.mouse.down();
    await page.mouse.move(at.x + 6, at.y + 6, { steps: 2 });
}

/** Moves the pressed mouse onto `to`'s centre (offset by `dx`, `dy`). */
export async function moveTo(
    page: Page,
    to: Locator,
    dx = 0,
    dy = 0,
): Promise<void> {
    const at = await center(to);
    await page.mouse.move(at.x + dx, at.y + dy, { steps: 8 });
}

/** Drags `from` onto `to` with the mouse and releases unless told not to. */
export async function drag(
    page: Page,
    from: Locator,
    to: Locator,
    options: { release?: boolean } = {},
): Promise<void> {
    await press(page, from);
    await moveTo(page, to);
    if (options.release !== false) await page.mouse.up();
}

/** Waits for the page's next two animation frames: what the core does once per frame is done. */
export async function frame(page: Page): Promise<void> {
    await page.evaluate(
        () =>
            new Promise((done) =>
                requestAnimationFrame(() => requestAnimationFrame(done)),
            ),
    );
}

/** The arrow that moves toward the inline end: right in LTR, left in RTL. */
export function forward(dir: Dir): "ArrowRight" | "ArrowLeft" {
    return dir === "rtl" ? "ArrowLeft" : "ArrowRight";
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
        for (let step = 1; step <= 8; step++) {
            await client.send("Input.dispatchTouchEvent", {
                type: "touchMove",
                touchPoints: [
                    {
                        x: from.x + ((to.x - from.x) * step) / 8,
                        y: from.y + ((to.y - from.y) * step) / 8,
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
