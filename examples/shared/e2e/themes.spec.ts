import { expect, test } from "@playwright/test";
import { THEMES } from "./helpers";

// The example themes (examples/shared/src/themes) are every framework's, so their checks run in
// every framework's embed, on computed styles (verify by compiling, not by reading class names). Their shape on the examples is
// checked by the examples' own specs.

test("the themes paint different floors, whatever the page theme", async ({
    page,
}) => {
    const seen = new Set<string>();
    for (const theme of THEMES) {
        await page.goto(`./?theme=${theme.name}`);
        await expect(page.locator("body")).toHaveAttribute(
            "data-example-theme",
            theme.name,
        );
        seen.add(
            await page
                .getByTestId("stage")
                .evaluate((el) => getComputedStyle(el).backgroundColor),
        );
    }
    expect(seen.size).toBe(THEMES.length);
});

test("a theme declares the dnd tokens the examples read", async ({ page }) => {
    for (const theme of THEMES) {
        await page.goto(`./?theme=${theme.name}`);
        const tokens = await page.getByTestId("stage").evaluate((el) => {
            const style = getComputedStyle(el);
            return ["--dnd-font", "--dnd-item-padding", "--dnd-focus-line"].map(
                (name) => style.getPropertyValue(name).trim(),
            );
        });
        for (const value of tokens) expect(value, theme.name).not.toBe("");
    }
});
