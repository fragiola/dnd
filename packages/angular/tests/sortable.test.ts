import {
    ChangeDetectionStrategy,
    Component,
    input,
    output,
    signal,
} from "@angular/core";
import { getDragSpace } from "@fragiola/dnd";
import { describe, expect, it } from "vitest";
import {
    arrayMove,
    DndDragHandle,
    DndSortable,
    DndSortableGroup,
    moveBetween,
    type SortEndEvent,
} from "../sortable/public-api";
import { byTestId, placeAll, pointer, render, settle } from "./helpers";

// The sortable directives: no element of their own, no directive around a list, a handle found
// through the DOM, a second render, and no change detection during a sort's preview: the app
// commits once, on `(sortEnd)`, with the helpers.

/** The views refreshed, by item id: the render counter of D8. */
const renders: string[] = [];
const seen = (id: string, _state: unknown) => {
    renders.push(id);
    return "";
};

/** An item in a component of its own, whose view reads its state. */
@Component({
    selector: "test-item",
    imports: [DndSortable, DndDragHandle],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `<li
        [dndSortable]="id()"
        [index]="index()"
        group="list"
        #item="dndSortable"
        [attr.data-testid]="id()"
        class="item"
        [class.lifted]="item.state().dragging"
        [attr.data-render]="seen(id(), item.state())"
        (sortEnd)="sorted.emit($event)"
    >
        @if (handle()) {
            <span dndDragHandle [attr.data-testid]="id() + '-grip'"></span>
        }
        {{ id() }}
    </li>`,
})
class Item {
    readonly id = input.required<string>();
    readonly index = input.required<number>();
    readonly handle = input(false);
    readonly sorted = output<SortEndEvent>();
    protected readonly seen = seen;
}

/** A list the app owns: it applies `(sortEnd)` with `arrayMove`. */
@Component({
    imports: [Item],
    template: `<ul>
        @for (id of items(); track id) {
            <test-item [id]="id" [index]="$index" [handle]="handle()" (sorted)="sorted($event)" />
        }
    </ul>`,
})
class List {
    readonly handle = input(false);
    readonly items = signal(["a", "b", "c", "d"]);
    readonly ends: SortEndEvent[] = [];
    sorted(event: SortEndEvent) {
        this.ends.push(event);
        this.items.set(
            arrayMove(this.items(), event.from.index, event.to.index),
        );
    }
}

/** Each item's box by its id, in the order rendered now: a column of 100×50, 10 px apart. */
function placeColumn() {
    const rendered = [...document.querySelectorAll("li")].map(
        (li) => li.dataset.testid ?? "",
    );
    placeAll(
        Object.fromEntries(
            rendered.map((id, index) => [
                id,
                { x: 0, y: index * 60, width: 100, height: 50 },
            ]),
        ),
    );
}

const order = () =>
    [...document.querySelectorAll("li")].map((li) => li.dataset.testid);

/** Drags the item `id` from its centre by `dy`, waiting for Angular after each step. */
async function sortBy(id: string, dy: number, release = true, from = id) {
    const element = byTestId(from);
    const box = element.getBoundingClientRect();
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    const press = pointer(element, x, y);
    press.move(x, y + 4);
    await settle();
    press.move(x, y + dy);
    await settle();
    if (release) {
        press.release(x, y + dy);
        await settle();
    }
    return press;
}

describe("dndSortable and dndSortableGroup add no element", () => {
    it("mark their hosts with their part and id, keeping the host's own", async () => {
        @Component({
            imports: [DndSortable, DndSortableGroup],
            template: `<ul dndSortableGroup="list" data-testid="group" class="own"><li dndSortable="a" [index]="0" group="list" data-extra="t" data-testid="a"></li></ul>`,
        })
        class Page {}
        const fixture = await render(Page);
        const group = byTestId("group");
        expect((fixture.nativeElement as HTMLElement).firstElementChild).toBe(
            group,
        );
        expect(group.dataset.dndPart).toBe("sortable-group");
        expect(group.dataset.dndId).toBe("list");
        expect(group.className).toBe("own");
        const item = byTestId("a");
        expect(group.firstElementChild).toBe(item);
        expect(item.dataset.dndPart).toBe("sortable");
        expect(item.dataset.dndId).toBe("a");
        expect(item.getAttribute("data-extra")).toBe("t");
        expect(item.tabIndex).toBe(0);
    });
});

