import { expect, test } from "@playwright/test";
import { openExample } from "../helpers";
import { drag, named } from "./helpers";

test("the controls work and never start a drag; the card's empty space does", async ({
    page,
}) => {
    await openExample(page, "no-drag-controls");
    const card = named(page, "Release card");
    const shipped = named(page, "Shipped");
    const title = named(page, "Title");
    await title.fill("Release 2.0");
    await expect(title).toHaveValue("Release 2.0");
    const upvote = page.getByRole("button", { name: /Upvote/ });
    await upvote.click();
    await expect(upvote).toHaveText("Upvote (1)");
    await page.getByRole("switch", { name: "Urgent" }).click();
    await expect(page.getByRole("switch", { name: "Urgent" })).toBeChecked();

    // from a button, from the field and from the notes: no drag
    for (const from of [upvote, title, card.getByText(/These notes opt out/)]) {
        await drag(page, from, shipped);
        await expect(card).not.toHaveAttribute("data-dnd-dragging");
        await expect(shipped.getByLabel("Release card")).toHaveCount(0);
    }
    // from the card's padding
    const box = await card.boundingBox();
    await drag(page, card, shipped, {
        at: { x: (box?.x ?? 0) + 4, y: (box?.y ?? 0) + 4 },
    });
    await expect(shipped.getByLabel("Release card")).toBeVisible();
    // the card kept its state: it is the same component, moved by the app
    await expect(named(page, "Title")).toHaveValue("Release 2.0");
});
