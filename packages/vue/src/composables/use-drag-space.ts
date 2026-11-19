// The drag space from Vue, for its verbs and middleware (`space.use`): the one given, or the
// document's, read after mount (there is none on the server and before the mount).
import { type DragSpace, getDragSpace } from "@fragiola/dnd";
import {
    type ComputedRef,
    computed,
    getCurrentInstance,
    type MaybeRefOrGetter,
    onMounted,
    type Ref,
    shallowRef,
    toValue,
} from "vue";
import { toElement } from "../utils/element-ref";

/** Where {@link useDragSpace} finds the space. */
export interface UseDragSpaceOptions {
    /** this space (then returned from the start) */
    readonly space?: DragSpace | undefined;
    /** this document's space (default: the document of `ref`'s element, else the page's) */
    readonly document?: Document | undefined;
    /** a template ref of an element (or component) whose document's space it is */
    readonly ref?: Readonly<Ref<unknown>> | undefined;
}

/**
 * Whether the caller is mounted: a component once it mounts; a scope outside any component (a
 * store, a test) at once, in a browser. Never on the server.
 */
export function useMounted(): Readonly<Ref<boolean>> {
    const mounted = shallowRef(
        !getCurrentInstance() && typeof document !== "undefined",
    );
    if (getCurrentInstance())
        onMounted(() => {
            mounted.value = true;
        });
    return mounted;
}

/**
 * The drag space: `options.space`, or a document's (the page's by default) once mounted;
 * `undefined` before that and on the server. Pass a getter or a ref for options that change.
 */
export function useDragSpace(
    options: MaybeRefOrGetter<UseDragSpaceOptions> = {},
): ComputedRef<DragSpace | undefined> {
    const mounted = useMounted();
    return computed(() => {
        const { space, document: doc, ref } = toValue(options);
        if (space) return space;
        if (!mounted.value) return undefined;
        return getDragSpace(
            doc ?? toElement(ref?.value)?.ownerDocument ?? document,
        );
    });
}
