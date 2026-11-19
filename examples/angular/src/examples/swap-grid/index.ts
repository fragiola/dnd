import { Component, signal } from "@angular/core";
import {
    DndSwappable,
    type SwapEvent,
    swapItems,
} from "@fragiola/dnd-angular/swappable";
import {
    LucideActivity,
    LucideDynamicIcon,
    LucideGauge,
    LucideGlobe,
    type LucideIcon,
    LucideTimer,
    LucideUsers,
    LucideWallet,
} from "@lucide/angular";
import * as styles from "./styles";

// A dashboard whose widgets trade places. Over another widget, only that one moves, into the
// dragged widget's place, and the core marks it `data-dnd-swap-target` (styled in styles.ts):
// nothing else shifts and nothing renders. On the drop the app swaps the two with `swapItems`;
// dropped over no widget, nothing changes.

const WIDGETS = {
    visitors: { label: "Visitors", value: "12.4k", icon: LucideUsers },
    revenue: { label: "Revenue", value: "$8,210", icon: LucideWallet },
    uptime: { label: "Uptime", value: "99.98%", icon: LucideActivity },
    latency: { label: "Latency", value: "142 ms", icon: LucideTimer },
    regions: { label: "Regions", value: "14", icon: LucideGlobe },
    load: { label: "Load", value: "61%", icon: LucideGauge },
} satisfies Record<string, { label: string; value: string; icon: LucideIcon }>;

type Widget = keyof typeof WIDGETS;

@Component({
    selector: "example-swap-grid",
    imports: [DndSwappable, LucideDynamicIcon],
    host: { class: "contents" },
    template: `
        <div [class]="styles.frame">
            <ul aria-label="Dashboard" [class]="styles.grid">
                @for (widget of widgets(); track widget) {
                    <li
                        [dndSwappable]="widget"
                        [index]="$index"
                        group="dashboard"
                        (swap)="swap($event)"
                        [attr.aria-label]="WIDGETS[widget].label"
                        [class]="styles.widget"
                    >
                        <span [class]="styles.label">
                            <svg [lucideIcon]="WIDGETS[widget].icon" aria-hidden="true"></svg>
                            {{ WIDGETS[widget].label }}
                        </span>
                        <span [class]="styles.value">{{ WIDGETS[widget].value }}</span>
                    </li>
                }
            </ul>
        </div>
    `,
})
export default class SwapGrid {
    protected readonly styles = styles;
    protected readonly WIDGETS = WIDGETS;
    protected readonly widgets = signal(Object.keys(WIDGETS) as Widget[]);

    protected swap({ source, target, canceled }: SwapEvent): void {
        if (!canceled && target)
            this.widgets.update((now) =>
                swapItems(now, source.index, target.index),
            );
    }
}
