import { expect, test } from "@playwright/test";
import { openExample } from "../helpers";
import { drag, named } from "./helpers";

test("plain items drop into a basket rendered by `render`", async ({
    page,
}) => {
    await openExample(page, "unstyled");
    const basket = named(page, "Basket");
    await expect(basket).toHaveAttribute("data-dnd-part", "droppable");
    await drag(page, named(page, "Pear"), basket, { release: false });
    await expect(basket).toHaveAttribute("data-dnd-over", "");
    await expect(basket).toContainText("Release to drop it");
    await page.mouse.up();
    await expect(basket).toContainText("Basket: Pear");
    await expect(named(page, "Pear")).toHaveCount(0);
    // nothing styled by the package: no inline style left on the items
    await expect(named(page, "Apple")).not.toHaveAttribute("style");
});
