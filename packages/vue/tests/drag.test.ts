import { createDragSpace, getDragSpace } from "@fragiola/dnd";
import { describe, expect, it, vi } from "vitest";
import {
    type Component,
    defineComponent,
    effectScope,
    h,
    type PropType,
    ref,
    type VNodeChild,
    watchEffect,
} from "vue";
import { useDragMonitor, useDragSpace } from "../src";
import { Draggable, DragHandle, useDraggable } from "../src/draggable";
import { Droppable } from "../src/droppable";
import {
    byTestId,
    countUpdates,
    flush,
    key,
    place,
    placeAll,
    pointer,
    render,
    settle,
} from "./helpers";

// The components in a drag: no provider between the two halves, scopes and explicit spaces,
// handles, option updates without a re-register, a second mount, and no component update while
// the pointer moves inside one droppable (D8).

const BOXES = {
    card: { x: 0, y: 0, width: 50, height: 50 },
    left: { x: 100, y: 0, width: 100, height: 100 },
    right: { x: 300, y: 0, width: 100, height: 100 },
};

/** The draggable and two droppables in unrelated subtrees, with no common wrapper. */
const Page = defineComponent({
    props: {
        onDrop: Function as PropType<(id: string) => void>,
        onDragEnd: Function as PropType<() => void>,
        accepts: Array as PropType<readonly string[]>,
        scope: String,
    },
    setup(props) {
        return () =>
            h("main", [
                h("aside", [
                    h("div", [
                        h(
                            Draggable,
                            {
                                id: "card",
                                type: "task",
                                onDragEnd: props.onDragEnd,
                            },
                            () => h("div", { "data-testid": "card" }),
                        ),
                    ]),
                ]),
                h("section", [
                    h(
                        Droppable,
                        {
                            id: "left",
                            scope: props.scope,
                            accepts: props.accepts,
                            onDrop: () => props.onDrop?.("left"),
                        },
                        () => h("div", { "data-testid": "left" }),
                    ),
                ]),
                h("footer", [
                    h(
                        Droppable,
                        { id: "right", onDrop: () => props.onDrop?.("right") },
                        () => h("div", { "data-testid": "right" }),
                    ),
                ]),
            ]);
    },
});

/** A handle deep in a component of its own: no provide/inject links it to its draggable. */
const Grip = defineComponent({
    setup: () => () =>
        h("p", [
            h(DragHandle, null, () => h("span", { "data-testid": "grip" })),
        ]),
});

/** A drop rule from Vue: no drop on `left`. */
const Rule = defineComponent({
    setup() {
        const space = useDragSpace();
        watchEffect((onCleanup) => {
            const current = space.value;
            if (!current) return;
            onCleanup(
                current.use((ctx, next) =>
                    ctx.payload.droppableId === "left"
                        ? { ok: false, error: { code: "vetoed" } }
                        : next(),
                ),
            );
        });
        return () => null;
    },
});

const page = (content: () => VNodeChild) =>
    defineComponent({ setup: () => content }) as Component;

/** Drags the card from its centre to (x, y), waiting for Vue after each step. */
async function dragCard(x: number, y: number, release = true) {
    const press = pointer(byTestId("card"), 25, 25);
    press.move(30, 25);
    await settle();
    press.move(x, y);
    await settle();
    if (release) {
        press.release(x, y);
        await settle();
    }
    return press;
}

