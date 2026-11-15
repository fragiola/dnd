import { expect, test } from "@playwright/test";
import { openExample } from "../helpers";
import { center, named, touchPath } from "./helpers";

// Real touch input (Chromium's, through the DevTools protocol), on a touch device.
test.use({ hasTouch: true, viewport: { width: 390, height: 720 } });

test("a held finger drags an item to the basket", async ({ page }) => {
    await openExample(page, "touch");
    const item = named(page, "Milk");
    const basket = named(page, "Basket");
    await touchPath(page, [await center(item), await center(basket)], 400);
    await expect(basket).toContainText("Basket: Milk");
    await expect(named(page, "Milk")).toHaveCount(0);
});

test("a finger that moves at once scrolls the list instead", async ({
    page,
}) => {
    await openExample(page, "touch");
    const list = named(page, "Shopping list");
    const item = named(page, "Rice");
    const from = await center(item);
    await touchPath(page, [from, { x: from.x, y: from.y - 200 }]);
    await expect
        .poll(() => list.evaluate((element) => element.scrollTop))
        .toBeGreaterThan(50);
    await expect(named(page, "Basket")).toContainText("Hold an item");
});
