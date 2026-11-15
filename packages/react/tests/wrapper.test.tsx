import { render, screen } from "@testing-library/react";
import * as React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Draggable, DragHandle } from "../src/draggable";
import { Droppable } from "../src/droppable";
import { pointer } from "./helpers";

// The wrapper contract (D6, D7): a wrapper renders exactly its child's element, with its props,
// ref and handlers merged in, or its `render`; anything else throws in development.

/**
 * The shape of every Fragiola primitive (`Dockable.Tab`): its own data-*, its own handler first,
 * then the consumer's, and the ref forwarded with the other props.
 */
function Tab(
    props: React.ButtonHTMLAttributes<HTMLButtonElement> & {
        ref?: React.Ref<HTMLButtonElement>;
        onOwn: () => void;
    },
) {
    const { onClick, onOwn, ...rest } = props;
    return (
        <button
            type="button"
            role="tab"
            data-layout-path="/ts0/t0"
            data-selected=""
            {...rest}
            onClick={(event) => {
                onOwn();
                onClick?.(event);
            }}
        />
    );
}

/** A component that takes a ref and drops it. */
function Swallows(_props: { ref?: React.Ref<HTMLElement> }) {
    return <div />;
}

afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
});

describe("the wrappers render no element of their own", () => {
    it("renders exactly the child's element for Draggable, Droppable and DragHandle", () => {
        const { container } = render(
            <ul>
                <Draggable id="a">
                    <li className="card" data-x="1">
                        <DragHandle>
                            <span>grip</span>
                        </DragHandle>
                        A
                    </li>
                </Draggable>
                <Droppable id="z">
                    <section aria-label="Zone" />
                </Droppable>
            </ul>,
        );
        expect(container.innerHTML).toBe(
            '<ul><li class="card" data-x="1" data-dnd-part="draggable" data-dnd-id="a"><span data-dnd-part="handle" data-dnd-handle="" tabindex="0" style="touch-action: none;">grip</span>A</li><section aria-label="Zone" data-dnd-part="droppable" data-dnd-id="z"></section></ul>',
        );
    });

    it("gives a non-focusable draggable a tab stop, and leaves a button's alone", () => {
        render(
            <>
                <Draggable id="a">
                    <div data-testid="a" />
                </Draggable>
                <Draggable id="b">
                    <button type="button" data-testid="b" />
                </Draggable>
            </>,
        );
        expect(screen.getByTestId("a").getAttribute("tabindex")).toBe("0");
        expect(screen.getByTestId("b").hasAttribute("tabindex")).toBe(false);
    });

    it("renders `render` instead of a child: an element, or a function of the state", () => {
        const { container } = render(
            <>
                <Draggable id="a" render={<li className="own" />}>
                    A
                </Draggable>
                <Droppable
                    id="z"
                    className="zone"
                    render={(props, state) => (
                        <section {...props} data-over={String(state.over)} />
                    )}
                >
                    Z
                </Droppable>
            </>,
        );
        expect(container.innerHTML).toBe(
            '<li class="own" data-dnd-part="draggable" data-dnd-id="a" tabindex="0">A</li><section data-dnd-part="droppable" data-dnd-id="z" class="zone" data-over="false">Z</section>',
        );
    });
});

