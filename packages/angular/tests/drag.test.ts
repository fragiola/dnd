import {
    afterEveryRender,
    ChangeDetectionStrategy,
    Component,
    effect,
    input,
    output,
    signal,
    viewChild,
} from "@angular/core";
import { createDragSpace, type DragSpace, getDragSpace } from "@fragiola/dnd";
import { describe, expect, it, vi } from "vitest";
import { DndDraggable, DndDragHandle } from "../draggable/public-api";
import { DndDroppable } from "../droppable/public-api";
import { injectDragMonitor, injectDragSpace } from "../src/public-api";
import {
    byTestId,
    flush,
    key,
    placeAll,
    pointer,
    render,
    settle,
} from "./helpers";

// The directives in a drag: no provider between the two halves, scopes and explicit spaces,
// handles, option updates without a re-register, a second render, and no change detection while
// the pointer moves inside one droppable (D8).

const BOXES = {
    card: { x: 0, y: 0, width: 50, height: 50 },
    left: { x: 100, y: 0, width: 100, height: 100 },
    right: { x: 300, y: 0, width: 100, height: 100 },
};

/** The views refreshed, by part id: the render counter of D8. */
const renders: string[] = [];
const seen = (id: string, _state: unknown) => {
    renders.push(id);
    return "";
};

/** A draggable in a component of its own, whose view reads its state. */
@Component({
    selector: "test-card",
    imports: [DndDraggable],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `<div
        dndDraggable="card"
        type="task"
        #card="dndDraggable"
        data-testid="card"
        [attr.data-render]="seen('card', card.state())"
        (dragEnd)="ended.set(ended() + 1)"
    ></div>`,
})
class Card {
    protected readonly seen = seen;
    readonly ended = signal(0);
}

/** A droppable in a component of its own, whose view reads its state. */
@Component({
    selector: "test-zone",
    imports: [DndDroppable],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `<div
        [dndDroppable]="id()"
        #zone="dndDroppable"
        [scope]="scope()"
        [accepts]="accepts()"
        [attr.data-testid]="id()"
        [attr.data-render]="seen(id(), zone.state())"
        (drop)="dropped.emit(id())"
    ></div>`,
})
class Zone {
    readonly id = input.required<string>();
    readonly scope = input<string | undefined>(undefined);
    readonly accepts = input<readonly string[] | undefined>(undefined);
    readonly dropped = output<string>();
    protected readonly seen = seen;
}

/** Change detection passes of the app (after every render), counted from the page. */
let ticks = 0;

/** The draggable and two droppables in unrelated subtrees, with no common wrapper. */
@Component({
    selector: "test-page",
    imports: [Card, Zone],
    template: `<main>
        <aside><div><test-card /></div></aside>
        <section><test-zone id="left" [scope]="scope()" [accepts]="accepts()" (dropped)="drops.push($event)" /></section>
        <footer><test-zone id="right" (dropped)="drops.push($event)" /></footer>
    </main>`,
})
class Page {
    readonly scope = input<string | undefined>(undefined);
    readonly accepts = input<readonly string[] | undefined>(undefined);
    readonly drops: string[] = [];

    constructor() {
        afterEveryRender(() => {
            ticks++;
        });
    }
}

/** Drags the card from its centre to (x, y), waiting for Angular after each step. */
async function dragCard(x: number, y: number, release = true) {
    const press = pointer(byTestId("card"), 25, 25);
    press.move(30, 25);
    await settle();
    press.move(x, y);
    await settle();
    if (release) {
        press.release(x, y);
        await settle();
    }
    return press;
}

