# Chromatic B3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land a live Chromatic visual-regression gate on this repo: first `.github/workflows/ci.yml`, `chromatic.config.json` with TurboSnap + standard-component-lib policy, `package.json` `chromatic` script, `.github/dependabot.yml`, GitHub remote, branch protection on `main`, end with the next PR genuinely gating on Chromatic.

**Architecture:** Single CI workflow (`correctness` job → `chromatic` job needs:[correctness]) so cheap gates fail fast. Policy lives in `chromatic.config.json` so local `pnpm chromatic` runs match CI. Branch protection (PR-required-with-zero-reviews + status checks + admin enforcement) is set via `gh api` after first push. One human touchpoint: the inherently-human Chromatic signup + token paste.

**Tech Stack:** GitHub Actions, `chromaui/action`, `@chromatic-com/storybook` (already installed + registered in `definePreview.addons` this session), Dependabot, `gh` CLI.

**Spec (source of truth for design + rationale):** `docs/superpowers/specs/2026-05-25-chromatic-b3-design.md` (commit `745b6df`).

**Three commits across the plan:**
1. `chore(phase3): ci skeleton + chromatic gate (B3) — pre-baseline` (Task 4)
2. `chore(phase3): chromatic projectId baseline + branch protection` (Task 8)
3. `docs(phase3): close Phase 3 (Chromatic live)` (Task 10)

---

## Task 0: Preconditions

**Files:** none (precheck only)

- [ ] **Step 1: Verify `gh` is authenticated**

Run: `gh auth status`
Expected: shows a logged-in account with `repo`, `workflow`, and `read:packages` scopes (or broader). If `gh` is not authed, STOP and ask owner to run `gh auth login` (browser flow) before continuing.

- [ ] **Step 2: Verify clean working tree at the expected head**

Run: `git status -s && git log -1 --oneline`
Expected: empty `git status` and the last commit is the most recent docs reconcile commit (currently `745b6df`). If anything is uncommitted or the head is older than expected, STOP and resolve before continuing.

- [ ] **Step 3: Confirm `@chromatic-com/storybook` + `addonChromatic()` are wired**

Run: `grep -E '"@chromatic-com/storybook"' package.json && grep -n 'addonChromatic' .storybook/preview.tsx`
Expected: package.json line shows it as a devDependency; preview.tsx line shows it imported and inside `definePreview.addons`. Both should already be in place from the Phase-4 work; this just verifies no regression.

---

## Task 1: Author `.github/workflows/ci.yml`

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Write the CI workflow file**

Write to `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  pull_request:
  push:
    branches: ["**"]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  correctness:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
        with:
          fetch-depth: 0
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v5
        with:
          node-version-file: .nvmrc
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck
      - run: pnpm lint
      - run: pnpm knip
      - run: pnpm spell
      - run: pnpm format
      - run: pnpm build
      - run: pnpm assert:use-client
      - run: pnpm test
      - run: pnpm verify:pack

  chromatic:
    needs: correctness
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
        with:
          fetch-depth: 0
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v5
        with:
          node-version-file: .nvmrc
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - uses: chromaui/action@latest
        with:
          projectToken: ${{ secrets.CHROMATIC_PROJECT_TOKEN }}
          onlyChanged: true
```

- [ ] **Step 2: Verify YAML syntax via prettier (will also format)**

Run: `pnpm exec prettier --check .github/workflows/ci.yml`
Expected: either passes immediately or reports formatting differences. If differences, run `pnpm exec prettier --write .github/workflows/ci.yml` and re-check.

---

## Task 2: Author `chromatic.config.json` + add `chromatic` npm script

**Files:**
- Create: `chromatic.config.json`
- Modify: `package.json` (add one script line)

- [ ] **Step 1: Write `chromatic.config.json` with a stub `projectId`**

Write to `chromatic.config.json`:

```json
{
  "$schema": "https://www.chromatic.com/config-file.schema.json",
  "projectId": "Project:PENDING_FIRST_BASELINE",
  "onlyChanged": true,
  "autoAcceptChanges": "main",
  "exitZeroOnChanges": false,
  "exitOnceUploaded": false,
  "buildScriptName": "build-storybook"
}
```

