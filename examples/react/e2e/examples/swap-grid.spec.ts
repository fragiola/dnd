import { expect, test } from "@playwright/test";
import { openExample } from "../helpers";
import { drag, labels, named } from "./helpers";

test("only the target shifts in the preview, and the drop swaps the two widgets", async ({
    page,
}) => {
    await openExample(page, "swap-grid");
    const widgets = named(page, "Dashboard").getByRole("listitem");
    const target = named(page, "Regions");
    await drag(page, named(page, "Visitors"), target, { release: false });
    await expect(target).toHaveAttribute("data-dnd-swap-target", "");
    await expect(target).toHaveAttribute("style", /translate/);
    for (const other of ["Revenue", "Uptime", "Latency", "Load"])
        await expect(named(page, other), other).not.toHaveAttribute(
            "style",
            /translate/,
        );
    await page.mouse.up();
    await expect
        .poll(() => labels(widgets))
        .toEqual([
            "Regions",
            "Revenue",
            "Uptime",
            "Latency",
            "Visitors",
            "Load",
        ]);
    await expect(target).not.toHaveAttribute("data-dnd-swap-target");
});

test("the keyboard picks the target, and Escape cancels the swap", async ({
    page,
}) => {
    await openExample(page, "swap-grid");
    const widgets = named(page, "Dashboard").getByRole("listitem");
    await named(page, "Revenue").focus();
    await page.keyboard.press("Space");
    await page.keyboard.press("ArrowRight");
    await expect(named(page, "Uptime")).toHaveAttribute(
        "data-dnd-swap-target",
        "",
    );
    await page.keyboard.press("Escape");
    await expect(named(page, "Uptime")).not.toHaveAttribute(
        "data-dnd-swap-target",
    );
    await named(page, "Revenue").focus();
    for (const key of ["Space", "ArrowRight", "Enter"])
        await page.keyboard.press(key);
    await expect
        .poll(() => labels(widgets))
        .toEqual([
            "Visitors",
            "Uptime",
            "Revenue",
            "Latency",
            "Regions",
            "Load",
        ]);
});
