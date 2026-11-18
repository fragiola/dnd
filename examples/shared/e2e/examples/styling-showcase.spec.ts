import { expect, test } from "@playwright/test";
import { openExample } from "../helpers";
import { drag, named } from "./helpers";

test("the lift, the columns' states, and a cancelled drag gliding home", async ({
    page,
}) => {
    await openExample(page, "styling-showcase");
    const card = named(page, "Fix the login redirect");
    const review = named(page, "In review");
    const frozen = named(page, "Frozen");
    await drag(page, card, frozen, { release: false });
    // the lift composes with the translate the core writes
    await expect(card).toHaveAttribute("data-dnd-dragging", "");
    await expect(card).not.toHaveCSS("rotate", "none");
    await expect(card).not.toHaveCSS("translate", "none");
    await expect(review).toHaveAttribute("data-dnd-active", "");
    await expect(frozen).toHaveAttribute("data-dnd-refused", "");
    await page.keyboard.press("Escape");
    await expect(card).not.toHaveAttribute("data-dnd-dragging");
    // the core cleared `translate`; the card's own transition glides it back
    const gliding = await card.evaluate((element) =>
        element
            .getAnimations()
            .some(
                (animation) =>
                    animation instanceof CSSTransition &&
                    animation.transitionProperty === "translate",
            ),
    );
    expect(gliding).toBe(true);
    await page.mouse.up();
    await expect(
        named(page, "Ready").getByLabel("Fix the login redirect"),
    ).toBeVisible();

    // the card glides home first: pressed mid-glide, it would move away from the press
    await page.waitForFunction(() =>
        document
            .getAnimations()
            .every((animation) => animation.playState !== "running"),
    );
    await drag(page, card, review, { release: false });
    await expect(review).toHaveAttribute("data-dnd-over", "");
    await page.mouse.up();
    await expect(review.getByLabel("Fix the login redirect")).toBeVisible();
});

test("a frozen card is disabled", async ({ page }) => {
    await openExample(page, "styling-showcase");
    const card = named(page, "Write the setup guide");
    await expect(card).toHaveAttribute("data-dnd-disabled", "");
    await expect(card).toHaveAttribute("aria-disabled", "true");
    await drag(page, card, named(page, "Ready"));
    await expect(
        named(page, "Frozen").getByLabel("Write the setup guide"),
    ).toBeVisible();
});
