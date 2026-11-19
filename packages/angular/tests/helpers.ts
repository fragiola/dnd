// The Angular tests' setup: the core's harness (faked frames and pointer capture, the pointer and
// key helpers) and the boxes jsdom cannot lay out, shared with the React and Vue tests, plus
// rendering a component into the document and waiting for Angular.
import { ApplicationRef, type Type } from "@angular/core";
import { type ComponentFixture, TestBed } from "@angular/core/testing";

export {
    type Box,
    flush,
    key,
    place,
    placeAll,
    pointer,
} from "../../react/tests/helpers";

/** Renders `component` into the document's body (the drag space is the document's) and waits. */
export async function render<T>(
    component: Type<T>,
    inputs: Record<string, unknown> = {},
): Promise<ComponentFixture<T>> {
    const fixture = TestBed.createComponent(component);
    for (const [name, value] of Object.entries(inputs))
        fixture.componentRef.setInput(name, value);
    const host = fixture.nativeElement as HTMLElement;
    if (!host.isConnected) document.body.append(host);
    await fixture.whenStable();
    return fixture;
}

/** The element of a test id; throws when there is none. */
export function byTestId(id: string): HTMLElement {
    const element = document.querySelector<HTMLElement>(
        `[data-testid="${id}"]`,
    );
    if (!element) throw new Error(`no [data-testid="${id}"]`);
    return element;
}

/** Waits for Angular to apply what the last events scheduled (a change detection, if any). */
export async function settle(): Promise<void> {
    await TestBed.inject(ApplicationRef).whenStable();
}
