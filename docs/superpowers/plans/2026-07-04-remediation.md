# Remediation plan — fix everything verifiable from the 2026-07-04 repo review

## Context

The full-repo review (`docs/reviews/2026-07-04-repo-review.md`) found 1 Critical, ~20 Important, and ~25 Minor issues. Owner decision: fix everything verifiably non-standard regardless of priority — no consumers, no deadline, goal is a rock-solid library. This runs before the Phase 6 bake-off so the winning Button lands on the final foundation.

Owner decisions already made:
- Execute ARCHITECTURE.md's planned Tailwind→vanilla-CSS migration now (its three verification premises were confirmed by the audit) as the root-cause fix for the styling findings
- Public variable scheme: `--ui-` prefix everywhere; semantics fully explicit (`--ui-color-primary-bg` / `--ui-color-primary-fg`); rem-based dimensions
- Execution mode (agent runs commands; ask-before-commit convention still holds)
- Renovate replaces Dependabot for npm (Dependabot keeps github-actions)

Deliberately excluded as judgment calls, not verifiable defects: husky/pre-commit hooks, `exactOptionalPropertyTypes`, firefox/webkit test rows, per-component CSS entry points, dual-theme a11y automation (has its named trigger: component #3).

## Phase ordering

Five phases, each its own PR off `main`, sequenced so later branches benefit from earlier fixes. Changesets accumulate; one Version PR releases 0.4.0 at the end.

1. CI & automation first (stops the double Chromatic burn before the other four branches push)
2. Styling migration (the breaking change; biggest diff)
3. Packaging & publish safety
4. Quality gates & tooling config
5. Residual docs & hygiene

Step 0 (with PR 1): copy this plan to `docs/superpowers/plans/2026-07-04-remediation.md` with an Execution deviations log section, per repo convention.

---

## Phase 1 — CI & automation (PR 1, `fix/ci-automation`)

`.github/workflows/ci.yml`:
- Triggers → `pull_request` + `push: branches: [main]` (kills the double run; halves Chromatic snapshot spend)
- Add `permissions: contents: read` at workflow level
- Add `timeout-minutes` to both jobs (15 correctness / 15 chromatic)
- Cache Playwright: `actions/cache` on `~/.cache/ms-playwright` keyed on the playwright version from `pnpm-lock.yaml`
- Pin ALL third-party actions to full commit SHAs with `# vX.Y.Z` comments (`chromaui/action@latest` is the urgent one; also `pnpm/action-setup`, and in release.yml `changesets/action`, `actions/create-github-app-token`). Dependabot's github-actions ecosystem updates SHA pins
- Chromatic job: add `if: github.event_name == 'push' || github.event.pull_request.head.repo.full_name == github.repository` so fork PRs skip it

`.github/workflows/release.yml`:
- Add `cache: pnpm` to setup-node (matches ci.yml)
- SHA-pin actions (above)

Repo settings (gh api, confirm each before running):
- Drop `chromatic` from required branch-protection contexts (fork PRs otherwise permanently blocked); `correctness` stays required
- Disable "Allow GitHub Actions to create and approve pull requests" (unused — the App token opens the Version PR)

Renovate:
- Add `renovate.json`: npm only, weekly Monday, group minor+patch, `rangeStrategy` respecting `catalog:` (native support), carry over the Storybook-major ignore, semantic commit prefix `chore(deps)`
- `dependabot.yml`: remove the npm ecosystem block, keep github-actions
- Validate with `pnpm dlx renovate-config-validator`
- Note: Renovate app must be installed on the repo by the owner (GitHub App install is owner-only) — flag when we get there

## Phase 2 — Styling architecture: vanilla CSS migration + `--ui-*` contract (PR 2, `fix/css-architecture`)

The breaking change (changeset: minor). Executes the migration ARCHITECTURE.md line 121 already commits to.

`tokens/tokens.json`:
- Convert px dimensions to rem (÷16: `--ui-spacing-1` 0.5rem, `--ui-radius-md` 0.5rem, etc.). Same rendered values at default root font size; Chromatic must show zero diff from this step alone
- Rename semantic color tokens for full consistency: `primary`→`primary-bg`, `danger`→`danger-bg`, `success`→`success-bg` (fg names unchanged; `neutral-bg/fg` already correct); keep `ring`
- Add missing tiers (values lifted verbatim from today's `button.css` so visuals don't move):
  - `shadow`: `resting`, `raised`, `focus`, `pressed`, `none` (the four elevation levels + flat) — semantic set so dark can rebind later
  - `duration`: `fast: 150ms`, `base: 200ms`, `slow: 350ms`
  - `font-size`: `sm: 0.8125rem`, `md: 0.875rem`, `lg: 0.9375rem`; `font-weight`: `semibold: 600`
- `scripts/assert-theme-parity.mjs` continues to gate light/dark key parity — verify it handles the new sets

`style-dictionary.config.mjs`:
- Register a name transform prepending `ui-` (emits `--ui-color-primary-bg`, `--ui-radius-md`, …)
- Delete the `tailwind/theme-inline` format and the `theme.css` output entirely (kills the self-referential block at the source)
- Add `color-scheme: dark` emission to the dark output (or append via the format's selector block)
- Keep `:where(:root)` / `:where([data-theme="dark"])` selectors and `outputReferences` — that design is correct and stays

`src/styles/index.css` — rewrite as the vanilla entry point:
- `@layer ui.tokens, ui.components;` then `@import './...' layer(ui.tokens)` for the two token files and `@import '../components/button/button.css' layer(ui.components)`
- Delete: both tailwindcss imports, `@source` lines, `@custom-variant dark` (declared, never used)
- All shipped CSS now lives inside `@layer ui.*` → any consumer unlayered CSS or later-declared layer wins; prefixed vars remove the collision surface entirely

`src/components/button/button.css` — mechanical rewrite, keep every comment that still applies:
- `@utility ui-btn {…}` → `.ui-btn {…}` (plain classes; the entry-point `layer()` import does the layering, so states/media queries in this file are layered too — fixes S2 with no per-rule wrapping)
- Var references → `--ui-*` names; hardcoded shadows/durations/font-sizes/weight → the new tokens
- `height` → `min-height` on the three sizes (WCAG 1.4.4 text-zoom)
- Wire `--ui-color-ring` into focus-visible: `outline: 2px solid var(--ui-color-ring); outline-offset: 2px` replacing the transparent outline (fixes the dead contract var AND weak shadow-only focus; forced-colors block keeps its Highlight override). This is the one intended visual change — Chromatic diffs expected and accepted here only
- Dark-theme selectors → `:where([data-theme='dark']) .ui-btn-…` for specificity consistency

Build pipeline:
- Remove deps: `tailwindcss` (also from `pnpm-workspace.yaml` catalog), `@tailwindcss/cli`. Add `lightningcss-cli`
- `css` script → `lightningcss --bundle --minify src/styles/index.css -o dist/styles.css` (bundles `@import … layer()`, minifies — fixes unminified shipping)
- Add `css:watch` variant for the Storybook dev loop
- New `scripts/assert-css-imports.mjs`: every `src/components/*/*.css` appears as an `@import` in `src/styles/index.css`; wire into the `tokens` script chain (fixes the silent unstyled-component gap)

Docs riding this PR (update protocol: re-read all three):
- README theming section: full `--ui-*` contract (colors, spacing, radius, shadow, duration), the paired light+dark override rule stated explicitly, recommended import order (library CSS before app CSS)
- ARCHITECTURE: styling section rewritten (vanilla CSS + Lightning CSS + layer model), migration paragraph replaced with the outcome, status line + deviation log
- CLAUDE.md: prune Tailwind-only gotchas (auto-scan, prefix(tw), preflight, dynamic-class-name scanner limits — keep the typed `Record` variant-map rationale, now justified by TS completeness rather than the scanner), update toolchain rules
- `.storybook`/`chromatic` references to Tailwind, if any, cleaned up

Changeset: minor — "Breaking: CSS variables renamed to `--ui-*` (`--color-primary` → `--ui-color-primary-bg`, …); all styles now ship inside `@layer ui`; focus-visible now shows a ring using `--ui-color-ring`"

## Phase 3 — Packaging & publish safety (PR 3, `fix/packaging`)

`package.json`:
- Exports `"."` → add `"default": "./dist/index.mjs"` after `import`; add `"./package.json": "./package.json"`
- Scripts: `release` → `pnpm changeset publish`; add `"prepublishOnly": "pnpm build && pnpm verify:pack && pnpm assert:use-client"` (single publish path — manual or CI, the artifact is always freshly built and verified)
- Add `devEngines: { runtime: { name: "node", version: ">=24.11.1", onFail: "error" } }` — contributor floor enforced at install; `engines.node >=22.12.0` stays as the consumer floor. Fix the CLAUDE.md gotcha line that claims `engines.node` enforces the build floor
- `sideEffects`: drop the redundant `"./dist/styles.css"` entry
- Add `keywords`, `author`, sharpen `description`

`tsdown.config.ts`: remove the radix-ui `neverBundle` entries (undeclared-dependency trap; re-add with the peer dep the day radix is adopted)

attw re-test (0.18.3 is installed; the documented trigger has fired):
- Run `pnpm verify:types`; control-test `pnpm exec attw --from-npm zod@3.23.8` if it fails
- If green: add `pnpm verify:types` to ci.yml correctness job; delete the CLAUDE.md/ARCHITECTURE gotcha
- If still broken: update both docs' trigger to name the next attw release + this re-test procedure

Changeset: patch ("add default export condition and ./package.json subpath").

## Phase 4 — Quality gates & tooling config (PR 4, `fix/quality-gates`)

Vitest:
- Write `src/components/button/variants.test.ts` — unit-test `buttonClasses()` (the test ARCHITECTURE already claims exists); the dead `unit` project now matches a real file
- Widen the unit include to `src/**/*.test.{ts,tsx}`
- Wire coverage: `coverage` block (v8, include `src/**`, exclude stories), thresholds set to current actuals so it ratchets, `--coverage` in the CI test step. If browser-mode coverage proves flaky in practice, scope coverage to the unit project and log the deviation

TypeScript:
- Add `vitest.shims.d.ts` to `tsconfig.json` include (currently loaded by no program)
- New `tsconfig.node.json` covering root `*.config.ts` + `vitest.shims.d.ts`; append `tsc --noEmit -p tsconfig.node.json` to the `typecheck` script
- `lib` ES2023 → ES2022 (align with build target); add `noImplicitOverride`, `noFallthroughCasesInSwitch`, `noUnusedLocals`, `noUnusedParameters`

ESLint / formatting:
- `lint` script → `eslint . --max-warnings 0`
- Extend the type-aware React/a11y config block to `.storybook/**/*.tsx` (decorators are React components)
- Add `eslint-config-prettier` last in the chain
- Add `.editorconfig`

Misc gates:
- `spell` script → cover all repo markdown (`"**/*.md"`) + configs; extend `cspell` dictionary for the flagged legit words (`unwired`, `rgba`, `chromaui`, `unminified`, `misattributes`, …)
- Remove version-stamped comments in `.storybook/main.ts` / `preview.tsx`

## Phase 5 — Residual docs & hygiene (PR 5, `docs/hygiene`)

- `.gitignore`: add `.env*`, `.claude/settings.local.json`; fix the wrong `.prettierignore` comment claiming `.claude/` is gitignored
- ARCHITECTURE file map: add `button.css` (moot if Phase 2 already fixed the map — verify), `scripts/assert-theme-parity.mjs`, `scripts/assert-pack-contents.mjs`, `scripts/assert-css-imports.mjs`, `.storybook/modes.ts`, `docs/workflow.md`; fix the `files` glob summary; "while at `0.0.0`" → "while pre-1.0"
- CLAUDE.md Documentation section: "Three docs" → four (add workflow.md to the ownership table); add workflow.md to ARCHITECTURE's See Also
- De-duplicate the App-token rationale: workflow.md keeps the prose, ARCHITECTURE links to it
- Fix the deviation-log `pnpm pack --force` misattribution
- Add `SECURITY.md` (report via GitHub private vulnerability reporting)
- README: npm version + CI + license badges; show `npm install` alongside `pnpm add`
- Update `.changeset/config.json` schema pin to match the installed `@changesets/config`

## Verification

Per phase: `pnpm build && pnpm typecheck && pnpm lint && pnpm test && pnpm knip && pnpm spell && pnpm format && pnpm verify:pack && pnpm assert:use-client` — all green before each PR.

Phase 2 specific (the one with runtime surface):
- Diff `dist/styles.css` before/after: no Tailwind preamble, no `@theme` self-references, no unprefixed `--color-*`/`--spacing-*`/`--radius-*`, everything inside `@layer ui.*`, minified
- Collision proof: scratch HTML page loading a stock Tailwind v4 build + our stylesheet — consumer `--color-blue-500`/`rounded-md` must be untouched (this was the Critical; prove it dead)
- Override-contract proof: scratch page overriding `--ui-color-primary-bg` unlayered and via `@layer` — both must win over library defaults
- Storybook: owner exercises every documented Button state (visual gate per CLAUDE.md) — expected diffs: focus-visible ring only
- Chromatic: accept the focus-ring diffs, reject anything else
- `pnpm pack` tarball smoke-test in the swfllive consumption flow with the renamed vars
- Story tests + axe green (focus ring should improve, not regress, a11y)

Phase 1 specific: after merge, push a trivial branch PR and observe exactly one CI run + no fork-blocked required checks; first Renovate run regenerates the catalog lockfile green.

Release: merge all five PRs → Version PR → 0.4.0 published via the (now `prepublishOnly`-guarded) OIDC path → registry round-trip check.

Then Phase 6 (bake-off) proceeds on the fixed foundation.

## Execution deviations log

- Phases 3–5 combined into one PR (owner-directed): all three are non-breaking config/test/docs work, so one branch, one review checkpoint, one CI cycle — thoroughness unchanged, ceremony reduced.
- Phase 3: attw 0.18.3 fixed the environmental crash — `verify:types` re-gated in CI with `--profile esm-only` (accepts no-CJS/no-node10 as intended for an ESM-only package) and `--exclude-entrypoints styles.css` (non-JS subpath). The CLAUDE.md gotcha is deleted; ARCHITECTURE's quality-gates section records the profile rationale.
- Phase 4: the new `tsconfig.node.json` pass immediately caught `eslint-plugin-jsx-a11y` shipping no types — `eslint-plugins.d.ts` ambient declaration added.
- Phase 4: coverage measured 100% across the board; thresholds set at 90/85 as a ratchet floor, wired into `pnpm test` so local and CI gate identically.

- Phase 2: shipped layers are named `theme, base, components, utilities` (matching Tailwind v4), NOT the planned private `@layer ui.*`. The collision-proof page exposed a dilemma the plan missed: a private layer declared before the consumer's Tailwind loses to Preflight's button reset (their `base` outranks our components), and declared after, it beats their utility overrides. Same-named layers merge across stylesheets, giving correct composition in both import orders — verified empirically against a stock Tailwind v4 build both ways.
- Phase 2: shadow tokens are core primitives (`shadow.level-1…4`, `none`) referenced by light/dark semantics (`shadow.resting/raised/focus/pressed/flat`), instead of the plan's raw-valued semantic set — the dark build's `isSemantic` filter only emits reference-valued tokens, so raw dark shadow values would have been silently dropped.
- Phase 2: `SpacingOverride` story was overriding `--spacing-5`, which no Button rule consumes — the proportion-rebrand demo was a silent no-op. Now overrides `--ui-spacing-2` (medium/small padding), which visibly demonstrates the contract; expected Chromatic diff.
- Phase 2: Lightning CSS comment gotcha logged to CLAUDE.md — `--color-*/--spacing-*` in a block comment terminates it at `-*/` and the parser panics with `EndOfInput` at EOF, far from the cause.

- Phase 1: `chromatic` STAYS a required branch-protection check (plan said drop it). GitHub counts a skipped job as satisfying a required check, so the fork-PR `if:` guard alone unblocks forks — dropping the requirement would only have weakened the visual gate for same-repo PRs. Owner confirmed keeping maximum protection.
- Phase 1: pnpm 11 ships a default 24-hour `minimumReleaseAge` supply-chain gate that rejected Renovate's first grouped PR (13 `@eslint-react/*` packages published the same morning) — while the pnpm-catalog lockfile regeneration itself passed, confirming the Dependabot failure mode dead. Fix: `renovate.json` sets `minimumReleaseAge: "1 day"` so Renovate never proposes packages younger than pnpm's policy accepts.
- Phase 1 follow-up (owner-prompted, learning from the reactive minimumReleaseAge fix): deliberate Renovate feature pass instead of the original 1:1 Dependabot port. Added: automerge for the minor+patch group and digest pins (with repo auto-merge enabled), `configMigration` (deprecated-option PRs instead of silent no-ops), `lockFileMaintenance` weekly (transitives), `osvVulnerabilityAlerts` (security PRs bypass the Friday schedule; repo vulnerability alerts re-enabled), and majors moved from per-package `enabled:false` to dashboard approval (visible + still manual — covers the Storybook CSF Next audit rule). Known tension, decided not configured: a <24h security fix passes Renovate but fails pnpm's install-time age gate; if that fires, use pnpm `minimumReleaseAgeExclude` deliberately.
- Phase 1: Renovate-only, Dependabot deleted entirely (plan said keep Dependabot for github-actions). Renovate's `github-actions` manager updates SHA pins with `# vX.Y.Z` comments and `helpers:pinGitHubActionDigests` pins new ones, so a second updater added nothing — and removing Dependabot dissolves its two documented gotchas (catalog lockfile regeneration, dual-namespace secrets). Owner prompted the consolidation.
