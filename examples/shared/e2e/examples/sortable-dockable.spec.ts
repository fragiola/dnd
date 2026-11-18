import { expect, test } from "@playwright/test";
import { openExample } from "../helpers";
import { center, drag, labels, named } from "./helpers";

test("a playlist in a Dockable panel sorts, moves songs to the queue's panel, and keeps sorting after its tab moves", async ({
    page,
}) => {
    await openExample(page, "sortable-dockable");
    const playlist = named(page, "Playlist").getByRole("listitem");
    const queue = named(page, "Queue").getByRole("listitem");
    await drag(page, named(page, "Low Tide"), named(page, "Due North"), {
        release: false,
    });
    // a panel clips: the overlay carries the copy, the song stays as the placeholder
    await expect(page.locator('[data-dnd-part="overlay"]')).toBeVisible();
    await expect(named(page, "Paper Lanterns")).toHaveAttribute(
        "style",
        /translate/,
    );
    await page.mouse.up();
    await expect
        .poll(() => labels(playlist))
        .toEqual(["Paper Lanterns", "Due North", "Low Tide", "Static Bloom"]);

    // across panels, into the queue
    await drag(page, named(page, "Static Bloom"), named(page, "Slow Orbit"));
    await expect(queue).toHaveCount(3);
    await expect(playlist).toHaveCount(3);

    // Dockable moves the tab; the same list, re-parented, sorts again
    const before = await center(named(page, "Due North"));
    await page
        .getByRole("button", { name: "Move Playlist to the middle" })
        .click();
    await expect(
        page
            .getByRole("tablist", { name: "Tabs of middle" })
            .getByRole("tab", { name: "Playlist" }),
    ).toBeVisible();
    await expect
        .poll(async () => (await center(named(page, "Due North"))).x)
        .toBeGreaterThan(before.x + 50);
    await drag(page, named(page, "Low Tide"), named(page, "Paper Lanterns"));
    await expect
        .poll(() => labels(playlist))
        .toEqual(["Low Tide", "Paper Lanterns", "Due North"]);
});
