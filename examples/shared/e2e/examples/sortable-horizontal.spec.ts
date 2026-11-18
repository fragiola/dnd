import { expect, test } from "@playwright/test";
import { openExample } from "../helpers";
import { drag, named } from "./helpers";

test("a tool dragged along the toolbar takes its new place, by pointer and by keyboard", async ({
    page,
}) => {
    await openExample(page, "sortable-horizontal");
    const output = named(page, "Order");
    await drag(page, named(page, "Select"), named(page, "Shapes"), {
        release: false,
    });
    await expect(named(page, "Pen")).toHaveAttribute("style", /translate/);
    await expect(named(page, "Text")).not.toHaveAttribute("style", /translate/);
    await page.mouse.up();
    await expect(output).toHaveText("pen, shapes, select, text, comment");

    // the keyboard: ArrowRight moves one place toward the inline end
    await named(page, "Comment").focus();
    for (const key of ["Space", "ArrowLeft", "ArrowLeft", "Enter"])
        await page.keyboard.press(key);
    await expect(output).toHaveText("pen, shapes, comment, select, text");
});