The `projectId` is a stub; Task 7 replaces it with the real value Chromatic returns from the first baseline run. Project token is NEVER stored here — only in GitHub Actions secrets.

- [ ] **Step 2: Add the `chromatic` script to `package.json`**

Read `package.json`, find the `"scripts"` block, add this line right after `"verify:types"`:

```json
"chromatic": "chromatic --config-file chromatic.config.json",
```

(Or wherever it lands alphabetically; the order doesn't matter — what matters is that the script is callable as `pnpm chromatic`.)

- [ ] **Step 3: Verify the script is registered**

Run: `pnpm run | grep chromatic`
Expected: a line showing `chromatic` mapped to the command. (Do NOT run `pnpm chromatic` yet — it needs the token, set in Task 7.)

- [ ] **Step 4: Format the touched files**

Run: `pnpm exec prettier --write chromatic.config.json package.json`
Expected: both files reformatted (or already clean).

---

## Task 3: Author `.github/dependabot.yml`

**Files:**
- Create: `.github/dependabot.yml`

- [ ] **Step 1: Write the Dependabot config**

Write to `.github/dependabot.yml`:

```yaml
version: 2
updates:
  - package-ecosystem: npm
    directory: /
    schedule:
      interval: weekly
      day: monday
    groups:
      minor-and-patch:
        update-types: [minor, patch]
    open-pull-requests-limit: 5
    ignore:
      # CSF Next is experimental; SB majors get audited manually per CLAUDE.md.
      - dependency-name: storybook
        update-types: [version-update:semver-major]
      - dependency-name: "@storybook/*"
        update-types: [version-update:semver-major]

  - package-ecosystem: github-actions
    directory: /
    schedule:
      interval: weekly
      day: monday
    groups:
      gh-actions:
        patterns: ["*"]
```

- [ ] **Step 2: Verify YAML formatting**

Run: `pnpm exec prettier --check .github/dependabot.yml`
Expected: passes (or `--write` to fix).

---

## Task 4: Verify all local gates + commit pre-baseline files

**Files:** none new (commit Tasks 1-3 work)

- [ ] **Step 1: Run the full local gate suite**

Run in this exact order:

```bash
pnpm typecheck
pnpm lint
pnpm knip
pnpm spell
pnpm format
pnpm build
pnpm assert:use-client
pnpm test
pnpm verify:pack
```

Expected: each one exits 0. If any fails, STOP and fix before proceeding.

- [ ] **Step 2: Inspect the staged set**

Run: `git status -s`
Expected (exactly these files modified/added):

```
 M package.json
?? .github/dependabot.yml
?? .github/workflows/ci.yml
?? chromatic.config.json
```

If extra files appear, investigate before adding.

- [ ] **Step 3: Stage + commit (use `git commit -F` per CLAUDE.md convention)**

Write the commit message to `/tmp/b3-commit-1`:

```
chore(phase3): ci skeleton + chromatic gate (B3) — pre-baseline

First .github/workflows/ci.yml for the repo (revives the deferred
Task 1.10 + extends with the Chromatic job). chromatic.config.json
stubs the projectId — Task 7 patches it after the first local
baseline run. Dependabot config opens grouped weekly PRs for npm
and gh-actions; Storybook majors are explicitly ignored (CSF Next
is experimental — audit those manually per CLAUDE.md).

Token stays out of any committed file — only set as a GitHub
Actions secret in Task 7.

CI workflow shape: correctness (typecheck/lint/knip/spell/format/
build/assert:use-client/test/publint) → chromatic (chromaui/action
with onlyChanged for TurboSnap). chromatic needs:[correctness] so
cheap gates fail fast and we never spend a snapshot on a broken
build. Policy (autoAcceptChanges: main, exitZeroOnChanges: false)
lives in chromatic.config.json, identical for CI and local runs.

See: docs/superpowers/specs/2026-05-25-chromatic-b3-design.md
```

Then:

```bash
git add -A
git commit -F /tmp/b3-commit-1
rm /tmp/b3-commit-1
```

Expected: commit lands on `milestone-0`; check with `git log -1 --oneline`.

---

## Task 5: Create GitHub remote + push

**Files:** none (remote operations only)

- [ ] **Step 1: Create the public GitHub repo + wire `origin`**

Run:

```bash
gh repo create williamphelps13/component-library \
  --public \
  --source=. \
  --description "@williamphelps13/ui — versioned, public React component library"
```

Expected: prints "Created repository williamphelps13/component-library on GitHub" and "added remote https://github.com/williamphelps13/component-library.git". Verify with `git remote -v`.

- [ ] **Step 2: Push both branches**

Run:

```bash
git push -u origin milestone-0
git push origin main
```

Expected: both pushes succeed. CI fires on the `milestone-0` push (the workflow file is on that branch); the `correctness` job should run green, the `chromatic` job will FAIL with "missing CHROMATIC_PROJECT_TOKEN" — that's expected pre-Task-7 and gets fixed at Task 7.

- [ ] **Step 3: Confirm CI fired**

Run: `gh run list --limit 2`
Expected: shows a `CI` workflow run on `milestone-0`. Note the run ID for reference.

---

## Task 6: [OWNER] Chromatic project signup + token retrieval

**Files:** none (owner-only step)

- [ ] **Step 1: Owner signs in at chromatic.com**

Browse to https://www.chromatic.com → "Sign in with GitHub" → authorize the Chromatic GitHub App for `williamphelps13/component-library` only (don't grant org-wide unless desired).

- [ ] **Step 2: Create the Chromatic project**

In Chromatic UI: "Add project" → select `williamphelps13/component-library` → choose "Storybook" → Chromatic generates a project token.

- [ ] **Step 3: Owner pastes the token back to the agent**

The token is a string like `chpt_XXXXXXXXXXXXXXXX`. Owner pastes it in the next agent turn. Do NOT commit this token to any file — it stays in GH Actions secrets only.

---

## Task 7: Set GH Actions secret + first Chromatic baseline + patch `projectId`

**Files:**
- Modify: `chromatic.config.json` (replace stub `projectId`)

- [ ] **Step 1: Set the GitHub Actions secret**

Run (with `<TOKEN>` replaced by the actual token from Task 6):

```bash
gh secret set CHROMATIC_PROJECT_TOKEN --body=<TOKEN>
```

Expected: "✓ Set Actions secret CHROMATIC_PROJECT_TOKEN for williamphelps13/component-library". Verify with `gh secret list`.

- [ ] **Step 2: Run the first Chromatic baseline locally**

Run:

```bash
pnpm dlx chromatic --project-token=<TOKEN>
```

Expected: Chromatic builds Storybook, uploads, captures the first baseline for all 5 Button stories, prints a build URL, AND prints (or writes to `chromatic.config.json` if it can) the canonical `projectId` in the form `Project:abc123def`. Note this projectId.

- [ ] **Step 3: Patch `chromatic.config.json` with the real `projectId`**

Edit `chromatic.config.json`: replace the stub `"Project:PENDING_FIRST_BASELINE"` with the real `projectId` from Step 2.

- [ ] **Step 4: Verify the local `pnpm chromatic` script works with the config now in place**

Run: `pnpm chromatic`
Expected: a second build, much faster (TurboSnap kicks in — `onlyChanged: true` reuses unchanged baselines), reports "no changes" or similar. Confirms the config + script + token flow end-to-end.

(Don't commit yet — Task 8 lands in the same commit as projectId for atomicity.)

---

## Task 8: Apply branch-protection rules on `main`

**Files:** none (remote API operation; record the call in the commit body)

- [ ] **Step 1: Set the branch protection via `gh api`**

Run:

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

Expected: returns a JSON object echoing the protection settings. If it returns an error about "Branch not found" verify `main` was pushed in Task 5 step 2.

- [ ] **Step 2: Verify the rules took effect**

Run:

```bash
gh api repos/williamphelps13/component-library/branches/main/protection \
  | jq '{ contexts: .required_status_checks.contexts, strict: .required_status_checks.strict, enforce_admins: .enforce_admins.enabled, prs_required: .required_pull_request_reviews.required_approving_review_count, allow_force_pushes: .allow_force_pushes.enabled, allow_deletions: .allow_deletions.enabled }'
```

Expected output (exactly):

```json
{
  "contexts": ["correctness", "chromatic"],
  "strict": true,
  "enforce_admins": true,
  "prs_required": 0,
  "allow_force_pushes": false,
  "allow_deletions": false
}
```

If anything is off, re-run Step 1 — the call is idempotent (PUT replaces the protection settings).

- [ ] **Step 3: Commit `projectId` + record the branch-protection action**

Write the commit message to `/tmp/b3-commit-2`:

```
chore(phase3): chromatic projectId baseline + branch protection

Task 7: first chromatic baseline ran locally (build #1) and
captured the canonical projectId; chromatic.config.json updated.
Token lives only in GH Actions secrets (CHROMATIC_PROJECT_TOKEN).

Task 8: branch protection applied to main via gh api:
  required_status_checks: correctness + chromatic (strict)
  enforce_admins: true
  required_pull_request_reviews.required_approving_review_count: 0
    (require PRs for CI gating; don't self-block as solo dev)
  allow_force_pushes / allow_deletions: false

First PR targeting main will be the first one to exercise the
status-check requirement (GH only enforces checks the branch has
seen before).

See: docs/superpowers/specs/2026-05-25-chromatic-b3-design.md §4.5
```

Then:

```bash
git add chromatic.config.json
git commit -F /tmp/b3-commit-2
git push origin milestone-0
rm /tmp/b3-commit-2
```

Expected: commit lands; push triggers CI again. This run should have BOTH jobs green (token is now wired).

---

## Task 9: Verify CI green + branch protection live

**Files:** none

- [ ] **Step 1: Wait for the CI run from the Task 8 push to complete + inspect**

Run:

```bash
gh run list --branch milestone-0 --limit 1
gh run watch  # or: gh run view <run-id> --log
```

Expected: latest run on `milestone-0` finishes with both jobs green:
- `correctness` (all 9 sub-steps green)
- `chromatic` (uploads, reports "No changes" since baselines were just captured)

If `chromatic` job reports a token error, re-check Task 7 Step 1.

- [ ] **Step 2: Confirm Chromatic UI shows the build**

Browse to the build URL printed by Step 1 (or check the chromatic.com project dashboard). Expected: 1 build, 5 stories, "Accepted" status (since this is the baseline).

- [ ] **Step 3: Re-verify branch protection (sanity check after CI traffic)**

Run the same `gh api ... | jq` from Task 8 Step 2.
Expected: identical output. Confirms nothing drifted.

---

## Task 10: Update durable docs + final commit

**Files:**
- Modify: `ARCHITECTURE.md` (status line + file map)
- Modify: `docs/superpowers/plans/2026-05-17-component-library-milestone-0.md` (§3.5 pointer + deviation log entry)

- [ ] **Step 1: Bump `ARCHITECTURE.md` status line — Phase 3 → ✅**

Open `ARCHITECTURE.md`, find the `**Status:**` line. Replace the Phase 3 segment:

OLD:
```
Phase 3 (Styling + Storybook + visual-regression harness) 🔄 _(Chromatic pending; everything else done)_
```

NEW:
```
Phase 3 (Styling + Storybook + visual-regression harness) ✅
```

- [ ] **Step 2: Add new rows to the ARCHITECTURE.md file map**

In the file-map table, add rows for the new infra files. After the row for `vitest.config.ts`, add:

```
| `.github/workflows/ci.yml`                                            | `correctness` (typecheck/lint/knip/spell/format/build/assert:use-client/test/publint) → `chromatic` (TurboSnap, onlyChanged). Concurrency cancel-in-progress per ref. | ✅         |
| `chromatic.config.json`                                               | TurboSnap + policy (autoAcceptChanges: main; exitZeroOnChanges: false). Project token lives only in GH Actions secrets.                                              | ✅         |
| `.github/dependabot.yml`                                              | Weekly grouped npm + gh-actions updates; Storybook majors deliberately ignored (CSF Next experimental).                                                              | ✅         |
```

(Alignment doesn't have to be pixel-perfect — markdown renders fine.)

- [ ] **Step 3: Update milestone-0 plan §3.5 to point to the spec**

Open `docs/superpowers/plans/2026-05-17-component-library-milestone-0.md`. Find the `### Task 3.5: Chromatic + TurboSnap wiring` header. Insert immediately AFTER that header, before any existing content:

```markdown
> **SUPERSEDED for the non-Teaching-Mode execution by the spec
> `docs/superpowers/specs/2026-05-25-chromatic-b3-design.md` (committed `745b6df`)
> and the plan `docs/superpowers/plans/2026-05-25-chromatic-b3.md`. Original
> Teaching-Mode walkthrough preserved below for historical reference.**
```

- [ ] **Step 4: Add a deviation-log entry for B3 in the milestone-0 plan**

In the same file, find the Execution-deviations section and add this as the LAST bullet (after the existing Phase-4 entry):

```markdown
- **Phase 3 / B3 (Chromatic) — COMMITTED 2026-05-25 (three commits).** Executed without
  Teaching Mode per owner direction; the spec + sub-plan
  (`docs/superpowers/specs/2026-05-25-chromatic-b3-design.md` +
  `docs/superpowers/plans/2026-05-25-chromatic-b3.md`) document the design and step-by-step.
  Shape: first `.github/workflows/ci.yml` for the repo (revives deferred Task 1.10 + Chromatic
  job); `chromatic.config.json` (TurboSnap, autoAccept:main, exitZeroOnChanges:false); Dependabot
  weekly grouped PRs; public GH repo at `williamphelps13/component-library`; branch protection
  on `main` (PR required with 0-review; status checks `correctness`+`chromatic`; enforce_admins).
  One human touchpoint (Chromatic signup + token paste). Project token in GH Actions secret only;
  `projectId` committed in `chromatic.config.json`. **Verified:** baseline build #1 captured in
  Chromatic UI; CI runs both jobs green; branch protection echoes the expected JSON.
  **Note for next phase:** the first PR targeting `main` (likely the eventual `milestone-0 → main`
  merge) is the one that will first exercise the required-status-checks gate — GH only enforces
  checks it has previously seen for the branch.
```

- [ ] **Step 5: Run the local format gate (docs touched)**

Run: `pnpm format`
Expected: clean (the plan file is in `.prettierignore`; ARCHITECTURE.md and the touched lines should already be valid).

- [ ] **Step 6: Commit the docs update**

Write the commit message to `/tmp/b3-commit-3`:

```
docs(phase3): close Phase 3 (Chromatic live)

ARCHITECTURE.md status: Phase 3 🔄 → ✅. File map adds the three
new infra files (.github/workflows/ci.yml, chromatic.config.json,
.github/dependabot.yml).

milestone-0 plan §3.5 marked as superseded for the actual
execution; pointer to the spec + sub-plan. Deviation log adds
the B3-complete entry with verified-green status + the
first-PR-to-main caveat for the required-status-checks rule.

Per the doc-reconcile rule in CLAUDE.md, this docs commit lands
in the same series as the implementation (B3 = three commits:
pre-baseline / projectId+protection / this docs close).
```

Then:

```bash
git add ARCHITECTURE.md docs/superpowers/plans/2026-05-17-component-library-milestone-0.md
git commit -F /tmp/b3-commit-3
git push origin milestone-0
rm /tmp/b3-commit-3
```

Expected: commit lands; final CI run on milestone-0 stays green.

- [ ] **Step 7: Final verification — show the three-commit chain**

Run: `git log --oneline HEAD~3..HEAD`
Expected (in this order, newest first):

```
<sha> docs(phase3): close Phase 3 (Chromatic live)
<sha> chore(phase3): chromatic projectId baseline + branch protection
<sha> chore(phase3): ci skeleton + chromatic gate (B3) — pre-baseline
```

B3 is done. Phase 3 is closed.

---

## Self-review notes (already applied)

- Spec coverage: every section of `2026-05-25-chromatic-b3-design.md` §3–§4 maps to a task; §5 rationale informs the file contents; §6 risks are addressed (gh auth precheck in Task 0; first-baseline-branch caveat in the Task 10 deviation entry).
- No placeholders: file contents are inlined verbatim; `<TOKEN>` is a deliberate stand-in for owner-paste, not a TBD.
- Type consistency: workflow `jobs.<id>` keys (`correctness`, `chromatic`) match the `contexts` array in the branch-protection call exactly. The `chromatic` script in `package.json` matches the file flag (`--config-file chromatic.config.json`).
- Naming: `CHROMATIC_PROJECT_TOKEN` is used identically everywhere (GH secret + workflow ref + local `--project-token` arg).
