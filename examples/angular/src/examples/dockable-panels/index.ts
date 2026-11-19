import { Component, signal } from "@angular/core";
import { DndDragOverlay, type DropEvent } from "@fragiola/dnd-angular";
import { DndDraggable } from "@fragiola/dnd-angular/draggable";
import { DndDroppable } from "@fragiola/dnd-angular/droppable";
import { createModel, DOCKABLE } from "@fragiola/dockable-angular";
import { type NoteTypes, panelsLayout } from "../_kit/dockable";
import { taskOf } from "../_kit/tasks";
import { MoveInbox } from "./move-inbox";
import * as styles from "./styles";

// Draggables inside Dockable panels. Dockable moves a panel's content when its tab moves to
// another tabset (or into a popout) without remounting it; dnd measures when a drag starts and
// registers each element in its own document's drag space, so the cards keep dragging wherever
// the panel went. Move the Inbox tab with the button (Dockable's `tab.move` command) or by
// dragging the tab itself (Dockable's own drag), then drag a card to the Archive again. A panel
// clips its content, so the cards stay put (`[translate]="false"`) and a `dndDragOverlay` carries
// a copy across the panels.

@Component({
    selector: "example-dockable-panels",
    imports: [DOCKABLE, DndDraggable, DndDroppable, DndDragOverlay, MoveInbox],
    host: { class: "contents" },
    template: `
        <div [class]="styles.frame">
            <example-dockable-panels-move-inbox [model]="model" />
            <div [dockableRoot]="model" [class]="styles.root">
                <!-- The developer owns Dockable's recursion: a row, or a tabset with its tabs. -->
                <div dockableRow>
                    <ng-template [dockableRowChild]="model" let-node>
                        @if (node.type === "row") {
                            <div [dockableRow]="node"></div>
                        } @else {
                            <div [dockableTabSet]="node" [class]="styles.tabset">
                                <div
                                    dockableTabList
                                    [attr.aria-label]="'Tabs of ' + node.id"
                                    [class]="styles.tabList"
                                >
                                    <ng-template [dockableTabListItem]="model" let-tab>
                                        <div [dockableTab]="tab" [class]="styles.tab">{{ tab.label }}</div>
                                    </ng-template>
                                </div>
                                <div dockableTabSetContent></div>
                            </div>
                        }
                    </ng-template>
                </div>
                <ng-template [dockablePanels]="model" let-tab>
                    <div [dockablePanel]="tab" [class]="styles.panel">
                        @if (tab.id === "inbox") {
                            <ul aria-label="Inbox cards" [class]="styles.cards">
                                @for (id of inbox(); track id) {
                                    <li
                                        [dndDraggable]="id"
                                        [translate]="false"
                                        [attr.aria-label]="taskOf(id).title"
                                        [class]="styles.card"
                                    >
                                        {{ taskOf(id).title }}
                                    </li>
                                }
                            </ul>
                        } @else if (tab.id === "archive") {
                            <ul
                                dndDroppable="archive"
                                (drop)="toArchive($event)"
                                aria-label="Archived cards"
                                [class]="styles.archive"
                            >
                                @for (id of archive(); track id) {
                                    <li [class]="styles.archived">{{ taskOf(id).title }}</li>
                                } @empty {
                                    <li [class]="styles.hint">Drop cards here</li>
                                }
                            </ul>
                        } @else {
                            <p [class]="styles.note">{{ tab.data.text }}</p>
                        }
                    </div>
                </ng-template>
                <div
                    dockableDropIndicator
                    #indicator="dockableDropIndicator"
                    [class]="styles.dropIndicator(indicator.state())"
                ></div>
            </div>
            <ng-template dndDragOverlay let-operation>
                <div [class]="styles.lifted">{{ taskOf(operation.source.id).title }}</div>
            </ng-template>
        </div>
    `,
})
export default class DockablePanels {
    protected readonly styles = styles;
    protected readonly taskOf = taskOf;
    // the model is the source of truth: create it once
    protected readonly model = createModel<NoteTypes>(panelsLayout());
    protected readonly inbox = signal(["login", "export", "guide", "typo"]);
    protected readonly archive = signal<string[]>([]);

    protected toArchive(event: DropEvent) {
        const id = String(event.operation.source.id);
        this.inbox.update((now) => now.filter((each) => each !== id));
        this.archive.update((now) => [...now, id]);
    }
}
