import { expect, test } from "@playwright/test";
import { openExample } from "../helpers";
import { center, drag, labels, named } from "./helpers";

test("a Fragiola UI Avatar is the sortable item and keeps its own classes and slot", async ({
    page,
}) => {
    await openExample(page, "sortable-fragiola-ui");
    const ada = named(page, "Ada Lovelace");
    await expect(ada).toHaveAttribute("data-slot", "avatar");
    await expect(ada).toHaveAttribute("data-dnd-part", "sortable");
    await expect(ada).toHaveClass(/rounded-full/);
    await drag(page, ada, named(page, "Grace Hopper"));
    const xs = await Promise.all(
        ["Alan Turing", "Grace Hopper", "Ada Lovelace", "Linus Torvalds"].map(
            async (name) => (await center(named(page, name))).x,
        ),
    );
    expect([...xs].sort((a, b) => a - b)).toEqual(xs);
});

test("a Switch keeps its handler and never starts a sort; the Clickable handle sorts the row", async ({
    page,
}) => {
    await openExample(page, "sortable-fragiola-ui");
    const rows = named(page, "Channels").getByRole("listitem");
    const push = page.getByRole("switch", { name: "Push notifications on" });
    await expect(push).toHaveAttribute("aria-checked", "false");
    await push.click();
    await expect(push).toHaveAttribute("aria-checked", "true");
    await expect(named(page, "Push notifications")).not.toHaveAttribute(
        "data-dnd-dragging",
    );

    const handle = page.getByRole("button", { name: "Move Email" });
    await expect(handle).toHaveAttribute("data-slot", "clickable-button");
    await drag(page, handle, rows.nth(2));
    await expect
        .poll(() => labels(rows))
        .toEqual([
            "Push notifications",
            "Text messages",
            "Email",
            "Weekly digest",
        ]);
    // the switches kept their state through the move
    await expect(push).toHaveAttribute("aria-checked", "true");
    await expect(
        page.getByRole("switch", { name: "Email on" }),
    ).toHaveAttribute("aria-checked", "true");
});
