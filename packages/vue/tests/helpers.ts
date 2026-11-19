// The Vue tests' setup: the core's harness (faked frames and pointer capture, the pointer and key
// helpers) and the boxes jsdom cannot lay out, shared with the React tests, plus mounting into
// the document and waiting for Vue's updates.
import { type ComponentMountingOptions, mount } from "@vue/test-utils";
import { type Component, nextTick } from "vue";

export {
    type Box,
    flush,
    key,
    place,
    placeAll,
    pointer,
} from "../../react/tests/helpers";

/** Mounts `component` into the document's body (the drag space is the document's). */
export function render(
    component: Component,
    options: ComponentMountingOptions<Component> = {},
) {
    const host = document.createElement("div");
    document.body.append(host);
    const wrapper = mount(component, { ...options, attachTo: host });
    // Vue Test Utils mounts into a `data-v-app` element of its own, inside the host
    return { wrapper, container: host.firstElementChild as HTMLElement };
}

/** The element of a test id; throws when there is none. */
export function byTestId(id: string): HTMLElement {
    const element = document.querySelector<HTMLElement>(
        `[data-testid="${id}"]`,
    );
    if (!element) throw new Error(`no [data-testid="${id}"]`);
    return element;
}

/** Waits for Vue to apply the updates the last events queued. */
export const settle = () => nextTick();

/**
 * A mounting option that counts every component update (`updated`), by the part's id (or group),
 * else by component name: the render counter of D8.
 */
export function countUpdates(
    updates: string[],
): ComponentMountingOptions<Component> {
    return {
        global: {
            mixins: [
                {
                    updated(this: {
                        $options: { name?: string };
                        $props: Record<string, unknown>;
                    }) {
                        const id = this.$props.id ?? this.$props.group;
                        updates.push(
                            id === undefined
                                ? (this.$options.name ?? "anonymous")
                                : String(id),
                        );
                    },
                },
            ],
        },
    };
}
