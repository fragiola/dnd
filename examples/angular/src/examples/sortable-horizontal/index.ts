import { Component, signal } from "@angular/core";
import {
    arrayMove,
    DndSortable,
    horizontalList,
    type SortEndEvent,
} from "@fragiola/dnd-angular/sortable";
import {
    LucideDynamicIcon,
    LucideMessageSquare,
    LucideMousePointer2,
    LucidePenLine,
    LucideShapes,
    LucideType,
} from "@lucide/angular";
import * as styles from "./styles";

// A toolbar the user arranges: the same `[dndSortable]` as a vertical list, with the
// `horizontalList` strategy (an export of its own, so a vertical list never ships it). Items of
// different widths keep their gaps, and in a right-to-left page the row flows from the right.

const TOOLS = {
    select: { label: "Select", icon: LucideMousePointer2 },
    pen: { label: "Pen", icon: LucidePenLine },
    shapes: { label: "Shapes", icon: LucideShapes },
    text: { label: "Text", icon: LucideType },
    comment: { label: "Comment", icon: LucideMessageSquare },
};

type Tool = keyof typeof TOOLS;

@Component({
    selector: "example-sortable-horizontal",
    imports: [DndSortable, LucideDynamicIcon],
    host: { class: "contents" },
    template: `
        <div [class]="styles.frame">
            <p [class]="styles.hint">Drag a tool to rearrange the toolbar.</p>
            <ul aria-label="Toolbar" [class]="styles.row">
                @for (tool of tools(); track tool) {
                    <li
                        [dndSortable]="tool"
                        [index]="$index"
                        group="toolbar"
                        [strategy]="horizontalList"
                        (sortEnd)="sortEnd($event)"
                        [attr.aria-label]="TOOLS[tool].label"
                        [class]="styles.tool"
                    >
                        <svg [lucideIcon]="TOOLS[tool].icon" aria-hidden="true"></svg>
                        {{ TOOLS[tool].label }}
                    </li>
                }
            </ul>
            <p [class]="styles.order">
                Order: <output aria-label="Order">{{ tools().join(", ") }}</output>
            </p>
        </div>
    `,
})
export default class SortableHorizontal {
    protected readonly styles = styles;
    protected readonly TOOLS = TOOLS;
    protected readonly horizontalList = horizontalList;
    protected readonly tools = signal<readonly Tool[]>([
        "select",
        "pen",
        "shapes",
        "text",
        "comment",
    ]);

    protected sortEnd({ from, to, canceled }: SortEndEvent): void {
        if (!canceled)
            this.tools.update((now) => arrayMove(now, from.index, to.index));
    }
}
