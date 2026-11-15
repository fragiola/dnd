import { expect, test } from "@playwright/test";
import { gridLayoutSources } from "../siblings";
import { center, drag, logOf } from "./helpers";

// The interop scenarios (src/scenarios/interop, D11): dnd inside and onto Dockable's primitives,
// and inside and onto Grid Layout's, each family's change going through its own commands.

const scenario = (id: string) => `/?scenario=interop/${id}`;

test("a draggable in a Dockable panel keeps working after its tab moves to another tabset", async ({
    page,
}) => {
    await page.goto(scenario("dockable-panel-move"));
    const card = page.getByTestId("panel-card");
    const bin = page.getByTestId("bin");
    await drag(page, card, bin);
    await expect.poll(() => logOf(page)).toEqual(["drop panel-card on bin"]);

    const right = page.getByTestId("tabset-right");
    await page
        .getByRole("button", { name: "Move Cards to the right tabset" })
        .click();
    await expect(right.getByRole("tab", { name: "Cards" })).toBeVisible();
    // the same card, re-parented under the right tabset's content area
    await expect
        .poll(async () => {
            const at = await center(card);
            const box = await right.boundingBox();
            return (
                at.x > (box?.x ?? 0) && at.x < (box?.x ?? 0) + (box?.width ?? 0)
            );
        })
        .toBe(true);
    await drag(page, card, bin);
    await expect
        .poll(() => logOf(page))
        .toEqual(["drop panel-card on bin", "drop panel-card on bin"]);
});

test("a dnd card dropped on a Dockable tabset adds a tab through tab.add", async ({
    page,
}) => {
    await page.goto(scenario("dockable-tabset-drop"));
    const right = page.getByTestId("tabset-right");
    // both libraries' attributes on the one element
    await expect(right).toHaveAttribute("data-layout-path", /ts/);
    await expect(right).toHaveAttribute("data-dnd-part", "droppable");
    await drag(page, page.getByTestId("card-Alpha"), right, { release: false });
    await expect(right).toHaveAttribute("data-dnd-over", "");
    await page.mouse.up();
    await expect(right.getByRole("tab", { name: "Alpha" })).toBeVisible();
    await expect(right.getByRole("tab")).toHaveCount(2);
    await expect(page.getByTestId("tabset-left").getByRole("tab")).toHaveCount(
        1,
    );
});

test.describe("Grid Layout", () => {
    test.skip(
        !gridLayoutSources(),
        "../grid-layout is not beside this repository",
    );

    test("a dnd draggable in a grid item drags without moving the item; a drop on the grid runs item.add", async ({
        page,
    }) => {
        await page.goto(scenario("grid-layout-item"));
        const item = page.getByTestId("item-a");
        await expect(item).toBeVisible();
        const layout = page.getByTestId("layout");
        const before = await layout.textContent();
        const box = await item.boundingBox();
        await drag(
            page,
            page.getByTestId("inner-card"),
            page.getByTestId("tray"),
        );
        await expect
            .poll(() => logOf(page))
            .toEqual(["drop inner-card on tray"]);
        expect(await item.boundingBox()).toEqual(box);
        await expect(layout).toHaveText(before ?? "");

        await drag(
            page,
            page.getByTestId("new-card"),
            page.getByTestId("grid"),
        );
        await expect
            .poll(() => logOf(page))
            .toEqual(["drop inner-card on tray", "item.add ok"]);
        await expect(layout).toContainText('"id":"n1"');
        await expect(page.getByTestId("item-n1")).toBeVisible();
    });
});
