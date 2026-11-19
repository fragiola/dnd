// @vitest-environment node
import { Component, provideZonelessChangeDetection } from "@angular/core";
import {
    type BootstrapContext,
    bootstrapApplication,
} from "@angular/platform-browser";
import { renderApplication } from "@angular/platform-server";
import { createDragSpace } from "@fragiola/dnd";
import { describe, expect, it, vi } from "vitest";
import { DndDraggable, DndDragHandle } from "../draggable/public-api";
import { DndDroppable } from "../droppable/public-api";
import { DndSortable, DndSortableGroup } from "../sortable/public-api";
import {
    DndDragOverlay,
    injectDragMonitor,
    injectDragSpace,
} from "../src/public-api";
import { DndSwappable } from "../swappable/public-api";

// Server rendering: no space is created on the server (D4), nothing subscribes, the directives
// write their attributes into the server's HTML, and the overlay renders nothing.

/** The HTML the server renders for `component`, from `<body>` in. */
async function html(component: new () => unknown): Promise<string> {
    const page = await renderApplication(
        (context: BootstrapContext) =>
            bootstrapApplication(
                component,
                { providers: [provideZonelessChangeDetection()] },
                context,
            ),
        { document: "<html><body><app-root></app-root></body></html>" },
    );
    const body = /<app-root[^>]*>([\s\S]*)<\/app-root>/.exec(page)?.[1] ?? "";
    // Angular's own markers (hydration comments, its generated attributes) are not ours
    return body
        .replace(/<!--[\s\S]*?-->/g, "")
        .replace(/ ng-[\w-]+="[^"]*"/g, "");
}

describe("server rendering", () => {
    it("renders the hosts with their attributes and no overlay, without a drag space", async () => {
        const error = vi.spyOn(console, "error");
        const space = createDragSpace({ document: {} as Document });
        const subscribe = vi.spyOn(space, "subscribe");
        @Component({
            selector: "app-root",
            imports: [
                DndDraggable,
                DndDragHandle,
                DndDroppable,
                DndDragOverlay,
            ],
            template: `<main><li dndDraggable="a" class="card"><span dndDragHandle>grip</span></li><section dndDroppable="z" disabled></section><ng-template dndDragOverlay [space]="space">ghost</ng-template></main>`,
        })
        class Page {
            readonly space = space;
            constructor() {
                injectDragMonitor(() => {}, { space });
                injectDragSpace();
            }
        }
        expect(await html(Page)).toBe(
            '<main><li dnddraggable="a" class="card" data-dnd-part="draggable" data-dnd-id="a"><span dnddraghandle="" data-dnd-part="handle" data-dnd-handle="">grip</span></li><section dnddroppable="z" disabled="" data-dnd-part="droppable" data-dnd-id="z" data-dnd-disabled="" aria-disabled="true"></section></main>',
        );
        expect(subscribe).not.toHaveBeenCalled();
        expect(error).not.toHaveBeenCalled();
    });

    it("renders sortable and swappable items, their group and a handle", async () => {
        const error = vi.spyOn(console, "error");
        @Component({
            selector: "app-root",
            imports: [
                DndSortable,
                DndSortableGroup,
                DndSwappable,
                DndDragHandle,
            ],
            template: `<ul dndSortableGroup="list"><li dndSortable="a" [index]="0" group="list"><span dndDragHandle></span></li></ul><div dndSwappable="s" [index]="0" group="row" disabled></div>`,
        })
        class Page {}
        expect(await html(Page)).toBe(
            '<ul dndsortablegroup="list" data-dnd-part="sortable-group" data-dnd-id="list"><li dndsortable="a" group="list" data-dnd-part="sortable" data-dnd-id="a"><span dnddraghandle="" data-dnd-part="handle" data-dnd-handle=""></span></li></ul><div dndswappable="s" group="row" disabled="" data-dnd-part="swappable" data-dnd-id="s" data-dnd-disabled="" aria-disabled="true"></div>',
        );
        expect(error).not.toHaveBeenCalled();
    });
});
