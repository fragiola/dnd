import { expect, test } from "@playwright/test";
import {
    center,
    commits,
    DIRS,
    drag,
    fixture,
    forward,
    frame,
    logOf,
    moveTo,
    press,
} from "./helpers";

// The unstyled fixture, the same spec left-to-right and right-to-left, in Chromium and Firefox:
// no provider, clicks and focus under the press claim, handles and no-drag controls, scopes,
// refusals and vetoes, the cancel paths, the overlay, auto-scroll, the keyboard and the commits.

for (const dir of DIRS) {
    test.describe(dir, () => {
        test.beforeEach(async ({ page }) => {
            await page.goto(fixture(dir));
            await expect(page.getByTestId("card")).toBeVisible();
        });

        test("drops a draggable on a droppable in an unrelated subtree, and the app moves it", async ({
            page,
        }) => {
            const card = page.getByTestId("card");
            const zone = page.getByTestId("zone-a");
            await drag(page, card, zone, { release: false });
            await expect(card).toHaveAttribute("data-dnd-dragging", "");
            await expect(zone).toHaveAttribute("data-dnd-over", "");
            await expect(zone).toHaveAttribute("data-dnd-active", "");
            await page.mouse.up();
            expect(await logOf(page)).toEqual([
                "drop card on zone-a",
                "end card",
            ]);
            // the app moved it into the zone, with no translate left over
            await expect(zone.getByTestId("card")).toBeVisible();
            await expect(zone.getByTestId("card")).not.toHaveAttribute(
                "style",
                /translate/,
            );
        });

        test("a press that barely moves is a click and focuses the draggable, not a drag", async ({
            page,
        }) => {
            const card = page.getByTestId("card");
            const at = await center(card);
            await page.mouse.move(at.x, at.y);
            await page.mouse.down();
            await page.mouse.move(at.x + 1, at.y + 1);
            await page.mouse.up();
            await expect(page.getByTestId("clicks")).toHaveText("1");
            // the pointerdown claim (preventDefault) keeps the focus a press gives
            await expect(card).toBeFocused();
            expect(await logOf(page)).toEqual([]);
        });

        test("native controls and a no-drag subtree click, focus and never drag", async ({
            page,
        }) => {
            await page.getByTestId("inner-button").click();
            await page.getByTestId("no-drag-button").click();
            await page.getByTestId("no-drag-input").click();
            await expect(page.getByTestId("no-drag-input")).toBeFocused();
            await page.keyboard.type("typed");
            await expect(page.getByTestId("no-drag-input")).toHaveValue(
                "typed",
            );
            await drag(
                page,
                page.getByTestId("inner-button"),
                page.getByTestId("zone-a"),
            );
            await drag(
                page,
                page.getByTestId("no-drag"),
                page.getByTestId("zone-a"),
            );
            expect(await logOf(page)).toEqual([
                "inner button",
                "no-drag button",
            ]);
        });

        test("a handle is the only place its draggable drags from", async ({
            page,
        }) => {
            const handled = page.getByTestId("handled");
            const zone = page.getByTestId("zone-a");
            await expect(page.getByTestId("grip")).toHaveCSS(
                "touch-action",
                "none",
            );
            // the body of the card, away from the grip
            const box = await handled.boundingBox();
            await page.mouse.move(
                (box?.x ?? 0) + (box?.width ?? 0) / 2,
                (box?.y ?? 0) + (box?.height ?? 0) - 6,
            );
            await page.mouse.down();
            await moveTo(page, zone);
            await page.mouse.up();
            expect(await logOf(page)).toEqual([]);
            await drag(page, page.getByTestId("grip"), zone);
            expect(await logOf(page)).toEqual([
                "drop handled on zone-a",
                "end handled",
            ]);
        });

        test("a refusing droppable and a vetoed one are marked refused and never dropped on", async ({
            page,
        }) => {
            const card = page.getByTestId("card");
            for (const id of ["zone-refuse", "zone-veto"]) {
                const zone = page.getByTestId(id);
                await drag(page, card, zone, { release: false });
                await expect(zone).toHaveAttribute("data-dnd-refused", "");
                await expect(zone).not.toHaveAttribute("data-dnd-over");
                await page.mouse.up();
            }
            expect(await logOf(page)).toEqual(["end card", "end card"]);
        });

        test("a draggable only meets droppables of its scope", async ({
            page,
        }) => {
            const alpha = page.getByTestId("alpha-card");
            await drag(page, alpha, page.getByTestId("beta-zone"));
            await drag(page, alpha, page.getByTestId("zone-a"));
            await drag(page, alpha, page.getByTestId("alpha-zone"));
            expect(await logOf(page)).toEqual([
                "end alpha-card",
                "end alpha-card",
                "drop alpha-card on alpha-zone",
                "end alpha-card",
            ]);
        });

        test("Escape, pointercancel and a lost capture cancel the drag", async ({
            page,
        }) => {
            const card = page.getByTestId("card");
            const zone = page.getByTestId("zone-a");
            await drag(page, card, zone, { release: false });
            await page.keyboard.press("Escape");
            await expect(card).not.toHaveAttribute("data-dnd-dragging");
            await page.mouse.up();

            await drag(page, card, zone, { release: false });
            await page.evaluate(() => {
                document.dispatchEvent(
                    new PointerEvent("pointercancel", {
                        pointerId: Number(document.body.dataset.pointerId),
                        bubbles: true,
                    }),
                );
            });
            await page.mouse.up();

            await drag(page, card, zone, { release: false });
            await page.evaluate(() => {
                const pointerId = Number(document.body.dataset.pointerId);
                document
                    .querySelector<HTMLElement>('[data-testid="card"]')
                    ?.releasePointerCapture(pointerId);
            });
            await page.mouse.up();
            expect(await logOf(page)).toEqual([
                "cancel card",
                "cancel card",
                "cancel card",
            ]);
            await expect(zone).not.toHaveAttribute("data-dnd-over");
        });

        test("an overlay carries a drag out of an overflow: hidden container", async ({
            page,
        }) => {
            const clipped = page.getByTestId("clipped");
            const before = await clipped.boundingBox();
            const zone = page.getByTestId("overlay-zone");
            await drag(page, clipped, zone, { release: false });
            const ghost = page.getByTestId("ghost");
            await expect(ghost).toHaveText("clipped");
            // portalled into the body, fixed under the pointer, inert to it
            const overlay = page.locator('[data-dnd-part="overlay"]');
            expect(
                await overlay.evaluate(
                    (el) => el.parentElement === document.body,
                ),
            ).toBe(true);
            await expect(overlay).toHaveCSS("position", "fixed");
            await expect(overlay).toHaveCSS("pointer-events", "none");
            const at = await center(zone);
            const box = await overlay.boundingBox();
            expect(
                Math.abs((box?.x ?? 0) + (box?.width ?? 0) / 2 - at.x),
            ).toBeLessThan(box?.width ?? 0);
            // the source stays in place: translate={false}
            expect(await clipped.boundingBox()).toEqual(before);
            await expect(zone).toHaveAttribute("data-dnd-over", "");
            await page.mouse.up();
            await expect(ghost).toHaveCount(0);
            expect(await logOf(page)).toEqual([
                "drop clipped on overlay-zone",
                "end clipped",
            ]);
        });

        test("auto-scrolls a scroll container near its edge, then drops in what it revealed", async ({
            page,
        }) => {
            const scroller = page.getByTestId("scroller");
            const box = await scroller.boundingBox();
            await press(page, page.getByTestId("scroll-card"));
            const bottom = {
                x: (box?.x ?? 0) + (box?.width ?? 0) / 2,
                y: (box?.y ?? 0) + (box?.height ?? 0) - 8,
            };
            await page.mouse.move(bottom.x, bottom.y, { steps: 8 });
            // it scrolls while the pointer stays in the edge zone, until `deep` comes up
            const deep = page.getByTestId("deep");
            await expect
                .poll(
                    async () => {
                        const at = await deep.boundingBox();
                        return (at?.y ?? Infinity) - (box?.y ?? 0);
                    },
                    { timeout: 10_000, intervals: [50] },
                )
                .toBeLessThan(110);
            expect(
                await scroller.evaluate((el) => el.scrollTop),
            ).toBeGreaterThan(300);
            // out of the edge zone, onto what it revealed
            await moveTo(page, deep);
            await expect(deep).toHaveAttribute("data-dnd-over", "");
            await page.mouse.up();
            expect(await logOf(page)).toEqual([
                "drop scroll-card on deep",
                "end scroll-card",
            ]);
        });

        test("the keyboard grabs, moves by steps, drops, and cancels with Escape", async ({
            page,
        }) => {
            const step = page.getByTestId("key-step");
            await step.focus();
            await page.keyboard.press("Space");
            await expect(step).toHaveAttribute("data-dnd-dragging", "");
            const first = page.getByTestId("key-1");
            for (let i = 0; i < 30; i++) {
                if ((await first.getAttribute("data-dnd-over")) !== null) break;
                await page.keyboard.press(forward(dir));
                await frame(page);
            }
            await expect(first).toHaveAttribute("data-dnd-over", "");
            await page.keyboard.press("Enter");
            await expect(step).toBeFocused();
            await page.keyboard.press("Space");
            await page.keyboard.press(forward(dir));
            await page.keyboard.press("Escape");
            await expect(step).toBeFocused();
            await expect
                .poll(() => logOf(page))
                .toEqual([
                    "drop key-step on key-1",
                    "end key-step",
                    "cancel key-step",
                ]);
        });

        test("the keyboard moves from droppable to droppable in reading order", async ({
            page,
        }) => {
            const targets = page.getByTestId("key-targets");
            await targets.focus();
            await page.keyboard.press("Enter");
            await page.keyboard.press(forward(dir));
            await expect(page.getByTestId("key-1")).toHaveAttribute(
                "data-dnd-over",
                "",
            );
            await page.keyboard.press(forward(dir));
            await expect(page.getByTestId("key-2")).toHaveAttribute(
                "data-dnd-over",
                "",
            );
            await page.keyboard.press("Space");
            expect(await logOf(page)).toEqual([
                "drop key-targets on key-2",
                "end key-targets",
            ]);
        });

        test("React commits nothing while the pointer moves inside one droppable", async ({
            page,
        }) => {
            const zone = page.getByTestId("zone-a");
            await drag(page, page.getByTestId("card"), zone, {
                release: false,
            });
            await expect(zone).toHaveAttribute("data-dnd-over", "");
            const before = await commits(page);
            for (const [dx, dy] of [
                [-30, -20],
                [30, 20],
                [-20, 25],
                [25, -25],
            ] as const)
                await moveTo(page, zone, dx, dy);
            await frame(page);
            expect(await commits(page)).toBe(before);
            await page.mouse.up();
            await expect.poll(() => commits(page)).toBeGreaterThan(before);
        });
    });
}
