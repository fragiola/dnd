import { expect, test } from "@playwright/test";
import { openExample } from "../helpers";
import { center, drag, named } from "./helpers";

test("an overlay carries the tag out of the clipped strip; the tag stays put", async ({
    page,
}) => {
    await openExample(page, "drag-overlay");
    const tag = named(page, "Frontend");
    const zone = named(page, "Favourites");
    const before = await center(tag);
    await drag(page, tag, zone, { release: false });
    const overlay = page.locator('[data-dnd-part="overlay"]');
    await expect(overlay).toBeVisible();
    await expect(overlay).toHaveText("Frontend");
    // portalled into the body, outside the strip, fixed and inert to the pointer
    await expect(overlay).toHaveCSS("position", "fixed");
    await expect(overlay).toHaveCSS("pointer-events", "none");
    expect(
        await overlay.evaluate(
            (element) => element.parentElement === document.body,
        ),
    ).toBe(true);
    // over the zone, where the strip would have clipped the tag
    const at = await center(overlay);
    const box = await zone.boundingBox();
    expect(at.y).toBeGreaterThan(box?.y ?? 0);
    // the tag itself did not move
    await expect(tag).toHaveAttribute("data-dnd-dragging", "");
    expect(await center(tag)).toEqual(before);
    await expect(zone).toHaveAttribute("data-dnd-over", "");
    await page.mouse.up();
    await expect(overlay).toHaveCount(0);
    await expect(zone).toContainText("Frontend");
});
