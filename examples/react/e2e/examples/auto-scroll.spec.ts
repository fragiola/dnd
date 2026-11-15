import { expect, test } from "@playwright/test";
import { openExample } from "../helpers";
import { center, named, press } from "./helpers";

test("held near the list's bottom edge, the meeting scrolls the list and drops on a far day", async ({
    page,
}) => {
    await openExample(page, "auto-scroll");
    const list = named(page, "Days");
    const meeting = named(page, "Meeting");
    const box = await list.boundingBox();
    const bottom = (box?.y ?? 0) + (box?.height ?? 0);
    const from = await center(meeting);
    await press(page, meeting);
    await page.mouse.move(from.x, bottom - 10, { steps: 10 });
    await expect
        .poll(() => list.evaluate((element) => element.scrollTop), {
            timeout: 5000,
        })
        .toBeGreaterThan(300);
    // never further than the list's own content: the dragged card does not grow it
    const { scrollTop, scrollHeight, clientHeight } = await list.evaluate(
        (element) => ({
            scrollTop: element.scrollTop,
            scrollHeight: element.scrollHeight,
            clientHeight: element.clientHeight,
        }),
    );
    expect(scrollTop).toBeLessThanOrEqual(scrollHeight - clientHeight);
    // out of the edge zone, then onto a day now in view
    await page.mouse.move(from.x, (box?.y ?? 0) + (box?.height ?? 0) / 2, {
        steps: 5,
    });
    const over = page.getByTestId("stage").locator("[data-dnd-over]");
    await expect(over).toHaveCount(1);
    const day = await over.getAttribute("aria-label");
    await page.mouse.up();
    await expect(named(page, day ?? "").getByLabel("Meeting")).toBeVisible();
    expect(Number(day?.replace("Day ", ""))).toBeGreaterThan(4);
});
