import { ChangeDetectionStrategy, Component, signal } from "@angular/core";
import { describe, expect, it } from "vitest";
import { DndDraggable } from "../draggable/public-api";
import { DndDroppable } from "../droppable/public-api";
import { DndDragOverlay } from "../src/public-api";
import { byTestId, placeAll, pointer, render, settle } from "./helpers";

// The drag overlay (D7, D9): rendered only during a drag, portalled into the document's body at
// the dragged box, moved without change detection; the source opts out of `translate`.

const BOXES = {
    card: { x: 10, y: 20, width: 50, height: 40 },
    zone: { x: 200, y: 0, width: 100, height: 100 },
};

const overlay = () =>
    document.querySelector<HTMLElement>('[data-dnd-part="overlay"]');

/** The template's evaluations: the overlay's view is checked on a show only. */
const checks: string[] = [];
const checked = (text: string) => {
    checks.push(text);
    return text;
};

@Component({
    imports: [DndDraggable, DndDroppable, DndDragOverlay],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div style="overflow: hidden">
            <div dndDraggable="card" [translate]="false" data-testid="card"></div>
        </div>
        <div dndDroppable="zone" data-testid="zone"></div>
        <ng-template dndDragOverlay overlayClass="ghost" let-operation>
            <span data-testid="ghost">{{ checked(operation.source.id + " over " + (operation.target?.id ?? "nothing")) }}</span>
        </ng-template>
    `,
})
class Page {
    protected readonly checked = checked;
}

describe("dndDragOverlay", () => {
    it("shows the app's template in a fixed box under the pointer during a drag only", async () => {
        await render(Page);
        placeAll(BOXES);
        expect(overlay()).toBeNull();
        const card = byTestId("card");
        const press = pointer(card, 20, 30);
        press.move(30, 30);
        await settle();
        expect(overlay()?.parentElement).toBe(document.body);
        expect(overlay()?.className).toBe("ghost");
        expect(overlay()?.getAttribute("style")).toBe(
            "position: fixed; left: 20px; top: 20px; width: 50px; height: 40px; box-sizing: border-box; pointer-events: none;",
        );
        expect(byTestId("ghost").textContent).toBe("card over nothing");
        // the source stays where it is
        expect(card.style.translate).toBe("");

        checks.length = 0;
        press.move(60, 50);
        await settle();
        expect(overlay()?.style.left).toBe("50px");
        expect(overlay()?.style.top).toBe("40px");
        expect(checks).toEqual([]);

        press.move(250, 50);
        await settle();
        expect(byTestId("ghost").textContent).toBe("card over zone");
        expect(checks).toEqual(["card over zone"]);

        press.release(250, 50);
        await settle();
        expect(overlay()).toBeNull();
        expect(document.querySelector('[data-testid="ghost"]')).toBeNull();
    });

    it("shows a drag already running when it is rendered", async () => {
        @Component({
            imports: [DndDraggable, DndDragOverlay],
            template: `
                <div dndDraggable="card" data-testid="card"></div>
                @if (shown()) {
                    <ng-template dndDragOverlay>Ghost</ng-template>
                }
            `,
        })
        class Later {
            readonly shown = signal(false);
        }
        const fixture = await render(Later);
        placeAll(BOXES);
        const press = pointer(byTestId("card"), 20, 30);
        press.move(40, 30);
        await settle();
        fixture.componentInstance.shown.set(true);
        await settle();
        expect(overlay()?.textContent).toBe("Ghost");
        press.release(40, 30);
        await settle();
        expect(overlay()).toBeNull();
    });

    it("follows only the drags of its scope, and goes with its view", async () => {
        @Component({
            imports: [DndDraggable, DndDragOverlay],
            template: `
                <div dndDraggable="card" scope="board" data-testid="card"></div>
                @if (shown()) {
                    <ng-template dndDragOverlay [scope]="scope()">Ghost</ng-template>
                }
            `,
        })
        class Scoped {
            readonly shown = signal(true);
            readonly scope = signal("other");
        }
        const fixture = await render(Scoped);
        placeAll(BOXES);
        let press = pointer(byTestId("card"), 20, 30);
        press.move(40, 30);
        await settle();
        expect(overlay()).toBeNull();
        press.release(40, 30);
        await settle();
        fixture.componentInstance.scope.set("board");
        await settle();
        press = pointer(byTestId("card"), 20, 30);
        press.move(40, 30);
        await settle();
        expect(overlay()?.textContent).toBe("Ghost");
        fixture.componentInstance.shown.set(false);
        await settle();
        expect(overlay()).toBeNull();
        press.release(40, 30);
    });
});
