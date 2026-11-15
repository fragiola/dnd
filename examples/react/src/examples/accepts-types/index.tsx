"use client";

import type { DragSource } from "@fragiola/dnd-react";
import { Draggable } from "@fragiola/dnd-react/draggable";
import { Droppable } from "@fragiola/dnd-react/droppable";
import { FileAudio, FileImage, FileText } from "lucide-react";
import { useState } from "react";
import { type DemoFile, FILES, formatSize } from "../_kit/files";
import * as styles from "./styles";

// Each file is a draggable whose `type` is its kind. A folder's `accepts` is a list of types, or a
// predicate of the source: a folder that would take the drag in progress is marked
// `data-dnd-active`, one that refuses the source under the pointer `data-dnd-refused`, and a
// refused drop never reaches `onDrop`.

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

const ICONS = { image: FileImage, document: FileText, audio: FileAudio };

export default function AcceptsTypes() {
    const [where, setWhere] = useState<Record<string, FolderId>>(() =>
        Object.fromEntries(FILES.map((file) => [file.id, "desk"])),
    );
    const move = (id: string | number, to: FolderId) =>
        setWhere((now) => ({ ...now, [String(id)]: to }));
    const filesIn = (folder: FolderId) =>
        FILES.filter((file) => where[file.id] === folder);
    return (
        <div className={styles.frame}>
            <Droppable
                id="desk"
                onDrop={(event) => move(event.operation.source.id, "desk")}
            >
                <ul aria-label="Desk" className={styles.desk}>
                    {filesIn("desk").map((file) => (
                        <FileCard key={file.id} file={file} />
                    ))}
                </ul>
            </Droppable>
            <div className={styles.folders}>
                {FOLDERS.map((folder) => (
                    <Droppable
                        key={folder.id}
                        id={folder.id}
                        accepts={folder.accepts}
                        onDrop={(event) =>
                            move(event.operation.source.id, folder.id)
                        }
                    >
                        <section
                            aria-label={folder.title}
                            className={styles.folder}
                        >
                            <header className={styles.folderHeader}>
                                <span className={styles.folderTitle}>
                                    {folder.title}
                                </span>
                                <span
                                    className={styles.rule}
                                >{`takes: ${folder.rule}`}</span>
                                <span
                                    aria-hidden="true"
                                    className={styles.refused}
                                >
                                    Not here
                                </span>
                            </header>
                            <ul
                                aria-label={`Files in ${folder.title}`}
                                className={styles.folderFiles}
                            >
                                {filesIn(folder.id).map((file) => (
                                    <FileCard key={file.id} file={file} />
                                ))}
                            </ul>
                        </section>
                    </Droppable>
                ))}
            </div>
        </div>
    );
}

function FileCard({ file }: { file: DemoFile }) {
    const Icon = ICONS[file.kind];
    return (
        <Draggable id={file.id} type={file.kind} data={file}>
            <li aria-label={file.name} className={styles.file}>
                <Icon aria-hidden="true" className={styles.icon} />
                <span className={styles.fileName}>{file.name}</span>
                <span className={styles.size}>{formatSize(file.size)}</span>
            </li>
        </Draggable>
    );
}
