import { expect, type Page, test } from "@playwright/test";
import { openExample } from "../helpers";
import { drag, labels, named } from "./helpers";

// The live dispatch. Its feed is seeded: the opening board is the same every time, and under
// reduced motion it starts paused, so the specs that drag start that way and nothing moves under
// them. The others play it and only assert what holds while it plays.

/** A ticket by its id (its accessible name starts with it). */
const ticket = (page: Page, id: string) =>
    page.getByTestId("stage").locator(`li[aria-label^="${id}:"]`);

/** The ticket ids of a column's list, in order. */
const ids = async (page: Page, list: string) =>
    (await labels(named(page, list).getByRole("listitem"))).map(
        (label) => label?.split(":")[0],
    );

const clock = (page: Page) =>
    page.getByRole("timer", { name: "Shift clock" }).textContent();

/** Whether the element animates its `translate` (a glide home). */
const gliding = (page: Page, id: string) =>
    ticket(page, id).evaluate((element) =>
        element
            .getAnimations()
            .some(
                (animation) =>
                    animation instanceof CSSTransition &&
                    animation.transitionProperty === "translate",
            ),
    );

async function openPaused(page: Page) {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openExample(page, "support-dispatch");
    await expect(
        page.getByRole("button", { name: "Play the feed" }),
    ).toBeVisible();
}

test("it plays: the clock and the SLAs move, and Pause freezes them", async ({
    page,
}) => {
    await openExample(page, "support-dispatch");
    const pause = page.getByRole("button", { name: "Pause the feed" });
    await expect(pause).toBeVisible();
    const sla = ticket(page, "T-1041").locator("[data-sla]");
    const before = { clock: await clock(page), sla: await sla.textContent() };
    await expect.poll(() => clock(page)).not.toBe(before.clock);
    await expect.poll(() => sla.textContent()).not.toBe(before.sla);

    await pause.click();
    await expect(
        page.getByRole("button", { name: "Play the feed" }),
    ).toBeVisible();
    const frozen = { clock: await clock(page), sla: await sla.textContent() };
    await page.waitForTimeout(1200);
    expect(await clock(page)).toBe(frozen.clock);
    expect(await sla.textContent()).toBe(frozen.sla);
});

test("under reduced motion it starts paused, and Play starts it", async ({
    page,
}) => {
    await openPaused(page);
    const opening = await clock(page);
    await page.waitForTimeout(1200);
    expect(await clock(page)).toBe(opening);
    await page.getByRole("button", { name: "Play the feed" }).click();
    await expect.poll(() => clock(page)).not.toBe(opening);
});

test("a ticket goes to an agent with its skill and room, and sorts within a queue", async ({
    page,
}) => {
    await openPaused(page);
    expect(await ids(page, "Triage queue")).toEqual([
        "T-1041",
        "T-1042",
        "T-1043",
        "T-1044",
    ]);
    await drag(page, ticket(page, "T-1041"), named(page, "Ava's queue"));
    await expect.poll(() => ids(page, "Ava's queue")).toContain("T-1041");
    await expect(page.getByRole("status")).toHaveText(
        "T-1041 assigned to Ava.",
    );
    await expect(named(page, "Ava")).toHaveAttribute("data-full", "");

    await drag(page, ticket(page, "T-1044"), ticket(page, "T-1042"));
    await expect
        .poll(() => ids(page, "Triage queue"))
        .toEqual(["T-1044", "T-1042", "T-1043"]);
});

test("a full agent, or one without the skill, refuses the drop, and the ticket glides back", async ({
    page,
}) => {
    await openPaused(page);
    const noor = named(page, "Noor");
    await expect(noor).toHaveAttribute("data-full", "");

    await drag(page, ticket(page, "T-1042"), named(page, "Noor's queue"), {
        release: false,
    });
    await expect(noor).toHaveAttribute("data-refuses", "full");
    await expect(noor).toHaveAttribute("data-dnd-over", "");
    // Ava takes billing and account tickets, not technical ones
    await expect(named(page, "Ava")).toHaveAttribute("data-refuses", "skill");
    await page.mouse.up();
    expect(await gliding(page, "T-1042")).toBe(true);
    await expect(page.getByRole("status")).toHaveText(
        "Noor is full: T-1042 stays where it was.",
    );
    expect(await ids(page, "Noor's queue")).toEqual([
        "T-1035",
        "T-1037",
        "T-1039",
    ]);
    expect(await ids(page, "Triage queue")).toEqual([
        "T-1041",
        "T-1042",
        "T-1043",
        "T-1044",
    ]);
    await expect(named(page, "Ava")).not.toHaveAttribute("data-refuses");
});

test("the keyboard moves a ticket to an agent, and a ticket arriving meanwhile does not cancel the drag", async ({
    page,
}) => {
    await openExample(page, "support-dispatch");
    const moved = ticket(page, "T-1043");
    await moved.focus();
    await page.keyboard.press("Space");
    await expect(moved).toHaveAttribute("data-dnd-dragging", "");
    // the feed keeps playing: a caller arrives, and waits for the drop
    await expect(page.getByRole("status")).toContainText("for your drop", {
        timeout: 10_000,
    });
    await expect(moved).toHaveAttribute("data-dnd-dragging", "");
    expect(await ids(page, "Triage queue")).toEqual([
        "T-1041",
        "T-1042",
        "T-1043",
        "T-1044",
    ]);
    // past the end of Triage, into Ava's queue (account tickets are hers; Noor refuses them)
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Space");
    await expect(moved).not.toHaveAttribute("data-dnd-dragging");
    await expect.poll(() => ids(page, "Ava's queue")).toContain("T-1043");
    await expect(ticket(page, "T-1043")).toBeFocused();
    // the caller comes in once the drag is over
    await expect(ticket(page, "T-1045")).toBeVisible();
    expect(await ids(page, "Triage queue")).toContain("T-1045");
});

test("in Swap mode two agents' tickets change hands when each has the other's skill", async ({
    page,
}) => {
    await openPaused(page);
    const swap = page.getByRole("button", { name: "Swap", exact: true });
    await swap.click();
    await expect(swap).toHaveAttribute("aria-pressed", "true");

    await drag(page, ticket(page, "T-1040"), ticket(page, "T-1038"), {
        release: false,
    });
    await expect(ticket(page, "T-1038")).toHaveAttribute(
        "data-dnd-swap-target",
        "",
    );
    await page.mouse.up();
    await expect
        .poll(() => ids(page, "Ava's queue"))
        .toEqual(["T-1036", "T-1040"]);
    expect(await ids(page, "Kenji's queue")).toEqual(["T-1038"]);

    // Ava has no technical skill: Noor's ticket is no swap for hers
    await page.waitForFunction(() =>
        document
            .getAnimations()
            .every((animation) => animation.playState !== "running"),
    );
    await drag(page, ticket(page, "T-1037"), ticket(page, "T-1036"), {
        release: false,
    });
    await expect(ticket(page, "T-1036")).not.toHaveAttribute(
        "data-dnd-swap-target",
    );
    await page.mouse.up();
    expect(await ids(page, "Ava's queue")).toEqual(["T-1036", "T-1040"]);
    expect(await ids(page, "Noor's queue")).toEqual([
        "T-1035",
        "T-1037",
        "T-1039",
    ]);
});
