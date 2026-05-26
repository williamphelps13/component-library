# Chromatic B3 — design spec

**Date:** 2026-05-25 · **Status:** approved (ready for implementation plan)
**Plan slot:** milestone-0 Task 3.5 (B3) — visual-regression gate via Chromatic + TurboSnap.

## 1. Goal & success criterion

**Goal.** The next PR (and every subsequent PR) to this repo is _gated_ on a live Chromatic
visual-regression check, with the full local correctness suite gating beforehand so a broken
build never spends a snapshot.

**Success criterion.** A test PR that intentionally tweaks a Button color produces:

1. A red `correctness` check (if it broke anything else) OR a green `correctness` check followed by
2. A red `chromatic` PR check, with a Chromatic UI link to review the visual diff, that stays red
   until the reviewer approves the diff in Chromatic and goes green afterwards.

Merging that PR to `main` auto-accepts the new snapshots as the canonical baseline.

## 2. Scope

In scope:

- First `.github/workflows/ci.yml` for the project (revives the deferred Task 1.10 _and_ extends
  it with the Chromatic job).
- `chromatic.config.json` (TurboSnap + policy; project token never lives here).
- `package.json` — add `"chromatic"` script.
- `.github/dependabot.yml` — weekly minor/patch group, GH-Actions + npm.
- Branch-protection rules on `main` (free on public repos), set via `gh api`.
- Owner SaaS steps: Chromatic project signup, token retrieval, single paste-back.

