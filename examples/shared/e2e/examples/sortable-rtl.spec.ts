import { expect, test } from "@playwright/test";
import { openExample } from "../helpers";
import { center, drag, labels, named } from "./helpers";

test("right to left: the tabs flow from the right, and a tab dragged leftward moves forward", async ({
    page,
}) => {
    await openExample(page, "sortable-rtl");
    const tabs = named(page, "علامات التبويب").getByRole("listitem");
    const home = named(page, "الرئيسية");
    const reports = named(page, "التقارير");
    // the first tab is the rightmost
    expect((await center(home)).x).toBeGreaterThan((await center(reports)).x);
    await drag(page, home, named(page, "الفريق"), { release: false });
    await expect(reports).toHaveAttribute("style", /translate/);
    await page.mouse.up();
    await expect
        .poll(() => labels(tabs))
        .toEqual(["التقارير", "الفريق", "الرئيسية", "الإعدادات"]);

    // the keyboard follows reading order: ArrowLeft is forward
    await named(page, "التقارير").focus();
    for (const key of ["Space", "ArrowLeft", "Enter"])
        await page.keyboard.press(key);
    await expect
        .poll(() => labels(tabs))
        .toEqual(["الفريق", "التقارير", "الرئيسية", "الإعدادات"]);
});

test("right to left: the grid fills its rows from the right", async ({
    page,
}) => {
    await openExample(page, "sortable-rtl");
    const apps = named(page, "التطبيقات").getByRole("listitem");
    await drag(page, named(page, "البريد"), named(page, "الملفات"));
    await expect
        .poll(() => labels(apps))
        .toEqual([
            "التقويم",
            "الملاحظات",
            "الملفات",
            "البريد",
            "الصور",
            "الموسيقى",
        ]);
});
