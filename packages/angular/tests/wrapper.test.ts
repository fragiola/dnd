import { Component, signal, viewChild } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DndDraggable, DndDragHandle } from "../draggable/public-api";
import { DndDroppable } from "../droppable/public-api";
import { byTestId, pointer, render, settle } from "./helpers";

// The wrapper contract (D6, D7) in Angular: a directive adds no element and acts on its host;
// directives stack on one host; the host's own attributes, classes, styles and listeners stay;
// anything but an element throws in development.

/** Angular's development switch, which an app's production build sets to `false`. */
const switches = globalThis as unknown as { ngDevMode: unknown };

afterEach(() => {
    vi.restoreAllMocks();
});

/** The shape of every Fragiola primitive (`dockableTab`): its own attributes and listener on its host. */
@Component({
    selector: "test-tab",
    host: {
        type: "button",
        role: "tab",
        "data-layout-path": "/ts0/t0",
        "data-selected": "",
        "(click)": "own()",
    },
    template: "<ng-content />",
})
class Tab {
    readonly clicks = signal(0);
    own() {
        this.clicks.update((value) => value + 1);
    }
}

describe("the directives add no element", () => {
    it("keeps the host as the only element for a draggable, a droppable and a handle", async () => {
        @Component({
            imports: [DndDraggable, DndDragHandle, DndDroppable],
            template: `<ul><li dndDraggable="a" class="card"><span dndDragHandle>grip</span>A</li><section dndDroppable="z" aria-label="Zone"></section></ul>`,
        })
        class Page {}
        const fixture = await render(Page);
        expect((fixture.nativeElement as HTMLElement).innerHTML).toBe(
            '<ul><li dnddraggable="a" class="card" data-dnd-part="draggable" data-dnd-id="a"><span dnddraghandle="" data-dnd-part="handle" data-dnd-handle="" tabindex="0" style="touch-action: none;">grip</span>A</li><section dnddroppable="z" aria-label="Zone" data-dnd-part="droppable" data-dnd-id="z"></section></ul>',
        );
    });

    it("gives a non-focusable draggable a tab stop, and leaves a button's alone", async () => {
        @Component({
            imports: [DndDraggable],
            template: `<div dndDraggable="a" data-testid="a"></div><button type="button" dndDraggable="b" data-testid="b"></button>`,
        })
        class Page {}
        await render(Page);
        expect(byTestId("a").getAttribute("tabindex")).toBe("0");
        expect(byTestId("b").hasAttribute("tabindex")).toBe(false);
    });

    it("exposes the part's state as a signal through exportAs", async () => {
        @Component({
            imports: [DndDraggable, DndDroppable],
            template: `<div dndDraggable="a" #card="dndDraggable" data-testid="a" [class.lifted]="card.state().dragging">{{ card.state().disabled }}</div>
                <div dndDroppable="z" #zone="dndDroppable" [disabled]="true" data-testid="z">{{ zone.state().disabled }}</div>`,
        })
        class Page {}
        await render(Page);
        expect(byTestId("a").textContent).toBe("false");
        expect(byTestId("z").textContent).toBe("true");
        expect(byTestId("z").dataset.dndDisabled).toBe("");
    });
});

describe("the host keeps its own", () => {
    it("keeps the host's class, style and listeners; the app's listeners run before the core's", async () => {
        const calls: string[] = [];
        @Component({
            imports: [DndDraggable],
            template: `<div
                dndDraggable="a"
                data-testid="a"
                class="child"
                [class.on]="card.state().dragging"
                style="color: blue; margin: 2px"
                #card="dndDraggable"
                (click)="calls.push('click')"
                (pointerdown)="calls.push($event.defaultPrevented ? 'after the claim' : 'before')"
            ></div>`,
        })
        class Page {
            readonly calls = calls;
        }
        await render(Page);
        const element = byTestId("a");
        expect(element.className).toBe("child");
        expect(element.getAttribute("style")).toBe("color: blue; margin: 2px;");
        // Angular's template listeners are on the element since its creation, before the core's
        // (added once it is rendered): a listener of the app sees the press before dnd claims it
        pointer(element, 1, 1).release(1, 1);
        element.click();
        expect(calls).toEqual(["before", "click"]);
    });

    it("never wipes the core's translate when the host's own style changes", async () => {
        @Component({
            imports: [DndDraggable],
            template: `<div dndDraggable="a" data-testid="a" [style.opacity]="opacity()"></div>`,
        })
        class Page {
            readonly opacity = signal(1);
        }
        const fixture = await render(Page);
        const element = byTestId("a");
        element.style.translate = "10px 20px";
        fixture.componentInstance.opacity.set(0.5);
        await settle();
        expect(element.style.opacity).toBe("0.5");
        expect(element.style.translate).toBe("10px 20px");
    });

    it("lets the host's own aria-describedby stand when the app gives none", async () => {
        @Component({
            imports: [DndDraggable],
            template: `<div dndDraggable="a" data-testid="a" aria-describedby="own"></div>
                <div dndDraggable="b" data-testid="b" describedBy="help"></div>`,
        })
        class Page {}
        await render(Page);
        expect(byTestId("a").getAttribute("aria-describedby")).toBe("own");
        expect(byTestId("b").getAttribute("aria-describedby")).toBe("help");
    });

    it("follows input changes without re-registering, on the same element", async () => {
        @Component({
            imports: [DndDraggable],
            template: `<div [dndDraggable]="id()" data-testid="x" [disabled]="disabled()"></div>`,
        })
        class Page {
            readonly id = signal("x");
            readonly disabled = signal(false);
        }
        const fixture = await render(Page);
        const element = byTestId("x");
        fixture.componentInstance.disabled.set(true);
        await settle();
        expect(byTestId("x")).toBe(element);
        expect(element.dataset.dndDisabled).toBe("");
        expect(element.getAttribute("aria-disabled")).toBe("true");
        fixture.componentInstance.id.set("y");
        fixture.componentInstance.disabled.set(false);
        await settle();
        expect(element.dataset.dndId).toBe("y");
        expect(element.hasAttribute("data-dnd-disabled")).toBe(false);
        expect(element.hasAttribute("aria-disabled")).toBe(false);
    });
});