Out of scope (deliberately YAGNI'd):

- Node / OS matrix (single Node 24.16.0, linux-only).
- Codecov / coverage upload (defer past Phase 5).
- Required PR reviews (solo developer → self-block; revisit if collaborators arrive).
- CODEOWNERS, merge queues, advanced rulesets (paid-tier features anyway).
- Pre-commit hooks (CI is the gate; local hooks are optional ergonomics, not required).

## 3. No-Teaching-Mode workflow

Compressed to **one human touchpoint** + agent-driven everything else.

| Step | Who       | What                                                                                                                                                                                                                                                                                                                   |
| ---- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0    | agent     | `gh auth status` precheck (verify `gh` CLI is authed locally; abort cleanly if not).                                                                                                                                                                                                                                   |
| 1    | agent     | Author all files (CI workflow, chromatic config with **stub `projectId`**, npm script, dependabot, branch-protection script).                                                                                                                                                                                          |
| 2    | agent     | Run all local gates green; commit (`chore(phase3): ci skeleton + chromatic gate (B3) — pre-baseline`).                                                                                                                                                                                                                 |
| 3    | agent     | `gh repo create williamphelps13/component-library --public --source=. --description "@williamphelps13/ui — versioned, public React component library"` + push `milestone-0` and `main`.                                                                                                                                |
| 4    | **owner** | Sign in at chromatic.com with GitHub → create project linked to the new repo → paste the project token back to the agent. (Inherently human: OAuth browser flow.)                                                                                                                                                      |
| 5    | agent     | `gh secret set CHROMATIC_PROJECT_TOKEN --body=<token>` + `pnpm dlx chromatic --project-token=<token>` (first baseline, captures `projectId`); patch `chromatic.config.json` with the real `projectId`; run branch-protection `gh api` calls; commit + push (`chore(phase3): chromatic projectId + branch protection`). |
| 6    | agent     | Watch CI, confirm both jobs green; update `ARCHITECTURE.md` status line (Phase 3 → ✅) and deviation log entry; commit (`docs(phase3): close Phase 3 (Chromatic live)`).                                                                                                                                               |

Total owner attention: ~2 minutes (signup + paste).

## 4. Files (full content sketches)

### 4.1 `.github/workflows/ci.yml`

Single workflow, two jobs sharing the pnpm cache:

```yaml
name: CI

on:
  pull_request:
  push:
    branches: ['**']

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  correctness:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
        with: { fetch-depth: 0 } # full history; chromatic + turbosnap want it
      - uses: pnpm/action-setup@v4 # Corepack-respects packageManager pin
      - uses: actions/setup-node@v5
        with:
          node-version-file: '.nvmrc'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck
      - run: pnpm lint
      - run: pnpm knip
      - run: pnpm spell
      - run: pnpm format
      - run: pnpm build
      - run: pnpm assert:use-client
      - run: pnpm test
      - run: pnpm verify:pack # publint

  chromatic:
    needs: correctness
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
        with: { fetch-depth: 0 }
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v5
        with:
          node-version-file: '.nvmrc'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - uses: chromaui/action@latest
        with:
          projectToken: ${{ secrets.CHROMATIC_PROJECT_TOKEN }}
          onlyChanged: true
          # autoAcceptChanges + exitZeroOnChanges + buildScriptName live in chromatic.config.json
          # so they apply identically to CI and local `pnpm chromatic` runs.
```

### 4.2 `chromatic.config.json`

```jsonc
{
  "$schema": "https://www.chromatic.com/config-file.schema.json",
  "projectId": "Project:<stubbed; populated by first chromatic run in step 5>",
  "onlyChanged": true, // TurboSnap — re-snap only stories whose dep graph changed
  "autoAcceptChanges": "main", // merging to main bakes new baselines as canonical
  "exitZeroOnChanges": false, // PR check stays RED until reviewer approves diffs in Chromatic
  "exitOnceUploaded": false,
  "buildScriptName": "build-storybook",
}
```

### 4.3 `package.json` script addition

```jsonc
"chromatic": "chromatic --config-file chromatic.config.json"
```

### 4.4 `.github/dependabot.yml`

```yaml
version: 2
updates:
  - package-ecosystem: npm
    directory: /
    schedule: { interval: weekly, day: monday }
    groups:
      minor-and-patch:
        update-types: [minor, patch]
    open-pull-requests-limit: 5
    ignore:
      # CSF Next is experimental; pin floor in package.json and audit SB bumps manually
      # (CLAUDE.md toolchain rule).
      - dependency-name: 'storybook'
        update-types: [version-update:semver-major]
      - dependency-name: '@storybook/*'
        update-types: [version-update:semver-major]
  - package-ecosystem: github-actions
    directory: /
    schedule: { interval: weekly, day: monday }
    groups:
      gh-actions:
        patterns: ['*']
```

### 4.5 Branch protection (one-shot `gh api` call run in step 5)

For `main`:

- **Require a pull request** before merging (so every change to main goes through CI). But require
  **zero** approving reviews — so solo-dev workflow isn't self-blocked. The owner opens their own
  PR, waits for CI green, self-merges. When collaborators arrive, bump `required_approving_review_count` to 1.
- **Require status checks** `correctness` and `chromatic`. `strict: true` (branch must be
  up-to-date with main before merge so the checks ran against the post-merge state).
- **Block force-push** and **block branch deletion** on `main`.
- **Include administrators** (forces discipline; no silent owner-bypass).
- **Don't** require linear history — overkill at this stage.

Command shape (literal — JSON body via `--input -` so nullable fields are explicit, which `-F` shorthand handles unreliably):

```bash
gh api -X PUT repos/williamphelps13/component-library/branches/main/protection \
  -H "Accept: application/vnd.github+json" \
  --input - <<'JSON'
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["correctness", "chromatic"]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "required_approving_review_count": 0,
    "dismiss_stale_reviews": false,
    "require_code_owner_reviews": false
  },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false
}
JSON
```

(The check names `"correctness"` and `"chromatic"` must match the `jobs.<id>` keys in the workflow exactly. Note this also means the _first_ CI run on `main` must complete before branch protection takes meaningful effect — GH only enforces checks it has previously seen for the branch.)

## 5. Decisions & rationale (calibrated, not exhaustive)

- **One workflow, two jobs** (not two parallel) — `chromatic` `needs: correctness`. Cheap gates
  fail fast; we never spend a snapshot on a broken build. Trade: longer wall-clock vs. one
  parallel arrangement; acceptable for a solo project.
- **TurboSnap on (`onlyChanged: true`)** — free; massively reduces snapshot count on PRs that
  don't touch story-affecting code; required to stay under any future free-tier cap if we ever
  go private.
- **Policy in `chromatic.config.json`, not in the workflow** — single source of truth; local
  `pnpm chromatic` runs behave identically to CI.
- **`autoAcceptChanges: 'main'` + `exitZeroOnChanges: false`** — standard component-lib policy
  (per the brainstorm). Visual changes are always intentional or explicitly approved; never silent.
- **`projectId` is committed, project token is not** — token in GH Actions secret only; never
  in any committed file. The `projectId` lets local runs and CI agree on the same Chromatic
  project without needing the token to be present at config-load time.
- **Dependabot groups minor+patch into single PRs** — reduces PR noise; major bumps still come
  as individual PRs so they get attention. Storybook major bumps explicitly ignored (manual audit
  per CLAUDE.md toolchain rule about CSF Next experimental status).
- **Branch protection includes admins** — solo developer discipline. Forces "fix CI before
  merge" rather than the easier path of owner-bypass.
- **No required reviews** — solo developer; would self-block. Revisit when collaborators arrive.
- **No matrix** — single Node 24.16.0 (matches `.nvmrc`); linux-only. We're a library, not an
  app; consumers test on their own runtimes.

## 6. Risks & things to know

- **`gh repo create` requires local `gh` auth** — step 0 verifies; if missing, agent stops and
  asks owner to `gh auth login` (one command, not really a Teaching-Mode moment).
- **First baseline branch** — `main` doesn't have stories until `milestone-0` merges. Strategy:
  push `main` (currently empty / Phase-3 commit only) AND `milestone-0` to GH. First chromatic
  run will be from `milestone-0` and create baselines there. When `milestone-0` later merges to
  `main`, those baselines auto-accept onto main and become canonical.
- **`@chromatic-com/storybook` already in deps + `addonChromatic()` in `definePreview.addons`
  this session** — TurboSnap's stats-file requirement is therefore already met.
- **Free-tier confirmation** — public projects on Chromatic have unlimited snapshots; we're fine.
- **CI minutes** — public-repo GitHub Actions = **unlimited** free minutes/month (the 2000-min
  limit is private-repos only). Definitively not a concern.
- **Branch-protection ordering / first-PR caveat.** GH only enforces required status checks the
  branch has _previously_ seen. `main` won't have seen `correctness` / `chromatic` until the first
  PR targeting `main` opens and CI runs against it. Until that PR, protection is set but functionally
  dormant for status checks — but `require_pull_request: true` + `enforce_admins: true` +
  `allow_force_pushes: false` still block direct pushes. So the order in §3 is safe: set protection
  in step 5; the first PR to `main` (likely the eventual `milestone-0 → main` merge) will be the
  one that wires the checks in.

## 7. Verification path

After step 6 in §3, verify by:

1. Confirm `correctness` and `chromatic` jobs both ran and went green on the
   `chromatic projectId + branch protection` commit.
2. Confirm `gh api repos/.../branches/main/protection` returns the rules just set.
3. Open a small intentional-visual-change PR (e.g. tweak `--color-blue-600` by a hue or two);
   confirm:
   - `correctness` stays green.
   - `chromatic` goes red with a "review" PR comment + Chromatic UI link.
   - Approving the diff in Chromatic flips the PR check green.
   - Closing the PR without merging clears the visual diff from baselines (expected).

## 8. After-completion docs (per the rule)

The implementing commit MUST:

- Bump `ARCHITECTURE.md` Phase 3 status: 🔄 → ✅.
- Add `chromatic.config.json`, `.github/workflows/ci.yml`, `.github/dependabot.yml` to the
  ARCHITECTURE.md file map.
- Add a new deviation-log entry for B3 with the actual project URL + any setup deviations.

## 9. Open questions

None at spec-write time — all open calls were closed during the brainstorm. If the owner's
Chromatic SaaS signup surfaces something unexpected (e.g. a paid-only feature wanted), it
becomes a deviation-log entry in step 6.

## 10. References

- ARCHITECTURE.md §3 "Testing & docs" (Chromatic + TurboSnap as a required visual gate).
- milestone-0 plan §3.5 (B3 scaffold).
- CLAUDE.md commit conventions + the new doc-reconcile rules (this commit will exercise them).