describe("a sort from Angular", () => {
    it("previews with the core's shifts, then the app commits the new order once", async () => {
        const fixture = await render(List);
        placeColumn();
        const press = await sortBy("a", 130, false);
        const a = byTestId("a");
        expect(a.dataset.dndDragging).toBe("");
        expect(a.className).toBe("item lifted");
        // every item takes part in the sort
        expect(
            ["a", "b", "c", "d"].map((id) => byTestId(id).dataset.dndSorting),
        ).toEqual(["", "", "", ""]);
        expect(byTestId("b").style.translate).toBe("0px -60px");
        expect(byTestId("c").style.translate).toBe("0px -60px");
        // the app's DOM order is untouched during the preview
        expect(order()).toEqual(["a", "b", "c", "d"]);
        press.release(50, 159);
        await settle();
        expect(fixture.componentInstance.ends).toHaveLength(1);
        expect(fixture.componentInstance.ends[0]).toMatchObject({
            from: { group: "list", index: 0 },
            to: { group: "list", index: 2 },
        });
        expect(order()).toEqual(["b", "c", "a", "d"]);
        for (const id of ["a", "b", "c", "d"]) {
            const item = byTestId(id);
            expect(item.style.translate, id).toBe("");
            expect(item.dataset.dndSorting, id).toBeUndefined();
        }
    });

    it("renders the app's new order before the next task, as the core clears the shifts (no jump)", async () => {
        await render(List);
        placeColumn();
        const press = await sortBy("a", 130, false);
        press.release(50, 159);
        // a microtask later: no timeout nor frame ran, so no paint came between
        await Promise.resolve();
        expect(order()).toEqual(["b", "c", "a", "d"]);
        for (const id of ["a", "b", "c", "d"])
            expect(byTestId(id).style.translate, id).toBe("");
    });

    it("refreshes nothing while the preview changes, once at the start and once at the end", async () => {
        await render(List);
        placeColumn();
        renders.length = 0;
        const press = await sortBy("a", 10, false);
        // the start: every item becomes `sorting`
        expect([...new Set(renders)].sort()).toEqual(["a", "b", "c", "d"]);
        renders.length = 0;
        for (let dy = 10; dy <= 190; dy += 15) {
            press.move(50, 25 + dy);
            await settle();
        }
        expect(byTestId("d").style.translate).toBe("0px -60px");
        expect(renders).toEqual([]);
        press.release(50, 215);
        await settle();
        expect(order()).toEqual(["b", "c", "d", "a"]);
        // the end: back to rest, in the new order
        expect([...new Set(renders)].sort()).toEqual(["a", "b", "c", "d"]);
    });

    it("writes only the allow-listed inline style: translate during a sort, nothing after", async () => {
        await render(List);
        placeColumn();
        const press = await sortBy("a", 70, false);
        for (const id of ["a", "b"])
            expect([...byTestId(id).style], id).toEqual(["translate"]);
        press.release(50, 95);
        await settle();
        for (const id of ["a", "b", "c", "d"])
            expect([...byTestId(id).style], id).toEqual([]);
    });

    it("drags from a dndDragHandle only, found through the DOM", async () => {
        const fixture = await render(List, { handle: true });
        placeColumn();
        placeAll({ "a-grip": { x: 0, y: 0, width: 10, height: 10 } });
        await sortBy("a", 130);
        expect(fixture.componentInstance.ends).toEqual([]);
        expect(byTestId("a-grip").dataset.dndHandle).toBe("");
        await sortBy("a", 130, true, "a-grip");
        expect(fixture.componentInstance.ends).toHaveLength(1);
        expect(order()).toEqual(["b", "c", "a", "d"]);
    });

    it("registers once, and unregisters when destroyed", async () => {
        const space = getDragSpace(document);
        const fixture = await render(List);
        expect(space.get("draggable-ids")).toEqual(["a", "b", "c", "d"]);
        placeColumn();
        await sortBy("d", -190);
        expect(order()).toEqual(["d", "a", "b", "c"]);
        fixture.destroy();
        expect(space.get("draggable-ids")).toEqual([]);
        expect(space.get("droppable-ids")).toEqual([]);
    });
});

/** A kanban the app owns: `todo` and an empty `done` with its container, applied with moveBetween. */
@Component({
    imports: [DndSortable, DndSortableGroup],
    template: `
        @for (group of groups; track group) {
            <ul [dndSortableGroup]="group" [accepts]="both" [attr.data-testid]="group">
                @for (id of lists()[group]; track id) {
                    <li [dndSortable]="id" [index]="$index" [group]="group" [accepts]="both" [attr.data-testid]="id" (sortEnd)="moved($event)"></li>
                }
            </ul>
        }
    `,
})
class Board {
    readonly groups = ["todo", "done"];
    readonly both = ["todo", "done"];
    readonly lists = signal<Record<string, readonly string[]>>({
        todo: ["a", "b"],
        done: [],
    });
    moved(event: SortEndEvent) {
        this.lists.set(moveBetween(this.lists(), event));
    }
}

describe("groups from Angular", () => {
    it("moves an item into an empty group through dndSortableGroup, with moveBetween", async () => {
        await render(Board);
        placeAll({
            todo: { x: 0, y: 0, width: 100, height: 300 },
            done: { x: 200, y: 0, width: 100, height: 300 },
            a: { x: 0, y: 0, width: 100, height: 50 },
            b: { x: 0, y: 60, width: 100, height: 50 },
        });
        const press = pointer(byTestId("a"), 50, 25);
        press.move(50, 29);
        await settle();
        press.move(250, 100);
        await settle();
        expect(byTestId("done").dataset.dndSorting).toBe("");
        expect(byTestId("b").style.translate).toBe("0px -60px");
        press.release(250, 100);
        await settle();
        expect(byTestId("done").contains(byTestId("a"))).toBe(true);
        expect(byTestId("b").style.translate).toBe("");
    });
});
