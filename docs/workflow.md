# Workflow — publishing and consuming @williamphelps13/ui

The maintainer publish loop and the consumer update loop, plus the local-test loop that verifies a change before it ships.

## Publishing a change

1. Branch off `main`, make the change, add a changeset — `pnpm changeset`, pick the bump (minor for an additive prop or variant, patch for a fix), write a one-line consumer-facing summary
2. Run the gate suite locally (CLAUDE.md § "Common commands")
3. Verify in a real consumer with the local-test loop below
4. Open a PR — CI runs `correctness` then `chromatic`; accept any new Chromatic snapshots in the Chromatic UI (new stories flag as baseline changes)
5. Merge the PR to `main` — this triggers `release.yml`, which opens a "Version Packages" PR
6. Merge the Version Packages PR — this publishes to npm

Steps 5 and 6 are two separate merges. The first lands your source change and a Changeset-authored version bump PR; the second consumes the changeset, bumps `package.json` + `CHANGELOG.md`, and publishes.

## Local-test loop (before publishing)

Verify a change in a real consuming app without publishing. This is byte-identical to the published artifact, so what passes here is what ships.

```
# in component-library
pnpm build && pnpm pack          # → williamphelps13-ui-<version>.tgz

# in the consumer (e.g. ../swfllive)
npm install ../component-library/williamphelps13-ui-<version>.tgz --force
npm run dev
```

- `--force` is required — npm caches tarballs by name, and the tarball name carries the pre-bump `package.json` version (unchanged until the Version PR merges), so a same-name reinstall serves the stale cache without it
- iterate by rebuilding: edit → `pnpm build && pnpm pack` → reinstall with `--force`
- `npm link` is avoided — it symlinks the source tree and pulls in a second copy of React, which breaks a React peer-dependency library; a packed tarball uses the consumer's own React

## How releases work

- Changesets drives versioning and publishing. `release.yml` runs on every push to `main`: after its gate steps pass, with pending changesets it opens the Version Packages PR; with none it runs `pnpm release` (`changeset publish` — the build and verifications run in `prepublishOnly`)
- npm publishing uses OIDC trusted publishing — no stored `NPM_TOKEN`. The workflow's `id-token: write` permission lets npm mint a short-lived credential, and provenance attaches automatically (the run logs `using npm trusted publishing`)
- the Version Packages PR is authored by a GitHub App (`williamphelps13-ui-release`), not `GITHUB_TOKEN`. A `GITHUB_TOKEN`-authored PR cannot trigger workflows (GitHub's anti-recursion rule), so its required checks never run and it can never merge. The App token (minted via `actions/create-github-app-token`) makes the PR App-authored, so CI runs automatically and it merges like any other PR

## Consuming an update

```
# in the consumer
npm install @williamphelps13/ui@latest
```

Right after a publish, npm's metadata cache can lag and report `ETARGET No matching version found` for the just-published version. Use `--prefer-online` (or `npm cache clean --force`) to bypass it:

```
npm install @williamphelps13/ui@latest --prefer-online
```

## Gotchas

- additive changes are semver-minor, so a new prop or variant bumps `0.2.0` → `0.3.0`, not a patch — Changesets does this from the `minor` changeset
- the tarball from `pnpm pack` carries the current (pre-bump) `package.json` version; the real version bump only happens when the Version PR merges
- a new story is a new Chromatic baseline — the feature PR's `UI Tests` check stays pending until the snapshot is accepted in the Chromatic UI; the Version PR touches only `package.json`/`CHANGELOG.md`, so it has no visual changes and merges clean
