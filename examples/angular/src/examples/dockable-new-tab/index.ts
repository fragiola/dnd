import { Component, DestroyRef, effect, inject } from "@angular/core";
import { injectDragSpace } from "@fragiola/dnd-angular";
import { DndDraggable } from "@fragiola/dnd-angular/draggable";
import { createModel, DOCKABLE } from "@fragiola/dockable-angular";
import {
    limitTabs,
    MAX_TABS,
    type NoteTypes,
    notesLayout,
} from "../_kit/dockable";
import { newTab } from "./new-tab";
import * as styles from "./styles";
import { NewTabTabSet } from "./tabset";

// Drag a card onto a Dockable tabset and it opens as a tab. The `[dndDroppable]` sits on the
// `[dockableTabSet]` element itself (both directives add their behaviour to the one element), and
// its `(drop)` runs Dockable's own command, `model.run("tab.add", …)`: the drop goes through
// Dockable's rules like any other change. One of them, written as a Dockable middleware in the
// kit, caps a tabset at three tabs. A dnd drop middleware (`space.use`) asks Dockable the same
// question with `model.can`, so a full tabset is refused while the card hovers it, not after.

const CARDS = ["Roadmap", "Budget", "Hiring", "Retro"];

@Component({
    selector: "example-dockable-new-tab",
    imports: [DOCKABLE, DndDraggable, NewTabTabSet],
    host: { class: "contents" },
    template: `
        <div [class]="styles.frame">
            <div [class]="styles.toolbar">
                <ul aria-label="Cards" [class]="styles.cards">
                    @for (card of cards; track card) {
                        <li
                            [dndDraggable]="card"
                            type="card"
                            [data]="card"
                            [attr.aria-label]="card"
                            [class]="styles.card"
                        >
                            {{ card }}
                        </li>
                    }
                </ul>
                <span [class]="styles.hint">At most {{ maxTabs }} tabs per tabset</span>
            </div>
            <div [dockableRoot]="model" [class]="styles.root">
                <!-- The developer owns Dockable's recursion: each tabset is a drop target. -->
                <div dockableRow>
                    <ng-template [dockableRowChild]="model" let-node>
                        @if (node.type === "row") {
                            <div [dockableRow]="node"></div>
                        } @else {
                            <example-dockable-new-tab-tabset [node]="node" />
                        }
                    </ng-template>
                </div>
                <ng-template [dockablePanels]="model" let-tab>
                    <div [dockablePanel]="tab" [class]="styles.panel">
                        <p>{{ tab.data.text }}</p>
                    </div>
                </ng-template>
            </div>
        </div>
    `,
})
export default class DockableNewTab {
    protected readonly styles = styles;
    protected readonly cards = CARDS;
    protected readonly maxTabs = MAX_TABS;
    // the model is the source of truth: create it once
    protected readonly model = createModel<NoteTypes>(notesLayout());

    constructor() {
        // Dockable's rule, in Dockable
        inject(DestroyRef).onDestroy(limitTabs(this.model));
        // the cross-library rule: dnd asks Dockable before it lets a card drop on a tabset
        const space = injectDragSpace();
        effect((onCleanup) => {
            const current = space();
            if (!current) return;
            onCleanup(
                current.use((ctx, next) => {
                    const tabset = String(ctx.payload.droppableId);
                    if (
                        this.model.get("node-by", { id: tabset })?.type !==
                        "tabset"
                    )
                        return next();
                    return this.model.can(
                        "tab.add",
                        newTab(String(ctx.source.data), tabset),
                    )
                        ? next()
                        : {
                              ok: false,
                              error: {
                                  code: "vetoed",
                                  message: "That tabset is full.",
                              },
                          };
                }),
            );
        });
    }
}
