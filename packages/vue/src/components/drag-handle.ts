// A drag handle (D9): inside a drag source's element (a draggable, a sortable or a swappable
// item), the only place a drag starts, and its tab stop. It finds its source through the DOM
// (`connectHandle` of `@fragiola/dnd/adapter`), never a provide/inject, so the handle may sit deep
// inside the source, across any component boundary. It is a shared part: each drag source's entry
// re-exports it.
import type { DraggableState } from "@fragiola/dnd";
import {
    connectHandle,
    createSlot,
    type HandleConnection,
    handleRest,
} from "@fragiola/dnd/adapter";
import {
    computed,
    defineComponent,
    nextTick,
    onMounted,
    onScopeDispose,
} from "vue";
import { elementRef, toElement } from "../utils/element-ref";
import { useSlotState } from "../utils/use-part";
import {
    type AsProp,
    checkElement,
    renderWrapper,
    type WrapperComponent,
    type WrapperProps,
    type WrapperSlots,
} from "../utils/wrap";

// The development check is written `process.env.NODE_ENV !== "production"`, literally: an app's
// bundler replaces it, and a production build drops the check and its message.
declare const process: { readonly env: { readonly NODE_ENV?: string } };

/** Props of {@link DragHandle}. */
export interface DragHandleProps extends WrapperProps {
    /** the id of the element describing how to drag it (`aria-describedby`): the app's text */
    describedBy?: string | undefined;
}

/**
 * Makes its single child the only place its drag source's drag starts, and its tab stop. It must
 * be inside a draggable, sortable or swappable element; it renders no element of its own. The
 * default slot is scoped with its source's state (`v-slot="{ state }"`).
 */
export const DragHandle: WrapperComponent<
    DragHandleProps,
    WrapperSlots<DraggableState>
> = defineComponent({
    name: "DragHandle",
    inheritAttrs: false,
    props: { as: null, describedBy: null },
    setup(props, { attrs, slots }) {
        const slot = createSlot<DraggableState>(() => handleRest);
        let connection: HandleConnection | undefined;
        let element: HTMLElement | null = null;
        const attach = elementRef((found) => {
            const connected = connectHandle(found, slot);
            connection = connected;
            return () => {
                connected.disconnect();
                if (connection === connected) connection = undefined;
            };
        });
        const ref = (value: unknown) => {
            element = toElement(value);
            attach(value);
        };
        onScopeDispose(() => attach(null));
        checkElement("DragHandle", () => element);
        if (process.env.NODE_ENV !== "production")
            onMounted(async () => {
                // after the flush: its source's element attaches after the handle's
                await nextTick();
                if (element && !connection?.linked)
                    console.error(
                        '<DragHandle> is not inside a draggable, sortable or swappable element (`data-dnd-part="draggable"`, `"sortable"` or `"swappable"`): it has no effect.',
                    );
            });
        const state = useSlotState(slot);
        const own = computed(() => ({
            ref,
            "data-dnd-part": "handle",
            "data-dnd-handle": "",
            "data-dnd-dragging": state.value.dragging ? "" : undefined,
            "data-dnd-disabled": state.value.disabled ? "" : undefined,
            "aria-disabled": state.value.disabled ? true : undefined,
            "aria-describedby": props.describedBy as string | undefined,
        }));
        return () =>
            renderWrapper({
                part: "DragHandle",
                state: state.value,
                props: own.value,
                attrs,
                as: props.as as AsProp | undefined,
                content: slots.default?.({ state: state.value }),
            });
    },
}) as unknown as WrapperComponent<
    DragHandleProps,
    WrapperSlots<DraggableState>
>;
