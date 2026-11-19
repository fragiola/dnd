import { afterEach, describe, expect, it, vi } from "vitest";
import {
    type Component,
    defineComponent,
    Fragment,
    h,
    nextTick,
    ref,
    type VNodeChild,
} from "vue";
import { Draggable, DragHandle } from "../src/draggable";
import { Droppable } from "../src/droppable";
import { byTestId, pointer, render, settle } from "./helpers";

// The wrapper contract (D6, D7) in Vue: a wrapper renders exactly its default-slot child's
// element, with its props, template ref and listeners merged in, or its `as`; anything else
// throws in development.

/**
 * The shape of every Fragiola primitive (`Dockable.Tab`): its own data-*, its own listener, and
 * its attributes (the consumer's listeners with them) and template ref on its root element.
 */
const Tab = defineComponent({
    props: { onOwn: { type: Function, required: true } },
    setup(props, { slots }) {
        return () =>
            h(
                "button",
                {
                    type: "button",
                    role: "tab",
                    "data-layout-path": "/ts0/t0",
                    "data-selected": "",
                    onClick: () => props.onOwn(),
                },
                slots.default?.(),
            );
    },
});

/** A component that renders a fragment root: no one element takes the ref. */
const Fragmented = defineComponent({
    setup: () => () => [h("i"), h("i")],
});

/** A component that drops its attributes. */
const Swallows = defineComponent({
    inheritAttrs: false,
    setup: () => () => h("div"),
});

/** A component rendering `content` (a render function), so a test can pass any slot. */
const page = (content: () => VNodeChild): Component =>
    defineComponent({ setup: () => content });

afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
});

describe("the wrappers render no element of their own", () => {
    it("renders exactly the child's element for Draggable, Droppable and DragHandle", async () => {
        const { container } = render(
            page(() =>
                h("ul", [
                    h(Draggable, { id: "a" }, () =>
                        h("li", { class: "card", "data-x": "1" }, [
                            h(DragHandle, null, () => h("span", "grip")),
                            "A",
                        ]),
                    ),
                    h(Droppable, { id: "z" }, () =>
                        h("section", { "aria-label": "Zone" }),
                    ),
                ]),
            ),
        );
        await settle();
        expect(container.innerHTML).toBe(
            '<ul><li class="card" data-x="1" data-dnd-part="draggable" data-dnd-id="a"><span data-dnd-part="handle" data-dnd-handle="" tabindex="0" style="touch-action: none;">grip</span>A</li><section aria-label="Zone" data-dnd-part="droppable" data-dnd-id="z"></section></ul>',
        );
    });

    it("gives a non-focusable draggable a tab stop, and leaves a button's alone", () => {
        render(
            page(() => [
                h(Draggable, { id: "a" }, () =>
                    h("div", { "data-testid": "a" }),
                ),
                h(Draggable, { id: "b" }, () =>
                    h("button", { type: "button", "data-testid": "b" }),
                ),
            ]),
        );
        expect(byTestId("a").getAttribute("tabindex")).toBe("0");
        expect(byTestId("b").hasAttribute("tabindex")).toBe(false);
    });

    it("renders `as` instead of a child, the default slot its content, scoped with the state", () => {
        const { container } = render(
            page(() => [
                h(Draggable, { id: "a", as: "li", class: "own" }, () => "A"),
                h(
                    Droppable,
                    { id: "z", as: "section", class: "zone" },
                    {
                        default: ({ state }: { state: { over: boolean } }) =>
                            `over: ${state.over}`,
                    },
                ),
            ]),
        );
        expect(container.innerHTML).toBe(
            '<li data-dnd-part="draggable" data-dnd-id="a" class="own" tabindex="0">A</li><section data-dnd-part="droppable" data-dnd-id="z" class="zone">over: false</section>',
        );
    });

    it("skips a `v-if` comment beside the child", () => {
        const { container } = render(
            page(() =>
                h(Draggable, { id: "a" }, () => [
                    null,
                    h("li", { "data-testid": "a" }),
                ]),
            ),
        );
        expect(container.querySelector("li")?.dataset.dndPart).toBe(
            "draggable",
        );
    });
});

