import { expect, test } from "@playwright/test";
import { openExample } from "../helpers";
import { drag, named } from "./helpers";

test("a card dropped on a tabset opens as a tab through tab.add", async ({
    page,
}) => {
    await openExample(page, "dockable-new-tab");
    const drafts = page.getByTestId("stage").locator('[data-dnd-id="drafts"]');
    // Dockable's attributes and dnd's on the one element
    await expect(drafts).toHaveAttribute("data-layout-path", /ts/);
    await expect(drafts).toHaveAttribute("data-dnd-part", "droppable");
    await drag(page, named(page, "Roadmap"), drafts, { release: false });
    await expect(drafts).toHaveAttribute("data-dnd-over", "");
    await page.mouse.up();
    await expect(drafts.getByRole("tab", { name: "Roadmap" })).toBeVisible();
    await expect(drafts.getByRole("tab")).toHaveCount(2);
});

test("a full tabset refuses the card while it hovers, through model.can", async ({
    page,
}) => {
    await openExample(page, "dockable-new-tab");
    const review = page.getByTestId("stage").locator('[data-dnd-id="review"]');
    for (const card of ["Budget", "Hiring"]) {
        await drag(page, named(page, card), review);
    }
    await expect(review.getByRole("tab")).toHaveCount(3);
    await drag(page, named(page, "Retro"), review, { release: false });
    await expect(review).toHaveAttribute("data-dnd-refused", "");
    await expect(review).not.toHaveAttribute("data-dnd-over");
    await page.mouse.up();
    await expect(review.getByRole("tab")).toHaveCount(3);
    await expect(review.getByRole("tab", { name: "Retro" })).toHaveCount(0);
});
