import { expect, test } from "@playwright/test";
import { center, DIRS, fixture, logOf, touchPath } from "./helpers";

// Touch on a phone (Chromium's real touch): a touch held past the activation delay drags; one
// that moves first is the page's (a scroll), never a drag (D9).

test.use({ viewport: { width: 1280, height: 900 } });

for (const dir of DIRS) {
    test(`a held touch drags and drops; a touch that moves first does not (${dir})`, async ({
        page,
    }) => {
        await page.goto(fixture(dir));
        const from = await center(page.getByTestId("card"));
        const to = await center(page.getByTestId("zone-a"));
        await touchPath(page, [from, to]);
        expect(await logOf(page)).toEqual([]);
        await touchPath(page, [from, to], 350);
        await expect
            .poll(() => logOf(page))
            .toEqual(["drop card on zone-a", "end card"]);
    });
}
