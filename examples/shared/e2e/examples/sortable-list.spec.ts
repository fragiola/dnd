import { expect, test } from "@playwright/test";
import { openExample } from "../helpers";
import { drag, labels, named } from "./helpers";

const order = (page: import("@playwright/test").Page) =>
    named(page, "Tasks").getByRole("listitem");

test("a card dragged down the list shifts its neighbours, then the app applies the drop with arrayMove", async ({
    page,
}) => {
    await openExample(page, "sortable-list");
    const first = named(page, "Fix the login redirect");
    await drag(page, first, named(page, "Write the setup guide"), {
        release: false,
    });
    // the neighbours shift (the core's translate) and animate (the app's transition)
    const neighbour = named(page, "Export the report as CSV");
    await expect(neighbour).toHaveAttribute("data-dnd-sorting", "");
    await expect
        .poll(() => neighbour.evaluate((element) => element.style.translate))
        .toMatch(/px/);
    expect(
        await neighbour.evaluate(
            (element) => getComputedStyle(element).transitionProperty,
        ),
    ).toContain("translate");
    // nothing moved in the app's order yet
    await expect(order(page).first()).toHaveAccessibleName(
        "Fix the login redirect",
    );
    await page.mouse.up();
    await expect
        .poll(() => labels(order(page)))
        .toEqual([
            "Export the report as CSV",
            "Write the setup guide",
            "Fix the login redirect",
            "Crop avatars to a circle",
            "Typo on the pricing page",
        ]);
    await expect(neighbour).not.toHaveAttribute("data-dnd-sorting");
    await expect(neighbour).not.toHaveAttribute("style", /translate/);
});

test("Escape cancels: every shift goes back and the order stays", async ({
    page,
}) => {
    await openExample(page, "sortable-list");
    await drag(
        page,
        named(page, "Typo on the pricing page"),
        named(page, "Export the report as CSV"),
        { release: false },
    );
    await expect(named(page, "Write the setup guide")).toHaveAttribute(
        "style",
        /translate/,
    );
    await page.keyboard.press("Escape");
    await page.mouse.up();
    await expect(named(page, "Write the setup guide")).not.toHaveAttribute(
        "style",
        /translate/,
    );
    await expect(order(page).last()).toHaveAccessibleName(
        "Typo on the pricing page",
    );
});
