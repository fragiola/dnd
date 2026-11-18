import { expect, test } from "@playwright/test";
import { openExample } from "../helpers";
import { drag, named } from "./helpers";

test("a folder that refuses a file says so and never takes it", async ({
    page,
}) => {
    await openExample(page, "accepts-types");
    const images = named(page, "Images");
    const documents = named(page, "Documents");
    const small = named(page, "Small files");
    await drag(page, named(page, "beach.jpg"), documents, { release: false });
    // the folders that would take it are active; the one under it refuses it
    await expect(images).toHaveAttribute("data-dnd-active", "");
    await expect(documents).not.toHaveAttribute("data-dnd-active");
    await expect(small).not.toHaveAttribute("data-dnd-active");
    await expect(documents).toHaveAttribute("data-dnd-refused", "");
    await expect(documents).not.toHaveAttribute("data-dnd-over");
    await page.mouse.up();
    await expect(documents.getByLabel("beach.jpg")).toHaveCount(0);
    await expect(documents).not.toHaveAttribute("data-dnd-refused");

    await drag(page, named(page, "beach.jpg"), images);
    await expect(images.getByLabel("beach.jpg")).toBeVisible();
});

test("a predicate takes small files of any kind", async ({ page }) => {
    await openExample(page, "accepts-types");
    const small = named(page, "Small files");
    await drag(page, named(page, "notes.txt"), small);
    await expect(small.getByLabel("notes.txt")).toBeVisible();
    await drag(page, named(page, "theme.mp3"), small, { release: false });
    await expect(small).toHaveAttribute("data-dnd-refused", "");
    await page.mouse.up();
    await expect(small.getByLabel("theme.mp3")).toHaveCount(0);
});
