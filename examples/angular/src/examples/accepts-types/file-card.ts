import { Component, input } from "@angular/core";
import { DndDraggable } from "@fragiola/dnd-angular/draggable";
import {
    LucideDynamicIcon,
    LucideFileAudio,
    LucideFileImage,
    LucideFileText,
    type LucideIcon,
} from "@lucide/angular";
import { type DemoFile, formatSize } from "../_kit/files";
import * as styles from "./styles";

// A file: a draggable whose `type` is its kind, carrying the file in `data`.

const ICONS: Record<DemoFile["kind"], LucideIcon> = {
    image: LucideFileImage,
    document: LucideFileText,
    audio: LucideFileAudio,
};

@Component({
    selector: "example-accepts-types-file-card",
    imports: [DndDraggable, LucideDynamicIcon],
    host: { class: "contents" },
    template: `
        <li
            [dndDraggable]="file().id"
            [type]="file().kind"
            [data]="file()"
            [attr.aria-label]="file().name"
            [class]="styles.file"
        >
            <svg [lucideIcon]="ICONS[file().kind]" aria-hidden="true" [class]="styles.icon"></svg>
            <span [class]="styles.fileName">{{ file().name }}</span>
            <span [class]="styles.size">{{ formatSize(file().size) }}</span>
        </li>
    `,
})
export class FileCard {
    readonly file = input.required<DemoFile>();
    protected readonly styles = styles;
    protected readonly ICONS = ICONS;
    protected readonly formatSize = formatSize;
}
