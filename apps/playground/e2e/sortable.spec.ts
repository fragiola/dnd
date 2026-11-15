import { expect, type Locator, type Page, test } from "@playwright/test";
import {
    commits,
    DIRS,
    drag,
    forward,
    frame,
    logOf,
    moveTo,
    press,
    sortFixture,
} from "./helpers";

// The sortable and swappable fixture, the same spec left-to-right and right-to-left, in Chromium
// and Firefox: lists, a grid and a kanban sorted by pointer and keyboard with no wrapper around a
// list, an empty group, a refusing one, swaps within and across groups, cancels that restore every
// shift, and no React commit during a preview.

const order = (page: Page, group: string) => page.getByTestId(`order-${group}`);
const SHIFTED = /translate/;

/** Expects none of the items to carry a shift. */
async function atRest(page: Page, ...items: string[]): Promise<void> {
    for (const id of items)
        await expect(page.getByTestId(id), id).not.toHaveAttribute(
            "style",
            SHIFTED,
        );
}

/** Presses `from`, waits for the start's commits, and returns the count. */
async function grab(page: Page, from: Locator): Promise<number> {
    await press(page, from);
    await frame(page);
    return commits(page);
}

/** The keys pressed one by one on the focused item. */
async function keys(page: Page, ...names: string[]): Promise<void> {
    for (const name of names) await page.keyboard.press(name);
}

