import {
    ChangeDetectionStrategy,
    Component,
    input,
    output,
    signal,
} from "@angular/core";
import { describe, expect, it } from "vitest";
import {
    DndSwappable,
    type SwapEvent,
    swapItems,
} from "../swappable/public-api";
import { byTestId, placeAll, pointer, render, settle } from "./helpers";

// The swappable directive: no element of its own, a preview the core writes (only the target
// moves, marked `data-dnd-swap-target`) with no change detection, and the app's commit with
// `swapItems`.

const renders: string[] = [];
const seen = (id: string, _state: unknown) => {
    renders.push(id);
    return "";
};

@Component({
    selector: "test-tile",
    imports: [DndSwappable],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `<div
        [dndSwappable]="id()"
        [index]="index()"
        group="row"
        #tile="dndSwappable"
        [attr.data-testid]="id()"
        [attr.data-render]="seen(id(), tile.state())"
        (swap)="swapped.emit($event)"
    ></div>`,
})
class Tile {
    readonly id = input.required<string>();
    readonly index = input.required<number>();
    readonly swapped = output<SwapEvent>();
    protected readonly seen = seen;
}

@Component({
    imports: [Tile],
    template: `<div>
        @for (id of items(); track id) {
            <test-tile [id]="id" [index]="$index" (swapped)="swapped($event)" />
        }
    </div>`,
})
class Row {
    readonly items = signal(["a", "b", "c"]);
    readonly swaps: SwapEvent[] = [];
    swapped(event: SwapEvent) {
        this.swaps.push(event);
        const { target } = event;
        if (target)
            this.items.set(
                swapItems(this.items(), event.source.index, target.index),
            );
    }
}

const place = () =>
    placeAll(
        Object.fromEntries(
            [...document.querySelectorAll<HTMLElement>("[data-testid]")]
                .filter((el) => el.dataset.dndPart === "swappable")
                .map((el, index) => [
                    el.dataset.testid ?? "",
                    { x: index * 100, y: 0, width: 80, height: 50 },
                ]),
        ),
    );

const order = () =>
    [...document.querySelectorAll<HTMLElement>("[data-dnd-part]")].map(
        (el) => el.dataset.testid,
    );

describe("dndSwappable", () => {
    it("marks its host with its part and id, keeping the host's own", async () => {
        @Component({
            imports: [DndSwappable],
            template: `<div dndSwappable="a" [index]="0" group="row" class="x" data-testid="a"></div>`,
        })
        class Page {}
        const fixture = await render(Page);
        const a = byTestId("a");
        expect((fixture.nativeElement as HTMLElement).firstElementChild).toBe(
            a,
        );
        expect(a.dataset.dndPart).toBe("swappable");
        expect(a.dataset.dndId).toBe("a");
        expect(a.className).toBe("x");
    });

    it("previews the swap with no change detection, then the app swaps once", async () => {
        const fixture = await render(Row);
        place();
        const press = pointer(byTestId("a"), 40, 25);
        press.move(44, 25);
        await settle();
        expect(byTestId("a").dataset.dndDragging).toBe("");
        renders.length = 0;
        press.move(140, 25);
        await settle();
        press.move(240, 25);
        await settle();
        expect(byTestId("c").dataset.dndSwapTarget).toBe("");
        expect(byTestId("c").style.translate).toBe("-200px");
        expect(byTestId("b").style.translate).toBe("");
        expect(byTestId("b").dataset.dndSwapTarget).toBeUndefined();
        expect(renders).toEqual([]);
        press.release(240, 25);
        await settle();
        expect(fixture.componentInstance.swaps[0]).toMatchObject({
            source: { id: "a", index: 0 },
            target: { id: "c", index: 2 },
        });
        expect(order()).toEqual(["c", "b", "a"]);
        expect(byTestId("c").style.translate).toBe("");
        expect(byTestId("c").dataset.dndSwapTarget).toBeUndefined();
    });
});