describe("the merge", () => {
    it("keeps the child's template ref, listeners, class and style; the wrapper's listeners run first", async () => {
        const calls: string[] = [];
        const childRef = ref<HTMLElement | null>(null);
        const { wrapper } = render(
            page(() =>
                h(
                    Draggable,
                    {
                        id: "a",
                        class: "wrapper",
                        style: { color: "red" },
                        onClick: () => calls.push("wrapper"),
                    },
                    {
                        default: ({
                            state,
                        }: {
                            state: { dragging: boolean };
                        }) =>
                            h("div", {
                                "data-testid": "a",
                                ref: childRef,
                                class: ["child", state.dragging ? "on" : "off"],
                                style: { color: "blue", margin: "2px" },
                                onClick: () => calls.push("child"),
                                onPointerdown: (event: PointerEvent) =>
                                    calls.push(
                                        `child ${event.defaultPrevented ? "after the claim" : "before"}`,
                                    ),
                            }),
                    },
                ),
            ),
        );
        await settle();
        const element = byTestId("a");
        expect(childRef.value).toBe(element);
        expect(element.className).toBe("child off wrapper");
        // the wrapper's style over the child's
        expect(element.getAttribute("style")).toBe("color: red; margin: 2px;");
        // Vue's listeners are on the element since its mount, before the core's (added when the
        // element attaches): a listener of the app sees the press before dnd claims it
        pointer(element, 1, 1).release(1, 1);
        element.click();
        expect(calls).toEqual(["child before", "wrapper", "child"]);
        wrapper.unmount();
    });

    it("lets the child's own plain props win over the wrapper's", () => {
        render(
            page(() =>
                h(
                    Draggable,
                    { id: "a", title: "wrapper", describedBy: "help" },
                    () =>
                        h("div", {
                            "data-testid": "a",
                            title: "child",
                            "aria-describedby": "own",
                        }),
                ),
            ),
        );
        expect(byTestId("a").title).toBe("child");
        expect(byTestId("a").getAttribute("aria-describedby")).toBe("own");
    });

    it("follows option changes without re-registering, and a ref on the wrapper gives its element", async () => {
        const disabled = ref(false);
        const wrapperRef = ref<{ $el: unknown } | null>(null);
        render(
            page(() =>
                h(
                    Draggable,
                    { id: "x", disabled: disabled.value, ref: wrapperRef },
                    () => h("div", { "data-testid": "x" }),
                ),
            ),
        );
        const element = byTestId("x");
        expect(wrapperRef.value?.$el).toBe(element);
        disabled.value = true;
        await settle();
        expect(byTestId("x")).toBe(element);
        expect(element.dataset.dndDisabled).toBe("");
        expect(element.getAttribute("aria-disabled")).toBe("true");
    });

    it("keeps both sets of attributes and listeners on a primitive that takes its attributes", () => {
        const own = vi.fn();
        const consumer = vi.fn();
        render(
            page(() =>
                h(Droppable, { id: "z" }, () =>
                    h(Draggable, { id: "a" }, () =>
                        h(Tab, { onOwn: own, onClick: consumer }, () => "Tab"),
                    ),
                ),
            ),
        );
        const tab = document.querySelector<HTMLElement>('[role="tab"]');
        expect(tab?.dataset).toMatchObject({
            layoutPath: "/ts0/t0",
            selected: "",
            // both wrappers' parts stack on the one element; the inner one's id wins
            dndPart: "draggable droppable",
            dndId: "a",
        });
        tab?.click();
        expect(own).toHaveBeenCalledTimes(1);
        expect(consumer).toHaveBeenCalledTimes(1);
    });

    it("wraps a wrapper: a Draggable that is also a Droppable", () => {
        render(
            page(() =>
                h(Droppable, { id: "z", class: "zone" }, () =>
                    h(Draggable, { id: "a", class: "card" }, () =>
                        h("div", { "data-testid": "both" }),
                    ),
                ),
            ),
        );
        const element = byTestId("both");
        expect(element.className).toBe("card zone");
        expect(element.dataset.dndPart).toBe("draggable droppable");
        expect(element.dataset.dndId).toBe("a");
    });
});

describe("development errors", () => {
    const invalid: [string, () => VNodeChild, RegExp][] = [
        ["no child", () => undefined, /got no child/],
        ["several children", () => [h("i"), h("i")], /got several children/],
        ["a fragment", () => h(Fragment, [h("i"), h("i")]), /got a fragment/],
        ["text", () => "text", /got text/],
    ];

    it.each(invalid)("throws for %s", (_name, children, message) => {
        vi.spyOn(console, "warn").mockImplementation(() => {});
        expect(() =>
            render(page(() => h(Draggable, { id: "a" }, children))),
        ).toThrow(message);
        expect(() =>
            render(page(() => h(Droppable, { id: "z" }, children))),
        ).toThrow(message);
    });

    it("reports a child that never receives the element, or drops the attributes", async () => {
        const error = vi.spyOn(console, "error").mockImplementation(() => {});
        render(
            page(() => [
                h(Draggable, { id: "a" }, () => h(Fragmented)),
                h(Draggable, { id: "b" }, () => h(Swallows)),
            ]),
        );
        await nextTick();
        await nextTick();
        expect(error).toHaveBeenCalledWith(
            expect.stringContaining("never received the template ref"),
        );
        expect(error).toHaveBeenCalledWith(
            expect.stringContaining("never received the wrapper's attributes"),
        );
    });

    it("reports a handle outside a draggable", async () => {
        const error = vi.spyOn(console, "error").mockImplementation(() => {});
        render(page(() => h(DragHandle, null, () => h("span"))));
        await nextTick();
        await nextTick();
        expect(error).toHaveBeenCalledWith(
            expect.stringContaining("not inside a draggable"),
        );
    });

    it("never throws nor reports in production: an invalid child renders as it is", async () => {
        vi.stubEnv("NODE_ENV", "production");
        const error = vi.spyOn(console, "error");
        const { container } = render(
            page(() => [
                h(Draggable, { id: "a" }, () => "text"),
                h(Droppable, { id: "z" }, () => h(Fragment, [h("b")])),
                h(Draggable, { id: "b" }, () => h(Swallows)),
                h(DragHandle, null, () => h("span")),
            ]),
        );
        await nextTick();
        await nextTick();
        expect(container.innerHTML).toBe(
            'text<b></b><div tabindex="0"></div><span data-dnd-part="handle" data-dnd-handle=""></span>',
        );
        expect(error).not.toHaveBeenCalled();
    });
});
