// The drag space from Angular, for its verbs and middleware (`space.use`): the one given, or the
// document's once the caller is rendered (there is none on the server, nor before the first
// render).
import {
    afterNextRender,
    computed,
    DOCUMENT,
    inject,
    type Signal,
    signal,
} from "@angular/core";
import { type DragSpace, getDragSpace } from "@fragiola/dnd";

/** Where {@link injectDragSpace} finds the space. */
export interface InjectDragSpaceOptions {
    /** this space (then returned from the start) */
    readonly space?: DragSpace | undefined;
    /** this document's space (default: the app's document) */
    readonly document?: Document | undefined;
}

/** Options given as a value, or as a function of signals (inputs) for options that change. */
export type OptionsOf<Options> = Options | (() => Options);

/** The options of the moment. */
export function readOptions<Options>(
    options: OptionsOf<Options>,
): () => Options {
    return typeof options === "function"
        ? (options as () => Options)
        : () => options;
}

/** Whether the caller is rendered: `true` from its first render on, in the browser only. */
export function injectRendered(): Signal<boolean> {
    const rendered = signal(false);
    afterNextRender({ earlyRead: () => rendered.set(true) });
    return rendered.asReadonly();
}

/**
 * The drag space: `options.space`, or a document's (the app's by default) once the caller is
 * rendered; `undefined` before that and on the server. Call it in an injection context (a
 * component's or a directive's constructor or field). Pass a function of signals for options that
 * change.
 */
export function injectDragSpace(
    options: OptionsOf<InjectDragSpaceOptions> = {},
): Signal<DragSpace | undefined> {
    const read = readOptions(options);
    const rendered = injectRendered();
    const page = inject(DOCUMENT);
    return computed(() => {
        const { space, document: doc } = read();
        if (space) return space;
        if (!rendered()) return undefined;
        return getDragSpace(doc ?? page);
    });
}
