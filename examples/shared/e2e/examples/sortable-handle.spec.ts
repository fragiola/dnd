import { expect, test } from "@playwright/test";
import { openExample } from "../helpers";
import { drag, labels, named } from "./helpers";

test("only the grip sorts a row: the row's text does not start a drag", async ({
    page,
}) => {
    await openExample(page, "sortable-handle");
    const rows = named(page, "Release checklist").getByRole("listitem");
    const first = named(page, "Write the setup guide");
    // a drag from the text selects, it never sorts
    await drag(page, first.getByText("Write the setup guide"), rows.nth(2));
    await expect(first).not.toHaveAttribute("data-dnd-dragging");
    await expect(rows.first()).toHaveAccessibleName("Write the setup guide");

    const handle = page.getByRole("button", {
        name: "Move Write the setup guide",
    });
    await expect(handle).toHaveAttribute("data-dnd-part", "handle");
    await drag(page, handle, rows.nth(2));
    await expect
        .poll(() => labels(rows))
        .toEqual([
            "Document the API errors",
            "Fix the login redirect",
            "Write the setup guide",
            "Fix the flaky upload test",
        ]);
    // the handle is the tab stop, and the keyboard sorts from it
    await handle.focus();
    for (const key of ["Space", "ArrowDown", "Enter"])
        await page.keyboard.press(key);
    await expect(rows.nth(3)).toHaveAccessibleName("Write the setup guide");
});
