import { expect, test } from "@playwright/test";
import { openExample } from "../helpers";
import { labels, named } from "./helpers";

test("Space picks up, the arrows move one place and into the next list, Space drops, and the live region says each position", async ({
    page,
}) => {
    await openExample(page, "sortable-keyboard");
    const status = page.getByRole("status");
    const item = named(page, "Write the setup guide");
    await expect(item).toHaveAttribute(
        "aria-describedby",
        "sortable-keyboard-help",
    );
    await item.focus();
    await page.keyboard.press("Space");
    await expect(status).toContainText(
        "Picked up Write the setup guide, at position 2 of 3 in Today.",
    );
    await page.keyboard.press("ArrowDown");
    await expect(status).toHaveText(
        "Write the setup guide is at position 3 of 3 in Today.",
    );
    await page.keyboard.press("ArrowDown");
    await expect(status).toHaveText(
        "Write the setup guide is at position 1 of 3 in Later.",
    );
    await page.keyboard.press("Space");
    await expect(status).toHaveText(
        "Write the setup guide dropped at position 1 of 3 in Later.",
    );
    await expect
        .poll(() => labels(named(page, "Later").getByRole("listitem")))
        .toEqual([
            "Write the setup guide",
            "Export the report as CSV",
            "Search the archive",
        ]);
    await expect(item).toBeFocused();
});

test("Escape puts the item back and says so", async ({ page }) => {
    await openExample(page, "sortable-keyboard");
    const status = page.getByRole("status");
    const item = named(page, "Fix the login redirect");
    await item.focus();
    await page.keyboard.press("Enter");
    await page.keyboard.press("ArrowDown");
    await expect(named(page, "Write the setup guide")).toHaveAttribute(
        "style",
        /translate/,
    );
    await page.keyboard.press("Escape");
    await expect(status).toHaveText(
        "Cancelled. Fix the login redirect is back at position 1 of 3 in Today.",
    );
    await expect(named(page, "Write the setup guide")).not.toHaveAttribute(
        "style",
        /translate/,
    );
    await expect(
        named(page, "Today").getByRole("listitem").first(),
    ).toHaveAccessibleName("Fix the login redirect");
});
