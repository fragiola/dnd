import { expect, type Page, test } from "@playwright/test";
import { openExample } from "../helpers";
import { center, drag, labels, named, press } from "./helpers";

const cards = (page: Page, column: string) =>
    named(page, column).getByRole("listitem");

test("a card sorts within its column and moves into another that accepts it", async ({
    page,
}) => {
    await openExample(page, "kanban");
    await drag(
        page,
        named(page, "Fix the login redirect"),
        named(page, "Search the archive"),
    );
    await expect
        .poll(() => labels(cards(page, "Backlog")))
        .toEqual([
            "Export the report as CSV",
            "Search the archive",
            "Fix the login redirect",
            "Typo on the pricing page",
        ]);

    await drag(
        page,
        named(page, "Export the report as CSV"),
        named(page, "Crop avatars to a circle"),
    );
    await expect(cards(page, "Doing")).toHaveCount(3);
    await expect(cards(page, "Backlog")).toHaveCount(3);
    await expect(
        named(page, "Doing").getByLabel("Export the report as CSV"),
    ).toBeVisible();
});

test("the empty Done column takes a card from Doing through its SortableGroup, and refuses one from the Backlog", async ({
    page,
}) => {
    await openExample(page, "kanban");
    const done = named(page, "Done");
    await expect(cards(page, "Done")).toHaveCount(0);

    // from the Backlog: Done refuses it and is not part of the sort; over it the preview stays
    // where it was last, in Doing, the column the card crossed
    await drag(page, named(page, "Typo on the pricing page"), done, {
        release: false,
    });
    await expect(named(page, "Doing")).toHaveAttribute("data-dnd-sorting", "");
    await expect(done).not.toHaveAttribute("data-dnd-sorting");
    await page.mouse.up();
    await expect(cards(page, "Done")).toHaveCount(0);
    await expect(
        named(page, "Doing").getByLabel("Typo on the pricing page"),
    ).toBeVisible();

    // from Doing: into the empty column
    await press(page, named(page, "Write the setup guide"));
    const into = await center(done);
    await page.mouse.move(into.x, into.y, { steps: 10 });
    await expect(done).toHaveAttribute("data-dnd-sorting", "");
    await page.mouse.up();
    await expect
        .poll(() => labels(cards(page, "Done")))
        .toEqual(["Write the setup guide"]);
    await expect(cards(page, "Doing")).toHaveCount(2);
});
