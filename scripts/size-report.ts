// From Grid Layout (fragiola/grid-layout, scripts/size-report.ts), same author and licence.
//
// Reports the packages' bundle sizes (D13): every `packages/*/dist/*.js`, raw, gzip and,
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

/** An adapter package whose entries the report sizes, and the framework it leaves out. */
const ADAPTERS = [
    {
        pkg: "react",
        label: "React",
        name: "@fragiola/dnd-react",
        external: /^react(?:-dom)?(?:\/|$)/,
    },
    {
        pkg: "vue",
        label: "Vue",
        name: "@fragiola/dnd-vue",
        external: /^(?:vue|@vue\/[^/]+)(?:\/|$)/,
    },
] as const;

/**
 * What an app ships for an adapter's entries it imports, with the core they pull (D13): each set
 * of entries' every export, bundled from `dist` for production and minified, the framework left
 * out, then gzip.
 */
async function appSizes(
    rolldown: Rolldown,
    adapter: (typeof ADAPTERS)[number],
): Promise<string[]> {
    const dist = join(root, "packages", adapter.pkg, "dist");
    if (!existsSync(dist)) return [];
    const size = async (entries: readonly string[], only?: string) => {
        const code = only
            ? `export { ${only} } from ${JSON.stringify(join(dist, `${entries[0]}.js`))};`
            : entries
                  .map(
                      (name) =>
                          `export * from ${JSON.stringify(join(dist, `${name}.js`))};`,
                  )
                  .join("\n");
        const build = await rolldown.rolldown({
            input: "app",
            cwd: join(root, "packages", adapter.pkg),
            external: adapter.external,
            // an app's production build: the development checks are dropped
            transform: {
                define: {
                    "process.env.NODE_ENV": JSON.stringify("production"),
                },
            },
            plugins: [
                {
                    name: "app",
                    resolveId: (id) => (id === "app" ? id : undefined),
                    load: (id) => (id === "app" ? code : undefined),
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
    for (const [name, part] of [
        ["draggable", "Draggable"],
        ["droppable", "Droppable"],
        ["sortable", "Sortable"],
        ["swappable", "Swappable"],
    ] as const)
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
        for (const name of readdirSync(dist)
            .filter((file) => file.endsWith(".js"))
            .sort()) {
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
    const app: string[] = [];
    for (const adapter of ADAPTERS) {
        const rows = rolldown
            ? await appSizes(rolldown, adapter).catch(() => [])
            : [];
        if (rows.length) app.push(...rows, "");
    }
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
