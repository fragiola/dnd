import { expect, test } from "@playwright/test";
import { openExample } from "../helpers";
import { center, drag, named } from "./helpers";

test("a card moves only by its grip", async ({ page }) => {
    await openExample(page, "drag-handle");
    const card = named(page, "Fix the login redirect");
    const done = named(page, "Done");
    const text = card.getByText("Fix the login redirect");
    // the body does not start a drag
    await drag(page, card, done, { at: await center(text) });
    await expect(done.getByLabel("Fix the login redirect")).toHaveCount(0);
    // the grip does
    const grip = named(page, "Move Fix the login redirect");
    await expect(grip).toHaveAttribute("data-dnd-part", "handle");
    await drag(page, grip, done);
    await expect(
        done.getByLabel("Fix the login redirect", { exact: true }),
    ).toBeVisible();
});

test("the grip is the tab stop and takes the keyboard", async ({ page }) => {
    await openExample(page, "drag-handle");
    const grip = named(page, "Move Export the report as CSV");
    await expect(named(page, "Export the report as CSV")).not.toHaveAttribute(
        "tabindex",
    );
    await grip.focus();
    await page.keyboard.press("Space");
    await expect(named(page, "Export the report as CSV")).toHaveAttribute(
        "data-dnd-dragging",
        "",
    );
    await page.keyboard.press("Escape");
    await expect(named(page, "Export the report as CSV")).not.toHaveAttribute(
        "data-dnd-dragging",
    );
    await expect(grip).toBeFocused();
});
