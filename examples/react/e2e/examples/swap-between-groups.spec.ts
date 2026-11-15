import { expect, test } from "@playwright/test";
import { openExample } from "../helpers";
import { drag, labels, named } from "./helpers";

test("players swap within a group and across the lineup and the bench", async ({
    page,
}) => {
    await openExample(page, "swap-between-groups");
    const lineup = named(page, "Lineup").getByRole("listitem");
    const bench = named(page, "Bench").getByRole("listitem");
    await drag(page, named(page, "Ana"), named(page, "Chiara"));
    await expect
        .poll(() => labels(lineup))
        .toEqual(["Chiara", "Bruno", "Ana", "Dev", "Emeka"]);

    await drag(page, named(page, "Goran"), named(page, "Dev"), {
        release: false,
    });
    await expect(named(page, "Dev")).toHaveAttribute(
        "data-dnd-swap-target",
        "",
    );
    await page.mouse.up();
    await expect
        .poll(() => labels(lineup))
        .toEqual(["Chiara", "Bruno", "Ana", "Goran", "Emeka"]);
    await expect.poll(() => labels(bench)).toEqual(["Farah", "Dev", "Hana"]);
});
