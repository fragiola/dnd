// From Grid Layout (fragiola/grid-layout, scripts/size-report.ts), same author and licence.
//
// Reports the packages' bundle sizes (D13): every `packages/*/dist/*.js` (and the Angular
// package's `dist/fesm2022/*.mjs`, ng-packagr's), raw, gzip and,
// when the build's own minifier is reachable (rolldown, under tsdown), minified + gzip; and the
// chunks each file imports, so an entry point that pulls a shared chunk shows it. A report, never a
// gate: it prints a markdown table (to `$GITHUB_STEP_SUMMARY` too, in CI) and always exits 0. Run
// after `pnpm build`.
import { appendFileSync, existsSync, readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

const root = join(import.meta.dirname, "..");

type Minify = (filename: string, code: string) => string;

/** rolldown's minifier, through the tsdown a package builds with; `undefined` when not found. */
async function loadMinify(): Promise<Minify | undefined> {
    try {
        const fromPackage = createRequire(
            join(root, "packages", "core", "package.json"),
        );
        const fromTsdown = createRequire(fromPackage.resolve("tsdown"));
        const { minifySync } = (await import(
            fromTsdown.resolve("rolldown/experimental")
        )) as {
            minifySync: (filename: string, code: string) => { code: string };
        };
        return (filename, code) => minifySync(filename, code).code;
    } catch {
        return undefined;
    }
}

const kb = (bytes: number) => `${(bytes / 1024).toFixed(1)} KB`;

/** The chunks a built file imports (`./name.js`), by file name. */
function chunksOf(source: string): string[] {
    return [...source.matchAll(/from\s*["']\.\/([^"']+\.js)["']/g)].map(
        ([, name]) => name ?? "",
    );
}

interface Rolldown {
    rolldown(options: {
        input: string;
        cwd: string;
        external: RegExp;
        transform: { define: Record<string, string> };
        plugins: {
            name: string;
            resolveId(id: string): string | undefined;
            load(id: string): string | undefined;
            transform?(code: string, id: string): Promise<string | undefined>;
        }[];
    }): Promise<{
        generate(options: { format: "esm"; minify: boolean }): Promise<{
            output: { code?: string }[];
        }>;
    }>;
}

/** rolldown, through the tsdown a package builds with; `undefined` when not found. */
async function loadRolldown(): Promise<Rolldown | undefined> {
    try {
        const fromPackage = createRequire(
            join(root, "packages", "react", "package.json"),
        );
        const fromTsdown = createRequire(fromPackage.resolve("tsdown"));
        return (await import(fromTsdown.resolve("rolldown"))) as Rolldown;
    } catch {
        return undefined;
    }
}

/** An Angular app's production build of a library file: the linker and its optimizations. */
type Transform = (code: string, id: string) => Promise<string | undefined>;

/**
 * Angular's own JavaScript transformer, as an app's production build runs it on a library (the
 * Angular CLI and the Analog Vite plugin alike: the linker, and the optimizations that make an
 * unused directive class tree-shakable); `undefined` when it is not installed.
 */
async function loadAngularTransform(): Promise<
    { transform: Transform; close(): Promise<void> } | undefined
> {
    try {
        const fromPackage = createRequire(
            join(root, "packages", "angular", "package.json"),
        );
        const { JavaScriptTransformer } = (await import(
            fromPackage.resolve("@angular/build/private")
        )) as {
            JavaScriptTransformer: new (
                options: {
                    sourcemap: boolean;
                    advancedOptimizations: boolean;
                    jit: boolean;
                },
                cache: undefined,
            ) => {
                transformData(
                    id: string,
                    code: string,
                    options: { sideEffects: () => Promise<boolean> },
                ): Promise<Uint8Array>;
                close(): Promise<void>;
            };
        };
        const transformer = new JavaScriptTransformer(
            { sourcemap: false, advancedOptimizations: true, jit: false },
            undefined,
        );
        const dist = join(root, "packages", "angular", "dist");
        return {
            async transform(code, id) {
                if (!id.startsWith(dist)) return undefined;
                const output = await transformer.transformData(id, code, {
                    sideEffects: async () => false,
                });
                return Buffer.from(output).toString("utf8");
            },
            close: () => transformer.close(),
        };
    } catch {
        return undefined;
    }
}

/** An adapter package whose entries the report sizes, and the framework it leaves out. */
interface Adapter {
    readonly pkg: string;
    readonly label: string;
    readonly name: string;
    readonly external: RegExp;
    /** an entry's built file, in its `dist` (`index` is the main one) */
    readonly file: (entry: string) => string;
    /** the part an app imports alone from each capability entry */
    readonly parts: Readonly<Record<Capability, string>>;
    /** what an app's build does to the package's files first (Angular's linker) */
    readonly transform?: Transform | undefined;
}

type Capability = "draggable" | "droppable" | "sortable" | "swappable";

const PARTS = {
    draggable: "Draggable",
    droppable: "Droppable",
    sortable: "Sortable",
    swappable: "Swappable",
} as const;

const ADAPTERS: readonly Omit<Adapter, "transform">[] = [
    {
        pkg: "react",
        label: "React",
        name: "@fragiola/dnd-react",
        external: /^react(?:-dom)?(?:\/|$)/,
        file: (entry) => `${entry}.js`,
        parts: PARTS,
    },
    {
        pkg: "vue",
        label: "Vue",
        name: "@fragiola/dnd-vue",
        external: /^(?:vue|@vue\/[^/]+)(?:\/|$)/,
        file: (entry) => `${entry}.js`,
        parts: PARTS,
    },
    {
        pkg: "angular",
        label: "Angular",
        name: "@fragiola/dnd-angular",
        external: /^@angular\//,
        // ng-packagr's flat modules: one file per entry, each importing the main one by name
        file: (entry) =>
            `fesm2022/fragiola-dnd-angular${entry === "index" ? "" : `-${entry}`}.mjs`,
        parts: {
            draggable: "DndDraggable",
            droppable: "DndDroppable",
            sortable: "DndSortable",
            swappable: "DndSwappable",
        },
    },
];

/**
 * What an app ships for an adapter's entries it imports, with the core they pull (D13): each set
 * of entries' every export, bundled from `dist` for production and minified, the framework left
 * out, then gzip.
 */
async function appSizes(
    rolldown: Rolldown,
    adapter: Adapter,
): Promise<string[]> {
    const dist = join(root, "packages", adapter.pkg, "dist");
    if (!existsSync(dist)) return [];
    const path = (entry: string) =>
        JSON.stringify(join(dist, adapter.file(entry)));
    const size = async (entries: readonly string[], only?: string) => {
        const code = only
            ? `export { ${only} } from ${path(entries[0] ?? "index")};`
            : entries.map((name) => `export * from ${path(name)};`).join("\n");
        const build = await rolldown.rolldown({
            input: "app",
            cwd: join(root, "packages", adapter.pkg),
            external: adapter.external,
            // an app's production build: the development checks are dropped
            transform: {
                define: {
                    "process.env.NODE_ENV": JSON.stringify("production"),
                    ngDevMode: "false",
                },
            },
            plugins: [
                {
                    name: "app",
                    resolveId: (id) => {
                        if (id === "app") return id;
                        // an entry importing the main one by name (ng-packagr's)
                        if (id === adapter.name)
                            return join(dist, adapter.file("index"));
                        return undefined;
                    },
                    load: (id) => (id === "app" ? code : undefined),
                    ...(adapter.transform
                        ? { transform: adapter.transform }
                        : {}),
                },
            ],
        });
        const { output } = await build.generate({
            format: "esm",
            minify: true,
        });
        return gzipSync(output.map((chunk) => chunk.code ?? "").join("\n"))
            .length;
    };
    const shared = await size(["index"]);
    const rows = [
        `| ${adapter.label} entries imported (with the core) | min + gzip | over the shared entry | target |`,
        "| --- | --- | --- | --- |",
        `| \`${adapter.name}\` | ${kb(shared)} | | ≤ 4 KB |`,
    ];
    for (const [name, target] of [
        ["draggable", "≤ 2 KB extra"],
        ["droppable", "≤ 1.5 KB extra"],
        ["sortable", "≤ 2.5 KB extra"],
        ["swappable", "≤ 1.5 KB extra"],
    ] as const) {
        const both = await size(["index", name]);
        rows.push(
            `| \`${adapter.name}\` + \`/${name}\` | ${kb(both)} | ${kb(both - shared)} | ${target} |`,
        );
    }
    const three = await size(["index", "draggable", "droppable"]);
    rows.push(
        `| the shared entry, \`/draggable\`, \`/droppable\` | ${kb(three)} | ${kb(three - shared)} | |`,
    );
    // what sortable and swappable add on top of the drag machinery the draggable carries
    for (const name of ["sortable", "swappable"] as const) {
        const over = await size(["index", "draggable", "droppable", name]);
        rows.push(
            `| those three + \`/${name}\` | ${kb(over)} | ${kb(over - three)} over those three | |`,
        );
    }
    const all = await size([
        "index",
        "draggable",
        "droppable",
        "sortable",
        "swappable",
    ]);
    rows.push(`| all five | ${kb(all)} | ${kb(all - shared)} | |`);
    // what an app that imports one part ships: the rest of the entries is tree-shaken
    for (const [name, part] of Object.entries(adapter.parts))
        rows.push(`| only \`${part}\` | ${kb(await size([name], part))} | | |`);
    return rows;
}

async function main() {
    const minify = await loadMinify();
    const lines = [
        "| file | raw | gzip | min + gzip | imports |",
        "| --- | --- | --- | --- | --- |",
    ];
    for (const pkg of readdirSync(join(root, "packages"))) {
        const dist = join(root, "packages", pkg, "dist");
        if (!existsSync(dist)) {
            lines.push(`| packages/${pkg} | not built | | | |`);
            continue;
        }
        const files = [
            ...readdirSync(dist).filter((file) => file.endsWith(".js")),
            ...(existsSync(join(dist, "fesm2022"))
                ? readdirSync(join(dist, "fesm2022"))
                      .filter((file) => file.endsWith(".mjs"))
                      .map((file) => `fesm2022/${file}`)
                : []),
        ].sort();
        for (const name of files) {
            const source = readFileSync(join(dist, name), "utf8");
            let minified: string | undefined;
            try {
                minified = minify?.(name, source);
            } catch {
                // a report: a file the minifier cannot take shows n/a
            }
            lines.push(
                `| ${pkg}/${name} | ${kb(Buffer.byteLength(source))} | ${kb(gzipSync(source).length)} | ${minified === undefined ? "n/a" : kb(gzipSync(minified).length)} | ${chunksOf(source).join(", ")} |`,
            );
        }
    }
    const rolldown = await loadRolldown();
    const angular = await loadAngularTransform();
    const app: string[] = [];
    for (const adapter of ADAPTERS) {
        const transform =
            adapter.pkg === "angular" ? angular?.transform : undefined;
        // Angular's files tree-shake only through its own transformer
        if (adapter.pkg === "angular" && !transform) continue;
        const rows = rolldown
            ? await appSizes(rolldown, { ...adapter, transform }).catch(
                  () => [],
              )
            : [];
        if (rows.length) app.push(...rows, "");
    }
    await angular?.close();
    const report = [
        "### Bundle sizes",
        "",
        ...lines,
        "",
        ...app,
        minify
            ? "min + gzip: rolldown's minifier, then gzip (a consumer's bundler gets close to it)."
            : "min + gzip: n/a (rolldown's minifier was not found).",
        "",
    ].join("\n");
    process.stdout.write(report);
    const summary = process.env.GITHUB_STEP_SUMMARY;
    if (summary) appendFileSync(summary, report);
}

// a report, never a gate: whatever fails, the build goes on
await main().catch((error: unknown) => {
    console.error("size report failed:", error);
});