describe("a drag with no provider", () => {
    it("drops a draggable on a droppable in an unrelated subtree", async () => {
        const fixture = await render(Page);
        placeAll(BOXES);
        const press = await dragCard(150, 50, false);
        expect(byTestId("card").dataset.dndDragging).toBe("");
        expect(byTestId("left").dataset.dndOver).toBe("");
        expect(byTestId("left").dataset.dndActive).toBe("");
        press.release(150, 50);
        await settle();
        expect(fixture.componentInstance.drops).toEqual(["left"]);
        expect(byTestId("card").dataset.dndDragging).toBeUndefined();
        expect(byTestId("left").dataset.dndOver).toBeUndefined();
    });

    it("writes only the allow-listed inline style: translate while dragging, nothing after", async () => {
        await render(Page);
        placeAll(BOXES);
        const card = byTestId("card");
        const press = await dragCard(150, 50, false);
        flush();
        expect([...card.style]).toEqual(["translate"]);
        expect(card.style.translate).toBe("125px 25px");
        for (const id of ["left", "right"])
            expect(byTestId(id).getAttribute("style")).toBeNull();
        press.release(150, 50);
        await settle();
        expect(card.getAttribute("style")).toBe("");
    });

    it("marks a refusing droppable and never drops on it", async () => {
        const fixture = await render(Page, { accepts: ["note"] });
        placeAll(BOXES);
        const press = await dragCard(150, 50, false);
        const left = byTestId("left");
        expect(left.dataset.dndRefused).toBe("");
        expect(left.dataset.dndOver).toBeUndefined();
        expect(left.dataset.dndActive).toBeUndefined();
        press.release(150, 50);
        await settle();
        expect(fixture.componentInstance.drops).toEqual([]);
    });

    it("never meets a droppable of another scope", async () => {
        const fixture = await render(Page, { scope: "other" });
        placeAll(BOXES);
        await dragCard(150, 50);
        expect(fixture.componentInstance.drops).toEqual([]);
        await dragCard(350, 50);
        expect(fixture.componentInstance.drops).toEqual(["right"]);
    });

    it("keeps an explicit space isolated from the document's", async () => {
        const drops: string[] = [];
        @Component({
            imports: [DndDraggable, DndDroppable],
            template: `
                <div dndDraggable="card" [space]="space" data-testid="card"></div>
                <div dndDroppable="left" data-testid="left" (drop)="drops.push('left')"></div>
                <div dndDroppable="right" [space]="space" data-testid="right" (drop)="drops.push('right')"></div>
            `,
        })
        class Explicit {
            readonly space = space;
            readonly drops = drops;
        }
        const space = createDragSpace({ document });
        await render(Explicit);
        placeAll(BOXES);
        expect(space.get("draggable-ids")).toEqual(["card"]);
        expect(getDragSpace(document).get("draggable-ids")).toEqual([]);
        await dragCard(150, 50);
        expect(drops).toEqual([]);
        await dragCard(350, 50);
        expect(drops).toEqual(["right"]);
    });

    it("cancels on Escape: no drop, (dragCancel)", async () => {
        const events: string[] = [];
        @Component({
            imports: [DndDraggable, DndDroppable],
            template: `
                <div dndDraggable="card" data-testid="card" (dragCancel)="events.push('cancel')"></div>
                <div dndDroppable="left" data-testid="left" (drop)="events.push('drop')"></div>
            `,
        })
        class Cancel {
            readonly events = events;
        }
        await render(Cancel);
        placeAll(BOXES);
        const press = await dragCard(150, 50, false);
        key("Escape", document.body);
        press.release(150, 50);
        await settle();
        expect(events).toEqual(["cancel"]);
        expect(byTestId("card").dataset.dndDragging).toBeUndefined();
    });

    it("drags by the keyboard from the draggable's tab stop", async () => {
        const fixture = await render(Page);
        placeAll(BOXES);
        byTestId("card").focus();
        key(" ");
        flush();
        await settle();
        for (let i = 0; i < 5; i++) {
            key("ArrowRight");
            flush();
            await settle();
        }
        key("Enter");
        await settle();
        expect(fixture.componentInstance.drops).toEqual(["left"]);
    });
});

/** A handle deep in a component of its own: no injection links it to its draggable. */
@Component({
    selector: "test-grip",
    imports: [DndDragHandle],
    template: `<p><span dndDragHandle data-testid="grip"></span></p>`,
})
class Grip {}

describe("a drag handle", () => {
    it("is the only place a drag starts, found through the DOM across components", async () => {
        const starts = vi.fn();
        @Component({
            imports: [DndDraggable, Grip],
            template: `<div dndDraggable="card" data-testid="card" (dragStart)="starts()"><test-grip /></div>`,
        })
        class Handled {
            readonly starts = starts;
        }
        await render(Handled);
        placeAll({ ...BOXES, grip: { x: 0, y: 0, width: 10, height: 10 } });
        const card = byTestId("card");
        const grip = byTestId("grip");
        expect(card.hasAttribute("tabindex")).toBe(false);
        expect(grip.getAttribute("tabindex")).toBe("0");
        pointer(card, 25, 25).move(80, 25);
        expect(starts).not.toHaveBeenCalled();
        const press = pointer(grip, 5, 5);
        press.move(60, 5);
        await settle();
        expect(starts).toHaveBeenCalledTimes(1);
        expect(grip.dataset.dndDragging).toBe("");
        press.release(60, 5);
        await settle();
        expect(grip.dataset.dndDragging).toBeUndefined();
    });

    it("follows a handle rendered later, and gives the element back when it goes", async () => {
        @Component({
            imports: [DndDraggable, DndDragHandle],
            template: `<div dndDraggable="card" data-testid="card">
                @if (grip()) {
                    <span dndDragHandle data-testid="grip"></span>
                }
            </div>`,
        })
        class Later {
            readonly grip = signal(false);
        }
        const fixture = await render(Later);
        expect(byTestId("card").getAttribute("tabindex")).toBe("0");
        fixture.componentInstance.grip.set(true);
        await settle();
        expect(byTestId("card").hasAttribute("tabindex")).toBe(false);
        expect(byTestId("grip").style.touchAction).toBe("none");
        fixture.componentInstance.grip.set(false);
        await settle();
        expect(byTestId("card").getAttribute("tabindex")).toBe("0");
    });
});

