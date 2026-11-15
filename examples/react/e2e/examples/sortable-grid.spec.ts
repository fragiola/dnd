import { expect, test } from "@playwright/test";
import { openExample } from "../helpers";
import { drag, named } from "./helpers";

test("a swatch dragged to the next row takes that place in reading order", async ({
    page,
}) => {
    await openExample(page, "sortable-grid");
    const tiles = named(page, "Swatches").getByRole("listitem");
    const before = await tiles.evaluateAll((items) =>
        items.map((item) => item.getAttribute("aria-label")),
    );
    const target = before[5] ?? "";
    await drag(page, named(page, "Ocean"), named(page, target), {
        release: false,
    });
    // the tiles between the old and the new place shift; the ones after it do not
    await expect(named(page, "Ember")).toHaveAttribute("style", /translate/);
    await expect(named(page, before[7] ?? "")).not.toHaveAttribute(
        "style",
        /translate/,
    );
    await page.mouse.up();
    const after = await tiles.evaluateAll((items) =>
        items.map((item) => item.getAttribute("aria-label")),
    );
    expect(after).toEqual([...before.slice(1, 6), "Ocean", ...before.slice(6)]);
});
