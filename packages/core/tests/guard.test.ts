// From Grid Layout (fragiola/grid-layout, packages/core/tests/guard.test.ts), same author and licence.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { describe, expect, it } from "vitest";

// The architecture rules a code review would miss (AGENTS.md, D2, D3 and D5): the core has no
// dependencies, never imports React, never touches the browser globals, exports no `any`, a
// capability never imports another capability, and every file derived from a reference project
// says so.

const root = join(import.meta.dirname, "..");
const src = join(root, "src");
const packages = join(root, "..");

function listFiles(dir: string): string[] {
    if (!existsSync(dir)) return [];
    return readdirSync(dir).flatMap((name) => {
        const path = join(dir, name);
        return statSync(path).isDirectory() ? listFiles(path) : [path];
    });
}

/** Source text with comments and string literals blanked out, so only code is scanned. */
function codeOnly(source: string): string {
    return source.replace(
        /\/\*[\s\S]*?\*\/|\/\/[^\n]*|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`/g,
        (match) => (match.startsWith("/") ? "" : '""'),
    );
}

// the core never reaches for the browser globals: DOM access goes through an element's
// ownerDocument/defaultView, so the core loads in Node and a drag runs in any document (a popout)
const GLOBAL_DOM =
    /(?<![.\w$])(document|window|requestAnimationFrame|cancelAnimationFrame|getComputedStyle|navigator|localStorage|sessionStorage|ResizeObserver|crypto)\b(?!\s*:)/;

const IMPORT_REACT =
    /(?:from\s+|import\s+|import\s*\(\s*|require\s*\(\s*)["'](?:react|react-dom)(?:\/[^"']*)?["']/;

/**
 * The capabilities (D3): each is its own entry and its own folder, `src/<capability>/`, in both
 * packages. A capability imports only the shared core, never another capability. The ones the
 * next Epic adds are listed already, so the rule holds the day their folders appear.
 */
const CAPABILITIES = [
    "draggable",
    "droppable",
    "sortable",
    "swappable",
] as const;

// static imports, re-exports and dynamic imports: the specifier of each
const SPECIFIER =
    /(?:^|[\s;])(?:import|export)\s+(?:type\s+)?(?:[^'"]*?\s+from\s+)?["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/gm;

/** The module specifiers a source file imports. */
function importsOf(source: string): string[] {
    const found: string[] = [];
    // comments only: the specifiers are string literals, so they must stay
    const code = source.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, "");
    for (const match of code.matchAll(SPECIFIER)) {
        const specifier = match[1] ?? match[2];
        if (specifier) found.push(specifier);
    }
    return found;
}

/** The capability a file belongs to: the first folder under its package's `src/`, if it is one. */
function capabilityOf(file: string, pkgSrc: string): string | undefined {
    const [first] = relative(pkgSrc, file).split(sep);
    return CAPABILITIES.find((capability) => capability === first);
}

/**
 * The capability a specifier reaches, from a file of a package whose sources are `pkgSrc`: a
 * relative path into `src/<capability>/`, or a package subpath (`@fragiola/dnd/<capability>`,
 * `@fragiola/dnd-react/<capability>`).
 */
function capabilityImported(
    specifier: string,
    file: string,
    pkgSrc: string,
): string | undefined {
    if (specifier.startsWith(".")) {
        const target = resolve(dirname(file), specifier);
        if (!target.startsWith(pkgSrc + sep)) return undefined;
        return capabilityOf(target, pkgSrc);
    }
    const subpath = /^@fragiola\/dnd(?:-react)?\/([^/]+)/.exec(specifier)?.[1];
    return CAPABILITIES.find((capability) => capability === subpath);
}

/**
 * The imports of a package's sources that cross from one capability to another, and those of
 * the shared core (any file outside a capability folder) that reach a capability at all.
 */
function capabilityCrossings(pkgSrc: string): string[] {
    return listFiles(pkgSrc).flatMap((file) => {
        const own = capabilityOf(file, pkgSrc);
        return importsOf(readFileSync(file, "utf8")).flatMap((specifier) => {
            const reached = capabilityImported(specifier, file, pkgSrc);
            if (!reached) return [];
            // a capability's own files may import each other; the core's capability entry is the
            // one place the React capability reaches (`@fragiola/dnd/draggable` from `draggable/`)
            if (own === reached) return [];
            return [
                `${relative(packages, file)} (${own ?? "shared core"}) imports "${specifier}" (${reached})`,
            ];
        });
    });
}

/**
 * The files derived from a reference project (D2), each with the project it comes from. A file
 * here starts with a line comment naming the project, its copyright and the MIT licence, and the
 * root LICENSE carries that project's notice. Empty until the first derived file lands (a
 * collision strategy or the keyboard coordinates, from dnd-kit).
 */
const DERIVED: {
    file: string;
    from: string;
    /** who else the header credits: the authors of the upstream pull requests it builds on */
    credits?: readonly string[];
}[] = [];

/**
 * What a derived file's header and the root LICENSE must name, per reference project. dnd-kit's
 * notice ("Copyright (c) 2021, Claudéric Demers") joins when the first derived file lands.
 */
const NOTICES: Record<string, readonly string[]> = {};

/**
 * The exported declarations of a source (comments and strings already blanked): each `export`
 * statement up to its end (the first `;` or blank-line-terminated block at column 0).
 */
function exportedDeclarations(source: string): string[] {
    const declarations: string[] = [];
    const lines = source.split("\n");
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i] ?? "";
        if (!line.startsWith("export ")) continue;
        const block = [line];
        // a multi-line declaration runs until a line closing it at column 0
        if (!/;\s*$/.test(line) && !/^export \{.*\}.*;?$/.test(line)) {
            for (let j = i + 1; j < lines.length; j++) {
                const next = lines[j] ?? "";
                block.push(next);
                if (/^[}\]);]/.test(next)) break;
            }
        }
        declarations.push(block.join("\n"));
    }
    return declarations;
}

/** The leading line comments of a file, joined into one sentence. */
function header(file: string): string {
    return (
        /^(?:\/\/[^\n]*\n)+/.exec(readFileSync(file, "utf8"))?.[0] ?? ""
    ).replace(/\s*\n\/\/\s*|\s+/g, " ");
}

describe("core package guard", () => {
    it("has no runtime or peer dependencies", () => {
        const pkg = JSON.parse(
            readFileSync(join(root, "package.json"), "utf8"),
        ) as Record<string, unknown>;
        expect(pkg.dependencies ?? {}).toEqual({});
        expect(pkg.peerDependencies ?? {}).toEqual({});
    });

    it("never imports react or react-dom", () => {
        const offenders = listFiles(src).filter((file) =>
            IMPORT_REACT.test(readFileSync(file, "utf8")),
        );
        expect(offenders).toEqual([]);
    });

    it("never touches global document, window, crypto, observers or frame scheduling", () => {
        const offenders = listFiles(src).flatMap((file) => {
            const match = GLOBAL_DOM.exec(codeOnly(readFileSync(file, "utf8")));
            return match ? [`${file}: ${match[0]}`] : [];
        });
        expect(offenders).toEqual([]);
    });

    it("has no `any` in its exported declarations", () => {
        const offenders = listFiles(src).flatMap((file) =>
            exportedDeclarations(codeOnly(readFileSync(file, "utf8")))
                .filter((declaration) => /\bany\b/.test(declaration))
                .map((declaration) => `${file}: ${declaration.slice(0, 80)}`),
        );
        expect(offenders).toEqual([]);
    });

    it("never lets a capability import another, nor the shared core import a capability (D3)", () => {
        for (const pkg of ["core", "react"]) {
            expect(
                capabilityCrossings(join(packages, pkg, "src")),
                pkg,
            ).toEqual([]);
        }
    });

    it("has an entry per capability folder, in both packages and both export maps (D3)", () => {
        // the core also has its adapter-only entry (`src/adapter.ts`), which no adapter re-exports
        const extra: Record<string, readonly string[]> = {
            core: ["adapter"],
            react: [],
        };
        for (const pkg of ["core", "react"]) {
            const manifest = JSON.parse(
                readFileSync(join(packages, pkg, "package.json"), "utf8"),
            ) as {
                exports: Record<string, unknown>;
                publishConfig: { exports: Record<string, unknown> };
                sideEffects: unknown;
            };
            const folders = [
                ...CAPABILITIES.filter((capability) =>
                    existsSync(
                        join(packages, pkg, "src", capability, "index.ts"),
                    ),
                ),
                ...(extra[pkg] ?? []),
            ];
            const subpaths = (map: Record<string, unknown>) =>
                Object.keys(map)
                    .filter((key) => key !== "." && key !== "./package.json")
                    .map((key) => key.slice(2))
                    .sort();
            expect(subpaths(manifest.exports), pkg).toEqual(
                [...folders].sort(),
            );
            expect(subpaths(manifest.publishConfig.exports), pkg).toEqual(
                [...folders].sort(),
            );
            // the published map never carries the source condition
            expect(
                JSON.stringify(manifest.publishConfig.exports),
                pkg,
            ).not.toContain("@fragiola/source");
            expect(manifest.sideEffects, pkg).toBe(false);
        }
    });

    it("every derived file names its source project, copyright and the MIT licence", () => {
        const missing = DERIVED.filter(({ file, from, credits = [] }) => {
            const path = join(root, file);
            if (!existsSync(path)) return true;
            const head = header(path);
            return !(
                head.includes(from) &&
                head.includes("MIT") &&
                (NOTICES[from] ?? []).every((line) => head.includes(line)) &&
                credits.every((credit) => head.includes(credit))
            );
        });
        expect(missing).toEqual([]);
        for (const { from } of DERIVED) {
            expect(Object.keys(NOTICES), from).toContain(from);
        }
    });

    it("ships the root licence in each package, with the notice of every project code derives from", () => {
        const rootLicence = readFileSync(
            join(root, "..", "..", "LICENSE"),
            "utf8",
        );
        for (const lines of Object.values(NOTICES)) {
            for (const line of lines) {
                expect(rootLicence).toContain(line);
            }
        }
        for (const pkg of ["core", "react"]) {
            expect(readFileSync(join(packages, pkg, "LICENSE"), "utf8")).toBe(
                rootLicence,
            );
        }
    });

    it("keeps the drag space's surface exact: the five verbs, use, subscribe and adapter", async () => {
        const { createDragSpace } = await import("../src");
        // the space touches its document only in a drag: a stand-in is enough here
        const space = createDragSpace({ document: {} as Document });
        expect(Object.keys(space).sort()).toEqual(
            [
                "adapter",
                "can",
                "check",
                "get",
                "is",
                "run",
                "subscribe",
                "use",
            ].sort(),
        );
        expect(Object.keys(space.adapter)).toEqual(["register"]);
    });

    it("keeps the adapter decisions in the core: the React adapter re-implements none, nor re-exports them", () => {
        // the handle link, the state slot, the option-change rule and the overlay's following
        // live in `@fragiola/dnd/adapter`; an adapter only renders and wires (main had them in
        // `packages/react/src/utils/handles.ts` and `useCoreState.ts`)
        const DECISIONS =
            /function (createSlot|shallowEqual|optionsChanged|same|addOwner|addHandle|handleIn)\b|\.closest\(/;
        const reactSrc = join(packages, "react", "src");
        const copies = listFiles(reactSrc).flatMap((file) => {
            const source = readFileSync(file, "utf8");
            const match =
                DECISIONS.exec(codeOnly(source)) ??
                /data-dnd-part~=/.exec(source);
            return match ? [`${relative(packages, file)}: ${match[0]}`] : [];
        });
        expect(copies).toEqual([]);
        const reexported = listFiles(reactSrc).filter((file) =>
            /export\s+\*\s+from\s+["']@fragiola\/dnd\/adapter["']/.test(
                readFileSync(file, "utf8"),
            ),
        );
        expect(reexported).toEqual([]);
    });

    it("ships no CSS: styling is 100% the app's (D7)", () => {
        const css = ["core", "react"].flatMap((pkg) =>
            listFiles(join(packages, pkg, "src")).filter((file) =>
                /\.(css|scss|less)$/.test(file),
            ),
        );
        expect(css).toEqual([]);
    });

    // the detectors themselves
    it("detects global DOM access in code but not in comments, strings or parameters", () => {
        const found = (code: string) => GLOBAL_DOM.test(codeOnly(code));
        expect(found("const el = document.createElement('div');")).toBe(true);
        expect(found("requestAnimationFrame(() => {});")).toBe(true);
        expect(found("new ResizeObserver(cb);")).toBe(true);
        expect(
            found("el.ownerDocument.defaultView.requestAnimationFrame(cb);"),
        ).toBe(false);
        expect(found("view.ResizeObserver")).toBe(false);
        expect(found("crypto.randomUUID()")).toBe(true);
        expect(found("host?.crypto?.randomUUID?.()")).toBe(false);
        expect(found('// the window\nif (type === "window") {}')).toBe(false);
        expect(found("function f(window: Window) {}")).toBe(false);
    });

    it("detects a react import and an exported any", () => {
        expect(IMPORT_REACT.test('import type * as React from "react";')).toBe(
            true,
        );
        expect(IMPORT_REACT.test('import "react-dom/client";')).toBe(true);
        expect(IMPORT_REACT.test('import { x } from "./reactive";')).toBe(
            false,
        );
        expect(
            exportedDeclarations("export type X = any;\nconst y: any = 1;"),
        ).toEqual(["export type X = any;"]);
    });

    it("detects an import from one capability into another, and lets the core be imported", () => {
        const coreSrc = join(packages, "core", "src");
        const from = (folder: string) => join(coreSrc, folder, "index.ts");
        const reach = (specifier: string, folder: string) =>
            capabilityImported(specifier, from(folder), coreSrc);
        expect(reach("../droppable/collide", "draggable")).toBe("droppable");
        expect(reach("../sortable", "draggable")).toBe("sortable");
        expect(reach("@fragiola/dnd/droppable", "draggable")).toBe("droppable");
        expect(reach("@fragiola/dnd-react/swappable", "core")).toBe(
            "swappable",
        );
        expect(reach("../core/space", "draggable")).toBeUndefined();
        expect(reach("@fragiola/dnd", "draggable")).toBeUndefined();
        expect(reach("./sensor", "draggable")).toBe("draggable");
        expect(
            importsOf(
                'import { a } from "../droppable";\nexport * from "./b";\n// import "../sortable";\nconst c = import("../swappable");',
            ),
        ).toEqual(["../droppable", "./b", "../swappable"]);
    });
});
