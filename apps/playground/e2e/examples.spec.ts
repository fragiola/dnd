import { expect, test } from "@playwright/test";
import {
    examplesApp,
    listExampleSlugs,
} from "../../../examples/shared/scripts/examples-lib.ts";
import { THEMES } from "../../../examples/shared/src/themes/themes.ts";

// Every example of examples/react renders in the playground in each of the five themes, with no
// error. Its behaviour is examples/react's e2e; this is the playground's view of it.

for (const slug of listExampleSlugs(examplesApp("react"))) {
    test(`${slug} renders in every theme`, async ({ page }) => {
        const errors: string[] = [];
        page.on("console", (message) => {
            if (message.type() === "error") errors.push(message.text());
        });
        page.on("pageerror", (error) => errors.push(String(error)));
        for (const theme of THEMES) {
            await page.goto(`/?example=${slug}&theme=${theme.name}`);
            await expect(page.locator("body")).toHaveAttribute(
                "data-example-theme",
                theme.name,
            );
            await expect(
                page
                    .getByTestId("example-root")
                    .locator("[data-dnd-part]")
                    .first(),
            ).toBeVisible();
        }
        expect(errors).toEqual([]);
    });
}
