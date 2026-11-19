import "@angular/compiler";
import "@testing-library/jest-dom/vitest";
import { setupTestBed } from "@analogjs/vitest-angular/setup-testbed";

// zoneless, as an Angular 22 app is by default; every fixture is destroyed after its test, and
// the core's harness (imported through ./helpers) empties the document. A server test (the node
// environment) renders with @angular/platform-server instead, no test bed.
if (typeof document !== "undefined")
    setupTestBed({
        zoneless: true,
        errorOnUnknownElements: true,
        errorOnUnknownProperties: true,
    });
