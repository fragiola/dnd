import { expect, test } from "@playwright/test";
import { openExample } from "../helpers";
import { drag, named } from "./helpers";

test("a card meets only the columns of its own scope", async ({ page }) => {
    await openExample(page, "scopes");
    const card = named(page, "Crop avatars to a circle");
    const designClosed = named(page, "Design Closed");
    const engineeringClosed = named(page, "Engineering Closed");
    await drag(page, card, engineeringClosed, { release: false });
    await expect(designClosed).toHaveAttribute("data-dnd-active", "");
    await expect(engineeringClosed).not.toHaveAttribute("data-dnd-active");
    await expect(engineeringClosed).not.toHaveAttribute("data-dnd-over");
    await expect(engineeringClosed).not.toHaveAttribute("data-dnd-refused");
    await page.mouse.up();
    await expect(
        engineeringClosed.getByLabel("Crop avatars to a circle"),
    ).toHaveCount(0);

    await drag(page, card, designClosed);
    await expect(
        designClosed.getByLabel("Crop avatars to a circle"),
    ).toBeVisible();
});
