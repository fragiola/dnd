import { expect, test } from "@playwright/test";
import { openExample } from "../helpers";
import { center, drag, named } from "./helpers";

test("a card in a Dockable panel drags to another panel, before and after its tab moves", async ({
    page,
}) => {
    await openExample(page, "dockable-panels");
    const archive = named(page, "Archived cards");
    const card = named(page, "Fix the login redirect");
    await drag(page, card, archive, { release: false });
    // a panel clips: the overlay carries the copy
    await expect(page.locator('[data-dnd-part="overlay"]')).toBeVisible();
    await expect(archive).toHaveAttribute("data-dnd-over", "");
    await page.mouse.up();
    await expect(archive).toContainText("Fix the login redirect");

    const middle = page.getByRole("tablist", { name: "Tabs of middle" });
    const before = await center(named(page, "Export the report as CSV"));
    await page
        .getByRole("button", { name: "Move Inbox to the middle" })
        .click();
    await expect(
        page.getByRole("button", { name: "Move Inbox back" }),
    ).toBeVisible();
    await expect(middle.getByRole("tab", { name: "Inbox" })).toBeVisible();
    // the same cards, re-parented over the middle tabset
    await expect
        .poll(
            async () =>
                (await center(named(page, "Export the report as CSV"))).x,
        )
        .toBeGreaterThan(before.x + 50);
    await drag(page, named(page, "Export the report as CSV"), archive);
    await expect(archive).toContainText("Export the report as CSV");
    await expect(named(page, "Inbox cards").getByRole("listitem")).toHaveCount(
        2,
    );
});
