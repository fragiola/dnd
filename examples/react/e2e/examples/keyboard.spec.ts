import { expect, test } from "@playwright/test";
import { openExample } from "../helpers";
import { named } from "./helpers";

test("Space grabs, the arrows go column to column, Space drops, and the live region says each step", async ({
    page,
}) => {
    await openExample(page, "keyboard");
    const status = page.getByRole("status");
    const card = named(page, "Fix the login redirect");
    await expect(card).toHaveAttribute("tabindex", "0");
    await expect(card).toHaveAttribute("aria-describedby", "keyboard-help");
    await card.focus();
    await page.keyboard.press("Space");
    await expect(card).toHaveAttribute("data-dnd-dragging", "");
    await expect(status).toContainText("Picked up Fix the login redirect");
    // the drag's first frame has found the column it starts over
    await expect(named(page, "Backlog")).toHaveAttribute("data-dnd-over", "");
    await page.keyboard.press("ArrowRight");
    await expect(status).toHaveText("Fix the login redirect is over Doing.");
    await page.keyboard.press("ArrowRight");
    await expect(status).toHaveText("Fix the login redirect is over Done.");
    await page.keyboard.press("Space");
    await expect(status).toHaveText("Fix the login redirect dropped on Done.");
    await expect(
        named(page, "Done").getByLabel("Fix the login redirect"),
    ).toBeVisible();
});

test("Escape puts the card back, and step mode moves it by 25 px", async ({
    page,
}) => {
    await openExample(page, "keyboard");
    const status = page.getByRole("status");
    await page.getByRole("switch", { name: "Jump between columns" }).click();
    const card = named(page, "Write the setup guide");
    await card.focus();
    await page.keyboard.press("Enter");
    await page.keyboard.press("ArrowDown");
    await expect
        .poll(() => card.evaluate((element) => element.style.translate))
        .toBe("0px 25px");
    await page.keyboard.press("Escape");
    await expect(status).toHaveText(
        "Cancelled. Write the setup guide is back where it was.",
    );
    await expect(card).not.toHaveAttribute("data-dnd-dragging");
    await expect(
        named(page, "Doing").getByLabel("Write the setup guide"),
    ).toBeVisible();
    await expect(card).toBeFocused();
});
