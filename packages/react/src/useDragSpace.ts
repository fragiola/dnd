// The drag space from React, for its verbs and middleware (`space.use`): the one given, or the
// document's, read after mount (there is none on the server and in the first render).
import { type DragSpace, getDragSpace } from "@fragiola/dnd";
import * as React from "react";

/** Where {@link useDragSpace} finds the space. */
export interface UseDragSpaceOptions {
    /** this space (then returned from the first render on) */
    readonly space?: DragSpace | undefined;
    /** this document's space (default: the document of `ref`'s element, else the page's) */
    readonly document?: Document | undefined;
    /** an element whose document's space it is */
    readonly ref?: React.RefObject<Element | null> | undefined;
}

/**
 * The drag space: `options.space`, or a document's (the page's by default) once mounted;
 * `undefined` before that and on the server.
 */
export function useDragSpace(
    options: UseDragSpaceOptions = {},
): DragSpace | undefined {
    const { space, document: doc, ref } = options;
    const [found, setFound] = React.useState<DragSpace>();
    React.useEffect(() => {
        if (space) return;
        setFound(getDragSpace(doc ?? ref?.current?.ownerDocument ?? document));
    }, [space, doc, ref]);
    return space ?? found;
}
