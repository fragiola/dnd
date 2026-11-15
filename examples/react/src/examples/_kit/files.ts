// Demo content for the typed-sources example: files of three kinds. The kind is the draggable's
// `type`, which a droppable's `accepts` list matches; the size feeds an `accepts` predicate.

/** A file on the desk. */
export interface DemoFile {
    readonly id: string;
    readonly name: string;
    readonly kind: "image" | "document" | "audio";
    /** in KB */
    readonly size: number;
}

export const FILES: readonly DemoFile[] = [
    { id: "beach", name: "beach.jpg", kind: "image", size: 2400 },
    { id: "icon", name: "icon.png", kind: "image", size: 12 },
    { id: "invoice", name: "invoice.pdf", kind: "document", size: 180 },
    { id: "notes", name: "notes.txt", kind: "document", size: 4 },
    { id: "theme", name: "theme.mp3", kind: "audio", size: 5200 },
];

/** "2.4 MB", "12 KB". */
export function formatSize(size: number): string {
    return size >= 1000 ? `${(size / 1000).toFixed(1)} MB` : `${size} KB`;
}