describe("the merge", () => {
    it("keeps the child's ref, handlers, className and style; the wrapper's handlers run first", () => {
        const calls: string[] = [];
        const childRef = React.createRef<HTMLDivElement>();
        const wrapperRef = vi.fn();
        render(
            <Draggable
                id="a"
                ref={wrapperRef}
                className={(state) => (state.dragging ? "on" : "off")}
                style={{ color: "red" }}
            >
                <div
                    data-testid="a"
                    ref={childRef}
                    className="child"
                    style={{ color: "blue", margin: 2 }}
                    onPointerDown={(event) =>
                        calls.push(
                            `child ${event.defaultPrevented ? "after the claim" : "before"}`,
                        )
                    }
                />
            </Draggable>,
        );
        const element = screen.getByTestId("a");
        expect(childRef.current).toBe(element);
        expect(wrapperRef).toHaveBeenCalledWith(element);
        expect(element.className).toBe("child off");
        // the wrapper's style over the child's
        expect(element.getAttribute("style")).toBe("color: red; margin: 2px;");
        // the core's own listener is on the element; React's runs at the root, after it
        pointer(element, 1, 1).release(1, 1);
        expect(calls).toEqual(["child after the claim"]);
    });

    it("composes the handlers of a `render` element after its own props", () => {
        const onClick = vi.fn();
        render(
            <Draggable
                id="a"
                render={
                    <button type="button" data-testid="a" onClick={onClick} />
                }
            >
                A
            </Draggable>,
        );
        screen.getByTestId("a").click();
        expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("keeps both sets of attributes and handlers on a primitive that forwards ref and props", () => {
        const own = vi.fn();
        const consumer = vi.fn();
        render(
            <Droppable id="z">
                <Draggable id="a">
                    <Tab onOwn={own} onClick={consumer}>
                        Tab
                    </Tab>
                </Draggable>
            </Droppable>,
        );
        const tab = screen.getByRole("tab");
        expect(tab.dataset).toMatchObject({
            layoutPath: "/ts0/t0",
            selected: "",
            // both wrappers' parts stack on the one element; the inner one's id wins
            dndPart: "draggable droppable",
            dndId: "a",
        });
        tab.click();
        expect(own).toHaveBeenCalledTimes(1);
        expect(consumer).toHaveBeenCalledTimes(1);
    });

    it("wraps a wrapper: a Draggable that is also a Droppable", () => {
        render(
            <Droppable id="z" className="zone">
                <Draggable id="a" className="card">
                    <div data-testid="both" />
                </Draggable>
            </Droppable>,
        );
        const element = screen.getByTestId("both");
        expect(element.className).toBe("card zone");
        expect(element.dataset.dndPart).toBe("draggable droppable");
        expect(element.dataset.dndId).toBe("a");
    });
});

describe("development errors", () => {
    const invalid: [string, React.ReactNode, RegExp][] = [
        ["no child", undefined, /got no child/],
        [
            "several children",
            [<i key="1" />, <i key="2" />],
            /got several children/,
        ],
        [
            "a fragment",
            React.createElement(React.Fragment, { key: "f" }),
            /got a Fragment/,
        ],
        ["a string", "text", /got text/],
        ["a number", 42, /got text/],
    ];

    it.each(invalid)("throws for %s", (_name, children, message) => {
        vi.spyOn(console, "error").mockImplementation(() => {});
        expect(() => render(<Draggable id="a">{children}</Draggable>)).toThrow(
            message,
        );
        expect(() => render(<Droppable id="z">{children}</Droppable>)).toThrow(
            message,
        );
    });

    it("reports a child that never attaches the ref", () => {
        const error = vi.spyOn(console, "error").mockImplementation(() => {});
        render(
            <Draggable id="a">
                <Swallows />
            </Draggable>,
        );
        expect(error).toHaveBeenCalledWith(
            expect.stringContaining("never received the ref"),
        );
    });

    it("reports a handle outside a draggable", () => {
        const error = vi.spyOn(console, "error").mockImplementation(() => {});
        render(
            <DragHandle>
                <span />
            </DragHandle>,
        );
        expect(error).toHaveBeenCalledWith(
            expect.stringContaining("not inside a draggable"),
        );
    });

    it("never throws nor reports in production: an invalid child renders as it is", () => {
        vi.stubEnv("NODE_ENV", "production");
        const error = vi.spyOn(console, "error");
        const { container } = render(
            <>
                <Draggable id="a">text</Draggable>
                <Droppable id="z">
                    {React.createElement(React.Fragment, null, <b />)}
                </Droppable>
                <Draggable id="b">
                    <Swallows />
                </Draggable>
                <DragHandle>
                    <span />
                </DragHandle>
            </>,
        );
        expect(container.innerHTML).toBe(
            'text<b></b><div></div><span data-dnd-part="handle" data-dnd-handle=""></span>',
        );
        expect(error).not.toHaveBeenCalled();
    });
});
