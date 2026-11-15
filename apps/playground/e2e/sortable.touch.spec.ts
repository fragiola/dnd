import { expect, test } from "@playwright/test";
import { center, DIRS, logOf, sortFixture, touchPath } from "./helpers";

// Touch on a phone (Chromium's real touch): a held touch sorts a vertical list, a horizontal one
// and a grid, and swaps two items; one that moves first is the page's (a scroll), never a sort (D9).

test.use({ viewport: { width: 1280, height: 900 } });

for (const dir of DIRS) {
    test(`a held touch sorts and swaps; a touch that moves first does not (${dir})`, async ({
        page,
    }) => {
        await page.goto(sortFixture(dir));
        const from = await center(page.getByTestId("v-a"));
        const to = await center(page.getByTestId("v-c"));
        await touchPath(page, [from, to]);
        expect(await logOf(page)).toEqual([]);
        await touchPath(page, [from, to], 350);
        await expect(page.getByTestId("order-v")).toHaveText("v-b v-c v-a v-d");
        // a horizontal list and a grid, the same way
        for (const [from, to] of [
            ["h-a", "h-c"],
            ["g-a", "g-e"],
        ] as const)
            await touchPath(
                page,
                [
                    await center(page.getByTestId(from)),
                    await center(page.getByTestId(to)),
                ],
                350,
            );
        await expect(page.getByTestId("order-h")).toHaveText("h-b h-c h-a h-d");
        await expect(page.getByTestId("order-g")).toHaveText(
            "g-b g-c g-d g-e g-a g-f",
        );
        await touchPath(
            page,
            [
                await center(page.getByTestId("s1-a")),
                await center(page.getByTestId("s1-b")),
            ],
            350,
        );
        await expect(page.getByTestId("order-s1")).toHaveText(
            "s1-b s1-a s1-c s1-d",
        );
        expect(await logOf(page)).toEqual([
            "sort v-a v:0 → v:2",
            "sort h-a h:0 → h:2",
            "sort g-a g:0 → g:4",
            "swap s1-a ⇄ s1-b",
        ]);
    });
}
