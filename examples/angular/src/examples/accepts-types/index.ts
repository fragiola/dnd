import { Component, signal } from "@angular/core";
import type { DragSource } from "@fragiola/dnd-angular";
import { DndDroppable } from "@fragiola/dnd-angular/droppable";
import { type DemoFile, FILES } from "../_kit/files";
import { FileCard } from "./file-card";
import * as styles from "./styles";

// Each file is a draggable whose `type` is its kind. A folder's `accepts` is a list of types, or a
// predicate of the source: a folder that would take the drag in progress is marked
// `data-dnd-active`, one that refuses the source under the pointer `data-dnd-refused`, and a
// refused drop never reaches `(drop)`.

type FolderId = "desk" | "images" | "documents" | "small";

interface Folder {
    readonly id: FolderId;
    readonly title: string;
    readonly rule: string;
    readonly accepts?: readonly string[] | ((source: DragSource) => boolean);
}

const FOLDERS: readonly Folder[] = [
    { id: "images", title: "Images", rule: "image", accepts: ["image"] },
    {
        id: "documents",
        title: "Documents",
        rule: "document",
        accepts: ["document"],
    },
    {
        id: "small",
        title: "Small files",
        rule: "under 100 KB",
        // a predicate reads anything the draggable carries in `data`
        accepts: (source) => ((source.data as DemoFile).size ?? 0) < 100,
    },
];

@Component({
    selector: "example-accepts-types",
    imports: [DndDroppable, FileCard],
    host: { class: "contents" },
    template: `
        <div [class]="styles.frame">
            <ul
                dndDroppable="desk"
                (drop)="move($event.operation.source.id, 'desk')"
                aria-label="Desk"
                [class]="styles.desk"
            >
                @for (file of filesIn("desk"); track file.id) {
                    <example-accepts-types-file-card [file]="file" />
                }
            </ul>
            <div [class]="styles.folders">
                @for (folder of FOLDERS; track folder.id) {
                    <section
                        [dndDroppable]="folder.id"
                        [accepts]="folder.accepts"
                        (drop)="move($event.operation.source.id, folder.id)"
                        [attr.aria-label]="folder.title"
                        [class]="styles.folder"
                    >
                        <header [class]="styles.folderHeader">
                            <span [class]="styles.folderTitle">{{ folder.title }}</span>
                            <span [class]="styles.rule">takes: {{ folder.rule }}</span>
                            <span aria-hidden="true" [class]="styles.refused">Not here</span>
                        </header>
                        <ul [attr.aria-label]="'Files in ' + folder.title" [class]="styles.folderFiles">
                            @for (file of filesIn(folder.id); track file.id) {
                                <example-accepts-types-file-card [file]="file" />
                            }
                        </ul>
                    </section>
                }
            </div>
        </div>
    `,
})
export default class AcceptsTypes {
    protected readonly styles = styles;
    protected readonly FOLDERS = FOLDERS;
    protected readonly where = signal<Record<string, FolderId>>(
        Object.fromEntries(FILES.map((file) => [file.id, "desk"])),
    );

    protected move(id: string | number, to: FolderId): void {
        this.where.update((now) => ({ ...now, [String(id)]: to }));
    }

    protected filesIn(folder: FolderId): readonly DemoFile[] {
        return FILES.filter((file) => this.where()[file.id] === folder);
    }
}
