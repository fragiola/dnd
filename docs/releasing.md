# Releasing

Adapted from Dockable's runbook (`../dockable/docs/releasing.md`): the same workflow, the same
steps, this repository's names.

Releasing is a merge. [Changesets](https://changesets.dev) versions every package under
`packages/` (`@fragiola/dnd`, `@fragiola/dnd-react`, `@fragiola/dnd-vue` and
`@fragiola/dnd-angular`) together (one `fixed` group, `@fragiola/*`, so they always share a
version) and writes their changelogs. The release workflow,
[`.github/workflows/release.yml`](../.github/workflows/release.yml), publishes them with pnpm
through npm **trusted publishing** (OIDC, with provenance): there is no npm token anywhere.

On every push to `main` the workflow does one of three things:

- **changesets are pending:** it opens or updates the **Version Packages** PR, which bumps the
  versions, writes the `CHANGELOG.md` files and deletes the changesets;
- **no changeset, and `main`'s version is not on npm** (the Version Packages PR was just merged):
  it builds the packages, packs them with pnpm, checks those tarballs
  (`scripts/check-package.ts --tarballs`), publishes them from the `npm` environment, then pushes
  the git tags (`@fragiola/dnd@0.1.0`, …) and creates the GitHub releases;
- otherwise nothing.

Packing and publishing always go through pnpm: it applies `publishConfig`, npm does not. Never
publish with `npm publish`. For the core, React and Vue, `publishConfig.exports` holds the
dist-only `exports`. The Angular package is published from its build output: ng-packagr builds it
into `packages/angular/dist`, `scripts/publish-manifest.ts` writes `dist/package.json` there, and
`publishConfig.directory` (`dist`, with `linkDirectory: false`) makes pnpm pack and publish that
directory, with that manifest (its `exports` without the source condition and `./dist/`, its core
dependency `workspace:*` replaced by the exact version). So the Angular package must be built
before it is packed or published, which `pnpm build` does.

## The first release (0.1.0)

npm can only trust a publisher for a package that already exists, so the first publish is a manual
`0.0.0` stub. Do these steps in order, once. Steps 1 to 5 come **before** merging the PR that adds
this runbook (the release PR): its merge starts the release.

1. **The scope.** The npm scope `@fragiola` already exists (Dockable publishes there). Make sure
   your npm account can publish to it (`npm org ls fragiola`) and has 2FA enabled.

2. **Let the workflow open PRs.** In this repository's _Settings → Actions → General → Workflow
   permissions_, enable **Allow GitHub Actions to create and approve pull requests** (the
   organization already allows it for Dockable and Grid Layout). Without it, the workflow cannot
   open the Version Packages PR.

3. **The `npm` environment.** In the repository's _Settings → Environments_, create an environment
   named exactly `npm`. Under _Deployment branches and tags_, choose _Selected branches and tags_
   and add the rule `main`. The publish job runs in this environment, and npm will trust only a
   run of `release.yml` in it.

4. **The stubs.** One `0.0.0` stub for each of the four packages (`@fragiola/dnd`,
   `@fragiola/dnd-react`, `@fragiola/dnd-vue`, `@fragiola/dnd-angular`). From a clean checkout of
   `main` (without the release PR), with every package at `0.0.0`:

   ```sh
   git switch main && git pull && git status   # clean, up to date
   pnpm install --frozen-lockfile
   pnpm build && pnpm --filter "./packages/*" publish --access public
   ```

   pnpm asks for your 2FA code. It publishes the core first, then the three adapters, each of which
   depends on the core at exactly `0.0.0`. The Angular stub is published from
   `packages/angular/dist` (`publishConfig.directory`), with the manifest `pnpm build` wrote there:
   its files are `fesm2022/*.mjs` and `types/*.d.ts`, with no `dist/` prefix.
   `pnpm --filter "./packages/*" publish --access public --dry-run` shows what would be published
   (add `--json` to list each package's files).

5. **The trusted publishers.** With npm 11.15 or later (`npm --version`) and your account's 2FA:

   ```sh
   for p in dnd dnd-react dnd-vue dnd-angular; do
     npm trust github @fragiola/$p --file release.yml --repo fragiola/dnd --environment npm --allow-publish
   done
   ```

   `--allow-publish` is required: since 2026-09-03 a trusted publisher only gets staged publishing
   unless `npm publish` is allowed explicitly, and Changesets does not do staged publishing.
   `npm trust list <package>` shows the configuration. Never rename `release.yml` or its `npm`
   environment.

6. **Merge the release PR.** Its push to `main` runs the release workflow, which opens the
   **Version Packages** PR (`changeset-release/main`): the four packages at `0.1.0`, their four
   changelogs.

7. **Merge the Version Packages PR.** A PR opened with the workflow's token starts no other
   workflow, so CI does not run on it by itself: close and reopen the PR (or run _CI_ on its
   branch from the Actions tab) to get the checks, then merge it. The release workflow publishes
   `0.1.0` with provenance. Merge nothing else until that run is over. Then check the four
   packages on npm (`0.1.0` is `latest`, with provenance), the four tags and the four GitHub
   releases. The
   registry can take a minute or two to show a new version after the run says "Successfully
   published"; a version stuck in staged publishing shows in `npm stage list @fragiola/<package>`.

8. **Lock it down.** On npm, for each package, _Settings → Publishing access_: **Require
   two-factor authentication and disallow tokens**.

## Later releases, new packages, failures

Exactly as in Dockable's runbook (`../dockable/docs/releasing.md`, sections _Later releases_,
_Adding a package_, _While a release runs_ and _When a publish fails_), with this repository's
names: `pnpm changeset` in every PR that changes what a package ships; while DnD is `0.x`, a
breaking change is a `minor`, anything else a `patch`; a new package needs its `0.0.0` stub, its
`npm trust` and its entry in `ADAPTERS` (`scripts/check-package.ts`) before its first release (a
package published from its build output, as the Angular one, is built before its stub is
published).