describe("stacked directives", () => {
    it("list their parts on one element, the drag source's id winning", async () => {
        @Component({
            imports: [DndDraggable, DndDroppable],
            template: `<div dndDroppable="z" dndDraggable="a" data-testid="both" class="card"></div>`,
        })
        class Page {}
        await render(Page);
        const element = byTestId("both");
        expect(element.className).toBe("card");
        expect(element.dataset.dndPart).toBe("draggable droppable");
        expect(element.dataset.dndId).toBe("a");
    });

    it("keep both sets of attributes and listeners on a primitive's host", async () => {
        const consumer = vi.fn();
        @Component({
            imports: [DndDraggable, DndDroppable, Tab],
            template: `<test-tab dndDraggable="a" dndDroppable="z" (click)="consumer()">Tab</test-tab>`,
        })
        class Page {
            readonly consumer = consumer;
            readonly tab = viewChild.required(Tab);
        }
        const fixture = await render(Page);
        const tab = document.querySelector<HTMLElement>('[role="tab"]');
        expect(tab?.dataset).toMatchObject({
            layoutPath: "/ts0/t0",
            selected: "",
            dndPart: "draggable droppable",
            dndId: "a",
        });
        tab?.click();
        expect(fixture.componentInstance.tab().clicks()).toBe(1);
        expect(consumer).toHaveBeenCalledTimes(1);
    });

    it("share an input of the same name: one `disabled` disables both parts", async () => {
        @Component({
            imports: [DndDraggable, DndDroppable],
            template: `<div dndDraggable="a" dndDroppable="z" disabled data-testid="both"></div>`,
        })
        class Page {
            readonly draggable = viewChild.required(DndDraggable);
            readonly droppable = viewChild.required(DndDroppable);
        }
        const fixture = await render(Page);
        const element = byTestId("both");
        expect(element.dataset.dndDisabled).toBe("");
        expect(element.getAttribute("aria-disabled")).toBe("true");
        expect(fixture.componentInstance.draggable().state().disabled).toBe(
            true,
        );
        expect(fixture.componentInstance.droppable().state().disabled).toBe(
            true,
        );
    });
});

describe("development errors", () => {
    it("throws for a directive on an <ng-container>", async () => {
        @Component({
            imports: [DndDraggable],
            template: `<ng-container dndDraggable="a" />`,
        })
        class Page {}
        await expect(render(Page)).rejects.toThrow(
            /goes on an element .* not on an <ng-container>/,
        );
    });

    it("reports a handle outside a draggable", async () => {
        const error = vi.spyOn(console, "error").mockImplementation(() => {});
        @Component({
            imports: [DndDragHandle],
            template: `<span dndDragHandle></span>`,
        })
        class Page {}
        await render(Page);
        expect(error).toHaveBeenCalledWith(
            expect.stringContaining("not inside a draggable"),
        );
    });

    it("never reports in production", async () => {
        const error = vi.spyOn(console, "error");
        const previous = switches.ngDevMode;
        switches.ngDevMode = false;
        try {
            @Component({
                imports: [DndDragHandle],
                template: `<span dndDragHandle data-testid="h"></span>`,
            })
            class Page {}
            await render(Page);
            expect(byTestId("h").dataset.dndPart).toBe("handle");
            expect(error).not.toHaveBeenCalled();
        } finally {
            switches.ngDevMode = previous;
            TestBed.resetTestingModule();
        }
    });
});
