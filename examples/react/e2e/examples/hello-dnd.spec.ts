import { expect, test } from "@playwright/test";
import { openExample } from "../helpers";
import { drag, isInside, named } from "./helpers";

test("the card drags into the box, with no provider and no element of the wrappers", async ({
    page,
}) => {
    await openExample(page, "hello-dnd");
    const card = named(page, "Card");
    const box = named(page, "Box");
    // the wrappers render nothing: the attributes are on the app's own elements
    await expect(card).toHaveAttribute("data-dnd-part", "draggable");
    await expect(box).toHaveAttribute("data-dnd-part", "droppable");
    await expect(
        page.getByTestId("stage").locator("[data-dnd-part]"),
    ).toHaveCount(2);

    await drag(page, card, box, { release: false });
    await expect(card).toHaveAttribute("data-dnd-dragging", "");
    await expect(box).toHaveAttribute("data-dnd-over", "");
    await page.mouse.up();
    await expect(page.getByRole("status")).toHaveText(
        "The card is in the box.",
    );
    expect(await isInside(named(page, "Card"), named(page, "Box"))).toBe(true);
    await expect(named(page, "Card")).not.toHaveAttribute("data-dnd-dragging");
});

test("a click under the threshold is not a drag", async ({ page }) => {
    await openExample(page, "hello-dnd");
    await named(page, "Card").click();
    await expect(page.getByRole("status")).toContainText("in the tray");
});
