import { Component, input } from "@angular/core";
import { DndDroppable } from "@fragiola/dnd-angular/droppable";
import {
    DOCKABLE,
    injectDockable,
    type TabsetNode,
} from "@fragiola/dockable-angular";
import type { NoteTypes } from "../_kit/dockable";
import { newTab } from "./new-tab";
import * as styles from "./styles";

/**
 * One tabset of the layout, made a drop target: `[dndDroppable]` sits on the `[dockableTabSet]`
 * element itself (each directive adds its behaviour to the one element, so Dockable's `data-*`
 * and dnd's sit side by side), and its `(drop)` runs Dockable's `tab.add`.
 */
@Component({
    selector: "example-dockable-new-tab-tabset",
    imports: [DOCKABLE, DndDroppable],
    host: { class: "contents" },
    template: `
        <div
            [dockableTabSet]="node()"
            [dndDroppable]="node().id"
            [accepts]="['card']"
            (drop)="add($event.operation.source.data)"
            [class]="styles.tabset"
        >
            <div [class]="styles.strip">
                <div dockableTabList [attr.aria-label]="'Tabs of ' + node().id" [class]="styles.tabList">
                    <ng-template dockableTabListItem let-tab>
                        <div [dockableTab]="tab" [class]="styles.tab">{{ tab.label }}</div>
                    </ng-template>
                </div>
                <span aria-hidden="true" [class]="styles.full">Full</span>
            </div>
            <div dockableTabSetContent></div>
        </div>
    `,
})
export class NewTabTabSet {
    readonly node = input.required<TabsetNode<NoteTypes>>();
    protected readonly styles = styles;
    private readonly dockable = injectDockable<NoteTypes>();

    /** A card dropped here opens as a tab, through Dockable's own command. */
    protected add(card: unknown) {
        this.dockable
            .model()
            .run("tab.add", newTab(String(card), this.node().id));
    }
}
