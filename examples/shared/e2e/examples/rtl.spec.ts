import { expect, test } from "@playwright/test";
import { openExample } from "../helpers";
import { drag, named } from "./helpers";

test("the board reads right to left, and a card drags to another column", async ({
    page,
}) => {
    await openExample(page, "rtl");
    const todo = named(page, "للتنفيذ");
    const done = named(page, "منجز");
    // the first column is on the right
    const first = await todo.boundingBox();
    const last = await done.boundingBox();
    expect(first?.x ?? 0).toBeGreaterThan(last?.x ?? 0);
    await drag(page, named(page, "تصميم القائمة"), done);
    await expect(done.getByLabel("تصميم القائمة")).toBeVisible();
});

test("ArrowLeft goes to the next column in reading order", async ({ page }) => {
    await openExample(page, "rtl");
    const card = named(page, "إصلاح البحث");
    await card.focus();
    await page.keyboard.press("Space");
    await page.keyboard.press("ArrowLeft");
    await expect(named(page, "قيد العمل")).toHaveAttribute("data-dnd-over", "");
    await page.keyboard.press("Enter");
    await expect(
        named(page, "قيد العمل").getByLabel("إصلاح البحث"),
    ).toBeVisible();
});
