// The drag overlay (D7, D9): the one part that renders HTML, and only because the app asks for
// it. While a drag of its space (and scope) runs, it teleports the app's content into that
// space's document `body`, in a fixed box where the source would be (the core's `overlayStyle`),
// inert to the pointer: for drags out of `overflow: hidden` containers and between scroll
// containers. It updates on the drag's start, its target changes and its end; the pointer's
// moves write its `left`/`top` directly (D8): the core's `followOverlay` decides both. Give the
// draggable `:translate="false"` so the source stays in place while the overlay moves.
import {
    type DragOperation,
    type DragSpace,
    overlayStyle,
} from "@fragiola/dnd";
import { followOverlay } from "@fragiola/dnd/adapter";
import {
    type DefineSetupFnComponent,
    defineComponent,
    h,
    type SlotsType,
    shallowRef,
    Teleport,
    type VNode,
    watchEffect,
} from "vue";
import { useDragSpace, useMounted } from "../composables/use-drag-space";
import { elementRef } from "../utils/element-ref";
import { type AsProp, renderWrapper, type WrapperProps } from "../utils/wrap";

/**
 * The overlay's state: the drag it shows. The overlay renders nothing while idle, so its slot is
 * only called during a drag, with an operation.
 */
export interface DragOverlayState {
    readonly operation: DragOperation;
}

/** Props of {@link DragOverlay}. */
export interface DragOverlayProps extends WrapperProps {
    /** only the drags of this scope */
    scope?: string | undefined;
    /** an explicit space from `createDragSpace` */
    space?: DragSpace | undefined;
    /** this document's drags (default: the page's) */
    document?: Document | undefined;
}

/** What the overlay's default slot receives: the drag in progress. */
export interface DragOverlaySlotProps {
    readonly operation: DragOperation;
    readonly state: DragOverlayState;
}

/** The overlay's slots: what it shows, a function of the drag in progress. */
export interface DragOverlaySlots {
    default?: (scope: DragOverlaySlotProps) => VNode[];
}

/** The core's overlay style, in CSS lengths (Vue, unlike React, adds no unit to a number). */
function placed(operation: DragOperation): Record<string, string> {
    return Object.fromEntries(
        Object.entries(overlayStyle(operation)).map(([key, value]) => [
            key,
            typeof value === "number" ? `${value}px` : value,
        ]),
    );
}

/**
 * Shows the app's content under the pointer while a drag runs, teleported into the document's
 * `body`, in a `div` (or `as`) that takes the overlay's attributes. It can sit anywhere in the
 * tree; it needs no provider.
 */
export const DragOverlay: DefineSetupFnComponent<
    DragOverlayProps,
    Record<never, never>,
    SlotsType<DragOverlaySlots>
> = defineComponent({
    name: "DragOverlay",
    inheritAttrs: false,
    props: { as: null, scope: null, space: null, document: null },
    setup(props, { attrs, slots }) {
        const space = useDragSpace(() => ({
            space: props.space as DragSpace | undefined,
            document: props.document as Document | undefined,
        }));
        const operation = shallowRef<DragOperation>();
        let element: HTMLElement | null = null;
        // the latest operation: the pointer's moves are rendered on the next show only
        let latest: DragOperation | undefined;
        const mounted = useMounted();
        watchEffect(
            (onCleanup) => {
                const current = space.value;
                // from the mount on, even with an explicit space: never on the server, and a
                // hydrated overlay first renders what the server did
                if (!current || !mounted.value) return;
                onCleanup(
                    followOverlay(
                        current,
                        {
                            show(next) {
                                latest = next;
                                operation.value = next;
                            },
                            move(next) {
                                latest = next;
                            },
                            element: () => element,
                        },
                        props.scope as string | undefined,
                    ),
                );
                // from the mount on: a drag right after it is shown
            },
            { flush: "sync" },
        );
        const ref = elementRef((found) => {
            element = found;
            return () => {
                element = null;
            };
        });
        return () => {
            const current = space.value;
            const shown = operation.value && (latest ?? operation.value);
            if (!current || !shown) return null;
            const state: DragOverlayState = { operation: shown };
            return h(Teleport, { to: current.get("document").body }, [
                renderWrapper({
                    part: "DragOverlay",
                    state,
                    props: {
                        ref,
                        "data-dnd-part": "overlay",
                        style: placed(shown),
                    },
                    attrs,
                    as: props.as as AsProp | undefined,
                    content: slots.default?.({ operation: shown, state }),
                    fallback: "div",
                }),
            ]);
        };
    },
}) as unknown as DefineSetupFnComponent<
    DragOverlayProps,
    Record<never, never>,
    SlotsType<DragOverlaySlots>
>;