describe("a drag with no provider", () => {
    it("drops a draggable on a droppable in an unrelated subtree", async () => {
        const onDrop = vi.fn();
        render(Page, { props: { onDrop } });
        placeAll(BOXES);
        const press = await dragCard(150, 50, false);
        expect(byTestId("card").dataset.dndDragging).toBe("");
        expect(byTestId("left").dataset.dndOver).toBe("");
        expect(byTestId("left").dataset.dndActive).toBe("");
        press.release(150, 50);
        await settle();
        expect(onDrop).toHaveBeenCalledWith("left");
        expect(byTestId("card").dataset.dndDragging).toBeUndefined();
        expect(byTestId("left").dataset.dndOver).toBeUndefined();
    });

    it("writes only the allow-listed inline style: translate while dragging, nothing after", async () => {
        render(Page);
        placeAll(BOXES);
        const card = byTestId("card");
        const press = await dragCard(150, 50, false);
        flush();
        expect([...card.style]).toEqual(["translate"]);
        expect(card.style.translate).toBe("125px 25px");
        for (const id of ["left", "right"])
            expect(byTestId(id).getAttribute("style")).toBeNull();
        press.release(150, 50);
        await settle();
        expect(card.getAttribute("style")).toBe("");
    });

    it("marks a refusing droppable and never drops on it", async () => {
        const onDrop = vi.fn();
        render(Page, { props: { onDrop, accepts: ["note"] } });
        placeAll(BOXES);
        const press = await dragCard(150, 50, false);
        const left = byTestId("left");
        expect(left.dataset.dndRefused).toBe("");
        expect(left.dataset.dndOver).toBeUndefined();
        expect(left.dataset.dndActive).toBeUndefined();
        press.release(150, 50);
        expect(onDrop).not.toHaveBeenCalled();
    });

    it("never meets a droppable of another scope", async () => {
        const onDrop = vi.fn();
        render(Page, { props: { onDrop, scope: "other" } });
        placeAll(BOXES);
        await dragCard(150, 50);
        expect(onDrop).not.toHaveBeenCalled();
        await dragCard(350, 50);
        expect(onDrop).toHaveBeenCalledWith("right");
    });

    it("keeps an explicit space isolated from the document's", async () => {
        const space = createDragSpace({ document });
        const onDrop = vi.fn();
        render(
            page(() => [
                h(Draggable, { id: "card", space }, () =>
                    h("div", { "data-testid": "card" }),
                ),
                h(Droppable, { id: "left", onDrop }, () =>
                    h("div", { "data-testid": "left" }),
                ),
                h(Droppable, { id: "right", space, onDrop }, () =>
                    h("div", { "data-testid": "right" }),
                ),
            ]),
        );
        placeAll(BOXES);
        expect(space.get("draggable-ids")).toEqual(["card"]);
        expect(getDragSpace(document).get("draggable-ids")).toEqual([]);
        await dragCard(150, 50);
        expect(onDrop).not.toHaveBeenCalled();
        await dragCard(350, 50);
        expect(onDrop).toHaveBeenCalledTimes(1);
    });

    it("cancels on Escape: no drop, onDragCancel", async () => {
        const onDrop = vi.fn();
        const onDragCancel = vi.fn();
        render(
            page(() => [
                h(Draggable, { id: "card", onDragCancel }, () =>
                    h("div", { "data-testid": "card" }),
                ),
                h(Droppable, { id: "left", onDrop }, () =>
                    h("div", { "data-testid": "left" }),
                ),
            ]),
        );
        placeAll(BOXES);
        const press = await dragCard(150, 50, false);
        key("Escape", document.body);
        press.release(150, 50);
        await settle();
        expect(onDragCancel).toHaveBeenCalledTimes(1);
        expect(onDrop).not.toHaveBeenCalled();
        expect(byTestId("card").dataset.dndDragging).toBeUndefined();
    });

    it("drags by the keyboard from the draggable's tab stop", async () => {
        const onDrop = vi.fn();
        render(Page, { props: { onDrop } });
        placeAll(BOXES);
        byTestId("card").focus();
        key(" ");
        flush();
        await settle();
        for (let i = 0; i < 5; i++) {
            key("ArrowRight");
            flush();
            await settle();
        }
        key("Enter");
        expect(onDrop).toHaveBeenCalledWith("left");
    });
});

describe("a drag handle", () => {
    it("is the only place a drag starts, found through the DOM across components", async () => {
        const onDragStart = vi.fn();
        render(
            page(() =>
                h(Draggable, { id: "card", onDragStart }, () =>
                    h("div", { "data-testid": "card" }, [h(Grip)]),
                ),
            ),
        );
        placeAll({ ...BOXES, grip: { x: 0, y: 0, width: 10, height: 10 } });
        const card = byTestId("card");
        const grip = byTestId("grip");
        expect(card.hasAttribute("tabindex")).toBe(false);
        expect(grip.getAttribute("tabindex")).toBe("0");
        pointer(card, 25, 25).move(80, 25);
        expect(onDragStart).not.toHaveBeenCalled();
        const press = pointer(grip, 5, 5);
        press.move(60, 5);
        await settle();
        expect(onDragStart).toHaveBeenCalledTimes(1);
        expect(grip.dataset.dndDragging).toBe("");
        press.release(60, 5);
        await settle();
        expect(grip.dataset.dndDragging).toBeUndefined();
    });

    it("follows a handle mounted later, and gives the element back when it goes", async () => {
        const grip = ref(false);
        render(
            page(() =>
                h(Draggable, { id: "card" }, () =>
                    h("div", { "data-testid": "card" }, [
                        grip.value
                            ? h(DragHandle, null, () =>
                                  h("span", { "data-testid": "grip" }),
                              )
                            : null,
                    ]),
                ),
            ),
        );
        expect(byTestId("card").getAttribute("tabindex")).toBe("0");
        grip.value = true;
        await settle();
        expect(byTestId("card").hasAttribute("tabindex")).toBe(false);
        expect(byTestId("grip").style.touchAction).toBe("none");
        grip.value = false;
        await settle();
        expect(byTestId("card").getAttribute("tabindex")).toBe("0");
    });
});

