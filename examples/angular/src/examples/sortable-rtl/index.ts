import { Component, signal } from "@angular/core";
import {
    arrayMove,
    DndSortable,
    grid,
    horizontalList,
    type SortEndEvent,
} from "@fragiola/dnd-angular/sortable";
import * as styles from "./styles";

// Right to left, in Arabic: nothing to configure. The strategies read the direction from the page,
// so the row of tabs flows from the right and the grid fills its rows from the right, as the page
// does. The keyboard follows reading order: ArrowLeft moves an item forward, toward the inline end.

const TABS: Record<string, string> = {
    home: "الرئيسية",
    reports: "التقارير",
    team: "الفريق",
    settings: "الإعدادات",
};

const APPS: Record<string, string> = {
    mail: "البريد",
    calendar: "التقويم",
    notes: "الملاحظات",
    files: "الملفات",
    photos: "الصور",
    music: "الموسيقى",
};

/** One list the user sorts, applied with `arrayMove`. */
function createOrder(start: string[]) {
    const order = signal(start);
    const sortEnd = ({ from, to, canceled }: SortEndEvent) => {
        if (!canceled)
            order.update((now) => arrayMove(now, from.index, to.index));
    };
    return [order.asReadonly(), sortEnd] as const;
}

@Component({
    selector: "example-sortable-rtl",
    imports: [DndSortable],
    host: { class: "contents" },
    template: `
        <div dir="rtl" lang="ar" [class]="styles.frame">
            <ul aria-label="علامات التبويب" [class]="styles.tabs">
                @for (id of tabs(); track id) {
                    <li
                        [dndSortable]="id"
                        [index]="$index"
                        group="tabs"
                        [strategy]="horizontalList"
                        (sortEnd)="sortTabs($event)"
                        [attr.aria-label]="TABS[id]"
                        [class]="styles.tab"
                    >
                        {{ TABS[id] }}
                    </li>
                }
            </ul>
            <ul aria-label="التطبيقات" [class]="styles.grid">
                @for (id of apps(); track id) {
                    <li
                        [dndSortable]="id"
                        [index]="$index"
                        group="apps"
                        [strategy]="grid"
                        (sortEnd)="sortApps($event)"
                        [attr.aria-label]="APPS[id]"
                        [class]="styles.app"
                    >
                        <span [class]="styles.icon"></span>
                        {{ APPS[id] }}
                    </li>
                }
            </ul>
        </div>
    `,
})
export default class SortableRtl {
    protected readonly styles = styles;
    protected readonly TABS = TABS;
    protected readonly APPS = APPS;
    protected readonly horizontalList = horizontalList;
    protected readonly grid = grid;
    private readonly tabOrder = createOrder(Object.keys(TABS));
    private readonly appOrder = createOrder(Object.keys(APPS));
    protected readonly tabs = this.tabOrder[0];
    protected readonly sortTabs = this.tabOrder[1];
    protected readonly apps = this.appOrder[0];
    protected readonly sortApps = this.appOrder[1];
}