describe("the directives' lifecycle", () => {
    it("updates options without re-registering, and emits to the latest listener", async () => {
        const calls: string[] = [];
        @Component({
            imports: [DndDraggable],
            template: `<div
                dndDraggable="card"
                data-testid="card"
                [disabled]="disabled()"
                [activation]="{ distance: 3 }"
                (dragStart)="calls.push(label())"
            ></div>`,
        })
        class Options {
            readonly label = signal("first");
            readonly disabled = signal(false);
            readonly calls = calls;
        }
        const adapter = getDragSpace(document).adapter;
        const register = vi.spyOn(adapter, "register");
        const fixture = await render(Options);
        fixture.componentInstance.label.set("second");
        await settle();
        placeAll(BOXES);
        const press = await dragCard(60, 25, false);
        press.release(60, 25);
        await settle();
        expect(calls).toEqual(["second"]);
        fixture.componentInstance.disabled.set(true);
        await settle();
        const card = byTestId("card");
        expect(card.dataset.dndDisabled).toBe("");
        expect(card.getAttribute("aria-disabled")).toBe("true");
        await dragCard(60, 25);
        expect(calls).toEqual(["second"]);
        expect(register).toHaveBeenCalledOnce();
        register.mockRestore();
    });

    it("registers once per render, unregisters when destroyed, and works when rendered again", async () => {
        const space = getDragSpace(document);
        const first = await render(Page);
        expect(space.get("draggable-ids")).toEqual(["card"]);
        expect(space.get("droppable-ids")).toEqual(["left", "right"]);
        first.destroy();
        expect(space.get("draggable-ids")).toEqual([]);
        expect(space.get("droppable-ids")).toEqual([]);
        const second = await render(Page);
        expect(space.get("draggable-ids")).toEqual(["card"]);
        placeAll(BOXES);
        await dragCard(150, 50);
        expect(second.componentInstance.drops).toEqual(["left"]);
    });

    it("refreshes only the views whose part's state changed, and runs no change detection while moving inside one droppable", async () => {
        await render(Page);
        placeAll(BOXES);
        renders.length = 0;
        const press = pointer(byTestId("card"), 25, 25);
        press.move(30, 25);
        await settle();
        // the start: the source, and the droppables now active
        expect(renders.sort()).toEqual(["card", "left", "right"]);
        renders.length = 0;
        press.move(150, 50);
        await settle();
        // entering `left`
        expect(renders).toEqual(["left"]);
        renders.length = 0;
        ticks = 0;
        for (let x = 110; x < 200; x += 10) {
            press.move(x, 50);
            flush();
            await settle();
        }
        expect(renders).toEqual([]);
        expect(ticks).toBe(0);
        press.release(190, 50);
        await settle();
        expect(renders.sort()).toEqual(["card", "left", "right"]);
        // the counter counts: the release is one change detection
        expect(ticks).toBeGreaterThan(0);
    });
});

describe("the space from Angular", () => {
    it("vetoes a drop through middleware added with injectDragSpace().use", async () => {
        @Component({ selector: "test-rule", template: "" })
        class Rule {
            constructor() {
                const space = injectDragSpace();
                effect((onCleanup) => {
                    const current = space();
                    if (!current) return;
                    onCleanup(
                        current.use((ctx, next) =>
                            ctx.payload.droppableId === "left"
                                ? { ok: false, error: { code: "vetoed" } }
                                : next(),
                        ),
                    );
                });
            }
        }
        @Component({
            imports: [Rule, Page],
            template: `<test-rule /><test-page />`,
        })
        class Ruled {
            readonly page = viewChild.required(Page);
        }
        const fixture = await render(Ruled);
        placeAll(BOXES);
        const press = await dragCard(150, 50, false);
        expect(byTestId("left").dataset.dndRefused).toBe("");
        press.release(150, 50);
        await settle();
        const page = fixture.componentInstance.page();
        expect(page.drops).toEqual([]);
        await dragCard(350, 50);
        expect(page.drops).toEqual(["right"]);
    });

    it("tells a monitor of every drag, from its first render until it is destroyed", async () => {
        const seen: string[] = [];
        @Component({ selector: "test-monitor", template: "" })
        class Monitor {
            constructor() {
                injectDragMonitor((event) => {
                    if (event.type !== "drag-move") seen.push(event.type);
                });
            }
        }
        @Component({
            imports: [Monitor, Page],
            template: `@if (shown()) {
                    <test-monitor />
                }
                <test-page />`,
        })
        class Monitored {
            readonly shown = signal(true);
        }
        const fixture = await render(Monitored);
        placeAll(BOXES);
        await dragCard(150, 50);
        expect(seen).toEqual(["drag-start", "drag-over", "drop"]);
        fixture.componentInstance.shown.set(false);
        await settle();
        await dragCard(150, 50);
        expect(seen).toHaveLength(3);
    });

    it("gives the explicit space at once, and the document's after the first render", async () => {
        const space: DragSpace = createDragSpace({ document });
        const found: (DragSpace | undefined)[] = [];
        @Component({ template: "" })
        class Reader {
            readonly given = injectDragSpace({ space });
            readonly page = injectDragSpace();
            constructor() {
                found.push(this.given(), this.page());
            }
        }
        const fixture = await render(Reader);
        expect(found).toEqual([space, undefined]);
        expect(fixture.componentInstance.page()).toBe(getDragSpace(document));
    });
});