describe("the composables' lifecycle", () => {
    it("updates options without re-registering, and reads the latest callback", async () => {
        const calls: string[] = [];
        const label = ref("first");
        const disabled = ref(false);
        const adapter = getDragSpace(document).adapter;
        const register = vi.spyOn(adapter, "register");
        render(
            page(() =>
                h(
                    Draggable,
                    {
                        id: "card",
                        disabled: disabled.value,
                        activation: { distance: 3 },
                        onDragStart: () => calls.push(label.value),
                    },
                    () => h("div", { "data-testid": "card" }),
                ),
            ),
        );
        label.value = "second";
        await settle();
        placeAll(BOXES);
        const press = await dragCard(60, 25, false);
        press.release(60, 25);
        await settle();
        expect(calls).toEqual(["second"]);
        disabled.value = true;
        await settle();
        const card = byTestId("card");
        expect(card.dataset.dndDisabled).toBe("");
        expect(card.getAttribute("aria-disabled")).toBe("true");
        await dragCard(60, 25);
        expect(calls).toEqual(["second"]);
        expect(register).toHaveBeenCalledOnce();
        register.mockRestore();
    });

    it("registers once per mount, unregisters on unmount, and works when mounted again", async () => {
        const space = getDragSpace(document);
        const { wrapper } = render(Page);
        expect(space.get("draggable-ids")).toEqual(["card"]);
        expect(space.get("droppable-ids")).toEqual(["left", "right"]);
        wrapper.unmount();
        expect(space.get("draggable-ids")).toEqual([]);
        expect(space.get("droppable-ids")).toEqual([]);
        const onDrop = vi.fn();
        render(Page, { props: { onDrop } });
        expect(space.get("draggable-ids")).toEqual(["card"]);
        placeAll(BOXES);
        await dragCard(150, 50);
        expect(onDrop).toHaveBeenCalledTimes(1);
    });

    it("updates only the parts whose state changed, and never while moving inside one droppable", async () => {
        const updates: string[] = [];
        render(Page, countUpdates(updates));
        placeAll(BOXES);
        updates.length = 0;
        const press = pointer(byTestId("card"), 25, 25);
        press.move(30, 25);
        await settle();
        // the start: the source, and the droppables now active
        expect(updates.sort()).toEqual(["card", "left", "right"]);
        updates.length = 0;
        press.move(150, 50);
        await settle();
        // entering `left`
        expect(updates).toEqual(["left"]);
        updates.length = 0;
        for (let x = 110; x < 200; x += 10) {
            press.move(x, 50);
            flush();
            await settle();
        }
        expect(updates).toEqual([]);
        press.release(190, 50);
        await settle();
        expect(updates.sort()).toEqual(["card", "left", "right"]);
    });

    it("follows a reactive options object changed in place", async () => {
        const { reactive } = await import("vue");
        const options = reactive({ id: "card", disabled: false });
        const Card = defineComponent({
            setup() {
                const { props } = useDraggable(options);
                return () =>
                    h("div", { ...props.value, "data-testid": "card" });
            },
        });
        render(Card);
        options.disabled = true;
        await settle();
        expect(byTestId("card").dataset.dndDisabled).toBe("");
        placeAll(BOXES);
        const onDragStart = vi.fn();
        getDragSpace(document).subscribe((event) => {
            if (event.type === "drag-start") onDragStart();
        });
        await dragCard(60, 25);
        expect(onDragStart).not.toHaveBeenCalled();
    });

    it("ends with its effect scope: a composable outside a component", () => {
        const element = document.createElement("div");
        document.body.append(element);
        const scope = effectScope();
        scope.run(() => {
            const { props } = useDraggable({ id: "loose" });
            props.value.ref(element);
        });
        expect(getDragSpace(document).get("draggable-ids")).toEqual(["loose"]);
        // a monitor in a scope outside any component sees the drags at once
        const seen: string[] = [];
        scope.run(() => useDragMonitor((event) => seen.push(event.type)));
        place(element, BOXES.card);
        const press = pointer(element, 25, 25);
        press.move(40, 25);
        press.release(40, 25);
        expect(seen).toContain("drag-start");
        scope.stop();
        expect(getDragSpace(document).get("draggable-ids")).toEqual([]);
    });
});

describe("the space from Vue", () => {
    it("vetoes a drop through middleware added with useDragSpace().use", async () => {
        const onDrop = vi.fn();
        render(page(() => [h(Rule), h(Page, { onDrop })]));
        placeAll(BOXES);
        const press = await dragCard(150, 50, false);
        expect(byTestId("left").dataset.dndRefused).toBe("");
        press.release(150, 50);
        expect(onDrop).not.toHaveBeenCalled();
        await dragCard(350, 50);
        expect(onDrop).toHaveBeenCalledWith("right");
    });

    it("tells a monitor of every drag, from its mount to its end", async () => {
        const seen: string[] = [];
        const Monitor = defineComponent({
            setup() {
                useDragMonitor((event) => {
                    if (event.type !== "drag-move") seen.push(event.type);
                });
                return () => null;
            },
        });
        const shown = ref(true);
        render(page(() => [shown.value ? h(Monitor) : null, h(Page)]));
        placeAll(BOXES);
        await dragCard(150, 50);
        expect(seen).toEqual(["drag-start", "drag-over", "drop"]);
        shown.value = false;
        await settle();
        await dragCard(150, 50);
        expect(seen).toHaveLength(3);
    });
});
