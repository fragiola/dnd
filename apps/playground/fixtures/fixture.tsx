// The unstyled fixture Playwright drives, the same page left-to-right (`basic/`) and right-to-left
// (`rtl/`): the wrappers with no provider (draggables and droppables in unrelated subtrees, no
// common wrapper), scopes, a handle, no-drag controls, a refusing droppable, a middleware veto,
// a `DragOverlay` out of an `overflow: hidden` container, `autoScroll`, the keyboard (step and
// targets) and a render counter. What happened is written to `log` (one line per drop, end and
// cancel), never on a drag's move: a move must commit nothing (D8).
import { autoScroll, DragOverlay, useDragSpace } from "@fragiola/dnd-react";
import { Draggable, DragHandle } from "@fragiola/dnd-react/draggable";
import { Droppable } from "@fragiola/dnd-react/droppable";
import {
    type ComponentProps,
    Profiler,
    type ReactNode,
    StrictMode,
    useEffect,
    useRef,
    useState,
} from "react";
import { createRoot } from "react-dom/client";

const scroll = autoScroll({ threshold: 40, speed: 12 });

/** A drop rule from React, through the document's space: nothing drops on `zone-veto`. */
function Rules() {
    const space = useDragSpace();
    useEffect(
        () =>
            space?.use((ctx, next) =>
                ctx.payload.droppableId === "zone-veto"
                    ? {
                          ok: false,
                          error: { code: "vetoed", message: "Not here." },
                      }
                    : next(),
            ),
        [space],
    );
    return null;
}

/** A labelled box a test finds by its id; it forwards ref and props, as a wrapper needs. */
function Box({
    id,
    className = "box",
    ...props
}: ComponentProps<"div"> & { id: string }) {
    return <div data-testid={id} className={className} {...props} />;
}

function Fixture() {
    const [log, setLog] = useState<string[]>([]);
    const [cardIn, setCardIn] = useState<"home" | "zone-a">("home");
    const [clicks, setClicks] = useState(0);
    const write = (line: string) => setLog((lines) => [...lines, line]);
    const zone = (id: string, scope?: string, accepts?: readonly string[]) => (
        <Droppable
            id={id}
            scope={scope}
            accepts={accepts}
            onDrop={(event) => {
                write(`drop ${event.operation.source.id} on ${id}`);
                if (event.operation.source.id === "card" && id === "zone-a")
                    setCardIn("zone-a");
            }}
        >
            <Box id={id} className="zone">
                {id}
                {id === "zone-a" && cardIn === "zone-a" ? card : null}
            </Box>
        </Droppable>
    );
    const ends = {
        onDragEnd: (event: { operation: { source: { id: unknown } } }) =>
            write(`end ${String(event.operation.source.id)}`),
        onDragCancel: (event: { operation: { source: { id: unknown } } }) =>
            write(`cancel ${String(event.operation.source.id)}`),
    };
    const card = (
        <Draggable id="card" type="task" {...ends}>
            {/* the draggable is the tab stop (the core gives it one); a click is counted */}
            {/* biome-ignore lint/a11y/noStaticElementInteractions: a draggable card */}
            <div
                data-testid="card"
                className="card"
                onClick={() => setClicks((count) => count + 1)}
                onKeyDown={() => {}}
            >
                card
            </div>
        </Draggable>
    );
    return (
        <>
            <Rules />
            {/* the source side: no wrapper is shared with the droppables below */}
            <aside className="row">
                <div>{cardIn === "home" ? card : null}</div>
                <Draggable id="handled" {...ends}>
                    <div data-testid="handled" className="card">
                        <DragHandle>
                            <span data-testid="grip" className="grip">
                                grip
                            </span>
                        </DragHandle>
                        handled
                    </div>
                </Draggable>
                <Draggable id="controls" {...ends}>
                    <div data-testid="controls" className="card wide">
                        <button
                            type="button"
                            data-testid="inner-button"
                            onClick={() => write("inner button")}
                        >
                            button
                        </button>
                        <div data-dnd-no-drag data-testid="no-drag">
                            <button
                                type="button"
                                data-testid="no-drag-button"
                                onClick={() => write("no-drag button")}
                            >
                                no-drag
                            </button>
                            <input data-testid="no-drag-input" />
                        </div>
                    </div>
                </Draggable>
                <Draggable id="alpha-card" scope="alpha" {...ends}>
                    <div data-testid="alpha-card" className="card">
                        alpha
                    </div>
                </Draggable>
            </aside>
            <p>
                clicks <output data-testid="clicks">{clicks}</output>, commits{" "}
                <output data-testid="commits" />
            </p>
            {/* the target side, elsewhere in the tree */}
            <main className="row">
                {zone("zone-a")}
                {zone("zone-refuse", undefined, ["note"])}
                {zone("zone-veto")}
                {zone("alpha-zone", "alpha")}
                {zone("beta-zone", "beta")}
            </main>
            <section className="row">
                <div data-testid="clip" className="clip">
                    <Draggable
                        id="clipped"
                        scope="overlay"
                        translate={false}
                        {...ends}
                    >
                        <div data-testid="clipped" className="card">
                            clipped
                        </div>
                    </Draggable>
                </div>
                {zone("overlay-zone", "overlay")}
                <DragOverlay scope="overlay">
                    {(operation) => (
                        <div data-testid="ghost">
                            {String(operation.source.id)}
                        </div>
                    )}
                </DragOverlay>
            </section>
            <section className="row">
                <div data-testid="scroller" className="scroller">
                    <Draggable
                        id="scroll-card"
                        scope="scroll"
                        autoScroll={scroll}
                        {...ends}
                    >
                        <div data-testid="scroll-card" className="card">
                            scroll
                        </div>
                    </Draggable>
                    <div className="spacer" />
                    {zone("deep", "scroll")}
                </div>
            </section>
            <section className="row">
                <Draggable id="key-step" scope="keys" {...ends}>
                    <div data-testid="key-step" className="card">
                        step
                    </div>
                </Draggable>
                <Draggable
                    id="key-targets"
                    scope="keys"
                    keyboard={{ mode: "targets" }}
                    {...ends}
                >
                    <div data-testid="key-targets" className="card">
                        targets
                    </div>
                </Draggable>
                {zone("key-1", "keys")}
                {zone("key-2", "keys")}
                {zone("key-3", "keys")}
            </section>
            <ol data-testid="log">
                {log.map((line, index) => (
                    // the log only grows
                    // biome-ignore lint/suspicious/noArrayIndexKey: append-only
                    <li key={index}>{line}</li>
                ))}
            </ol>
        </>
    );
}

/** The React commits so far, written outside React (a render would be a commit). */
function Counted({ children }: { children: ReactNode }) {
    const commits = useRef(0);
    return (
        <Profiler
            id="fixture"
            onRender={() => {
                commits.current += 1;
                const output = document.querySelector(
                    '[data-testid="commits"]',
                );
                if (output) output.textContent = String(commits.current);
            }}
        >
            {children}
        </Profiler>
    );
}

/** Mounts the fixture; the page's `<html dir>` sets the direction. */
export function mountFixture(): void {
    // which pointer pressed last: a test cancels or releases its capture by id
    document.addEventListener(
        "pointerdown",
        (event) => {
            document.body.dataset.pointerId = String(event.pointerId);
        },
        { capture: true },
    );
    const root = document.getElementById("root");
    if (!root) throw new Error("no #root");
    createRoot(root).render(
        <StrictMode>
            <Counted>
                <Fixture />
            </Counted>
        </StrictMode>,
    );
}
