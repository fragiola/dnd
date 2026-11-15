import { expect, test } from "@playwright/test";
import { gridLayoutSources } from "../siblings";
import { center, drag, frame, logOf, moveTo, press } from "./helpers";

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

test("a sortable list sorts in a Dockable popout, in that window's drag space, and again once docked back", async ({
    page,
}) => {
    await page.goto(scenario("dockable-popout-sortable"));
    const order = page.getByTestId("order");
    await drag(
        page,
        page.getByTestId("item-one"),
        page.getByTestId("item-three"),
    );
    await expect(order).toHaveText("two three one four");

    const [popout] = await Promise.all([
        page.context().waitForEvent("page"),
        page.getByRole("button", { name: "Pop the list out" }).click(),
    ]);
    await popout.waitForLoadState();
    const item = (id: string) => popout.getByTestId(`item-${id}`);
    await expect(item("four")).toBeVisible();
    // the same elements, now in the popout's document
    expect(
        await item("four").evaluate(
            (element) => element.ownerDocument !== window.opener?.document,
        ),
    ).toBe(true);
    await expect(page.getByTestId("item-four")).toHaveCount(0);
    await drag(popout, item("four"), item("two"), { release: false });
    await frame(popout);
    await expect(item("two")).toHaveAttribute("style", /translate/);
    await popout.mouse.up();
    await expect(order).toHaveText("four two three one");
    await expect(item("two")).not.toHaveAttribute("style", /translate/);

    // docked back: the list sorts in the main window again
    await page.getByRole("button", { name: "Dock the list back" }).click();
    await expect(page.getByTestId("item-four")).toBeVisible();
    await drag(
        page,
        page.getByTestId("item-one"),
        page.getByTestId("item-four"),
    );
    await expect(order).toHaveText("one four two three");
    await expect
        .poll(() => logOf(page))
        .toEqual(["sort one 0 → 2", "sort four 3 → 0", "sort one 3 → 0"]);
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

    test("a kanban of grid items: cards sort and move between columns without dragging the grid item", async ({
        page,
    }) => {
        await page.goto(scenario("grid-layout-kanban"));
        const board = page.getByTestId("board");
        const layout = page.getByTestId("layout");
        await expect(page.getByTestId("item-todo")).toBeVisible();
        const before = await layout.textContent();
        const boxes = await Promise.all(
            ["todo", "doing", "done"].map((id) =>
                page.getByTestId(`item-${id}`).boundingBox(),
            ),
        );

        // within a column
        await drag(
            page,
            page.getByTestId("card-a"),
            page.getByTestId("card-c"),
        );
        await expect(board).toHaveText("card-b card-c card-a | card-d | ");
        // into another column, and into the empty one through its SortableGroup
        await press(page, page.getByTestId("card-b"));
        // the upper half of card-d: before it
        await moveTo(page, page.getByTestId("card-d"), 0, -8);
        await expect(page.locator('[data-dnd-part="overlay"]')).toBeVisible();
        await page.mouse.up();
        await expect(board).toHaveText("card-c card-a | card-b card-d | ");
        await press(page, page.getByTestId("card-a"));
        const done = await center(page.getByTestId("done"));
        await page.mouse.move(done.x, done.y, { steps: 10 });
        await page.mouse.up();
        await expect(board).toHaveText("card-c | card-b card-d | card-a");

        // the grid never moved an item
        await expect(layout).toHaveText(before ?? "");
        for (const [index, id] of ["todo", "doing", "done"].entries())
            expect(await page.getByTestId(`item-${id}`).boundingBox()).toEqual(
                boxes[index],
            );
        await expect
            .poll(() => logOf(page))
            .toEqual([
                "sort card-a todo:0 → todo:2",
                "sort card-b todo:0 → doing:0",
                "sort card-a todo:1 → done:0",
            ]);

        // the grid item still drags from its header, which dnd leaves alone
        const header = page.getByTestId("header-todo");
        const at = await center(header);
        await page.mouse.move(at.x, at.y);
        await page.mouse.down();
        await page.mouse.move(at.x + 300, at.y, { steps: 12 });
        await page.mouse.up();
        await expect(layout).not.toHaveText(before ?? "");
    });
});
