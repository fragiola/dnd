import { typedDockable } from "@fragiola/dockable-vue";
import type { NoteTypes } from "../_kit/dockable";

// Dockable's parts typed by the layout's types (a template cannot pass a type argument): `tab` in
// a slot is a note, with its `text`.
export const Dockable = typedDockable<NoteTypes>();
