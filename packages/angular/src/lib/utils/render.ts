// When the app's views catch up with a drag's discrete moments (D8). A zoneless app renders a
// change on its next scheduled pass (a timeout or an animation frame, whichever comes first),
// but the core moves on in the same task: on a drop it clears the preview's `translate` right
// after the app's callbacks, so a frame could paint the old order without its shifts (a jump),
// and a class bound to a part's state would change after the `translate` it styles. So a part's
// state change, and an output the core emits at a start, a target change or an end, render the
// app at once after the task, in a microtask: before any paint, as Vue does. Never on a pointer
// move: those emit no state, and `(dragMove)` / `(dragOver)` are left to Angular's scheduler.
import { ApplicationRef, inject } from "@angular/core";

/** the applications with a render queued */
const queued = new WeakSet<ApplicationRef>();

/** A function that renders the app after the current task (once, however often it is called). */
export function injectRender(): () => void {
    const app = inject(ApplicationRef);
    return () => {
        if (queued.has(app)) return;
        queued.add(app);
        queueMicrotask(() => {
            queued.delete(app);
            if (!app.destroyed) app.tick();
        });
    };
}