for (const dir of DIRS) {
    test.describe(dir, () => {
        test.beforeEach(async ({ page }) => {
            await page.goto(sortFixture(dir));
            await expect(page.getByTestId("v-a")).toBeVisible();
        });

        test("sorts a vertical list by pointer: the core shifts, React commits only the result", async ({
            page,
        }) => {
            const before = await grab(page, page.getByTestId("v-a"));
            await moveTo(page, page.getByTestId("v-c"));
            await frame(page);
            await expect(page.getByTestId("v-b")).toHaveAttribute(
                "style",
                SHIFTED,
            );
            await expect(page.getByTestId("v-c")).toHaveAttribute(
                "style",
                SHIFTED,
            );
            await atRest(page, "v-d");
            await expect(page.getByTestId("v-b")).toHaveAttribute(
                "data-dnd-sorting",
                "",
            );
            // the app's order and DOM are untouched, and nothing rendered
            await expect(order(page, "v")).toHaveText("v-a v-b v-c v-d");
            expect(await commits(page)).toBe(before);
            // the first frame after the release already shows the app's order, with no shift left
            await page.evaluate(() =>
                document.addEventListener(
                    "pointerup",
                    () =>
                        requestAnimationFrame(() => {
                            document.body.dataset.firstFrame = [
                                ...document.querySelectorAll<HTMLElement>(
                                    '[data-testid="v"] li',
                                ),
                            ]
                                .map(
                                    (li) =>
                                        `${li.textContent}${li.style.translate ? "*" : ""}`,
                                )
                                .join(" ");
                        }),
                    { once: true, capture: true },
                ),
            );
            await page.mouse.up();
            await expect(page.locator("body")).toHaveAttribute(
                "data-first-frame",
                "v-b v-c v-a v-d",
            );
            await expect(order(page, "v")).toHaveText("v-b v-c v-a v-d");
            expect(await logOf(page)).toEqual(["sort v-a v:0 → v:2"]);
            await atRest(page, "v-a", "v-b", "v-c", "v-d");
            await expect(page.getByTestId("v-b")).not.toHaveAttribute(
                "data-dnd-sorting",
            );
            // the DOM follows the app's new order
            await expect(page.getByTestId("v").locator("li")).toHaveText([
                "v-b",
                "v-c",
                "v-a",
                "v-d",
            ]);
        });

        test("sorts by the keyboard, slot by slot, and Escape restores every shift", async ({
            page,
        }) => {
            await page.getByTestId("v-d").focus();
            await keys(page, "Space", "ArrowUp", "ArrowUp", "ArrowUp", "Enter");
            await expect(order(page, "v")).toHaveText("v-d v-a v-b v-c");
            await page.getByTestId("v-a").focus();
            await keys(page, "Space", "ArrowDown", "ArrowDown");
            await expect(page.getByTestId("v-b")).toHaveAttribute(
                "style",
                SHIFTED,
            );
            await keys(page, "Escape");
            await atRest(page, "v-a", "v-b", "v-c", "v-d");
            await expect(order(page, "v")).toHaveText("v-d v-a v-b v-c");
            expect(await logOf(page)).toEqual([
                "sort v-d v:3 → v:0",
                "cancel v-a",
            ]);
        });

        test("cancels a pointer sort on Escape: every shift back, nothing moved", async ({
            page,
        }) => {
            await drag(page, page.getByTestId("v-a"), page.getByTestId("v-d"), {
                release: false,
            });
            await frame(page);
            await expect(page.getByTestId("v-d")).toHaveAttribute(
                "style",
                SHIFTED,
            );
            await page.keyboard.press("Escape");
            await atRest(page, "v-a", "v-b", "v-c", "v-d");
            await page.mouse.up();
            await expect(order(page, "v")).toHaveText("v-a v-b v-c v-d");
            expect(await logOf(page)).toEqual(["cancel v-a"]);
        });

        test("sorts a horizontal list from the inline start, by pointer and keyboard", async ({
            page,
        }) => {
            await drag(page, page.getByTestId("h-a"), page.getByTestId("h-c"));
            await expect(order(page, "h")).toHaveText("h-b h-c h-a h-d");
            await page.getByTestId("h-b").focus();
            await keys(
                page,
                "Space",
                forward(dir),
                forward(dir),
                forward(dir),
                "Space",
            );
            await expect(order(page, "h")).toHaveText("h-c h-a h-d h-b");
            await atRest(page, "h-a", "h-b", "h-c", "h-d");
        });

        test("sorts a grid across rows, by pointer and keyboard", async ({
            page,
        }) => {
            await drag(page, page.getByTestId("g-a"), page.getByTestId("g-e"));
            await expect(order(page, "g")).toHaveText(
                "g-b g-c g-d g-e g-a g-f",
            );
            await page.getByTestId("g-f").focus();
            await keys(page, "Space", "ArrowUp", "ArrowUp", "ArrowUp", "Enter");
            await expect(order(page, "g")).toHaveText(
                "g-b g-c g-f g-d g-e g-a",
            );
        });

        test("moves a card between groups that accept each other, and into an empty one", async ({
            page,
        }) => {
            await press(page, page.getByTestId("todo-a"));
            await moveTo(page, page.getByTestId("doing-a"), 0, -10);
            await frame(page);
            // the source's gap closes, the target opens one
            await expect(page.getByTestId("todo-b")).toHaveAttribute(
                "style",
                SHIFTED,
            );
            await expect(page.getByTestId("doing-a")).toHaveAttribute(
                "style",
                SHIFTED,
            );
            await page.mouse.up();
            await expect(order(page, "todo")).toHaveText("todo-b todo-c");
            await expect(order(page, "doing")).toHaveText("todo-a doing-a");
            await drag(
                page,
                page.getByTestId("todo-b"),
                page.getByTestId("done"),
            );
            await expect(order(page, "done")).toHaveText("todo-b");
            await expect(page.getByTestId("done").locator("li")).toHaveText([
                "todo-b",
            ]);
            expect(await logOf(page)).toEqual([
                "sort todo-a todo:0 → doing:0",
                "sort todo-b todo:0 → done:0",
            ]);
            await atRest(page, "todo-a", "todo-b", "todo-c", "doing-a");
        });

        test("never enters a refusing group", async ({ page }) => {
            await press(page, page.getByTestId("todo-a"));
            await moveTo(page, page.getByTestId("locked-a"));
            await frame(page);
            await atRest(page, "locked-a", "locked-b");
            await expect(page.getByTestId("locked-a")).not.toHaveAttribute(
                "data-dnd-sorting",
            );
            await page.mouse.up();
            await expect(order(page, "locked")).toHaveText("locked-a locked-b");
            await expect(order(page, "todo")).toHaveText(
                "todo-a todo-b todo-c",
            );
            expect(await logOf(page)).toEqual(["sort todo-a todo:0 → todo:0"]);
        });

        test("swaps within a group: only the target moves, and nothing renders", async ({
            page,
        }) => {
            const before = await grab(page, page.getByTestId("s1-a"));
            await moveTo(page, page.getByTestId("s1-c"));
            await frame(page);
            await expect(page.getByTestId("s1-c")).toHaveAttribute(
                "data-dnd-swap-target",
                "",
            );
            await expect(page.getByTestId("s1-c")).toHaveAttribute(
                "style",
                SHIFTED,
            );
            await atRest(page, "s1-b", "s1-d");
            expect(await commits(page)).toBe(before);
            await page.mouse.up();
            await expect(order(page, "s1")).toHaveText("s1-c s1-b s1-a s1-d");
            await expect(page.getByTestId("s1-a")).not.toHaveAttribute(
                "data-dnd-swap-target",
            );
            await atRest(page, "s1-a", "s1-c");
            expect(await logOf(page)).toEqual(["swap s1-a ⇄ s1-c"]);
        });

        test("swaps across groups by pointer and keyboard, and Escape restores", async ({
            page,
        }) => {
            await drag(
                page,
                page.getByTestId("s1-a"),
                page.getByTestId("s2-b"),
            );
            await expect(order(page, "s1")).toHaveText("s2-b s1-b s1-c s1-d");
            await expect(order(page, "s2")).toHaveText("s2-a s1-a");
            await page.getByTestId("s1-b").focus();
            await keys(page, "Space", forward(dir), forward(dir));
            await expect(page.getByTestId("s1-d")).toHaveAttribute(
                "data-dnd-swap-target",
                "",
            );
            await keys(page, "Escape");
            await atRest(page, "s1-d");
            await expect(page.getByTestId("s1-d")).not.toHaveAttribute(
                "data-dnd-swap-target",
            );
            await keys(page, "Space", forward(dir), "Enter");
            await expect(order(page, "s1")).toHaveText("s2-b s1-c s1-b s1-d");
            expect(await logOf(page)).toEqual([
                "swap s1-a ⇄ s2-b",
                "cancel s1-b",
                "swap s1-b ⇄ s1-c",
            ]);
        });
    });
}
