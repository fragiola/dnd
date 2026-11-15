// What every fixture page shares: StrictMode, the React commits counted outside React (a render
// would be a commit) into `[data-testid="commits"]`, and the id of the last pointer pressed (a test
// cancels or releases its capture by id).
import { Profiler, type ReactNode, StrictMode, useRef } from "react";
import { createRoot } from "react-dom/client";

/** The React commits so far, written outside React. */
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

/** Mounts a fixture page into `#root`, under StrictMode and the commit counter. */
export function mount(page: ReactNode): void {
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
            <Counted>{page}</Counted>
        </StrictMode>,
    );
}
