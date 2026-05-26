# Component Library — Milestone 0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **TEACHING MODE (spec §5) — non-negotiable for every task:**
>
> - The **USER runs every CLI/setup command personally.** Commands are marked **`[USER RUNS]`**. The agent provides the exact command and expected output but must **not** execute it.
> - The agent **authors code/config files** and walks the user through them, pausing for questions.
> - Each task opens with a **Teaching Preamble**: _Concept / Why this choice (alternatives rejected) / Tradeoffs / What you'll run_.
> - Each **phase ends with a HARD Quiz Gate**: the agent asks the Socratic questions; the next phase is **blocked** until the user can articulate the answers. Shaky/uncertain → re-teach that piece, then re-quiz.
> - A command that errors becomes a **guided debugging exercise** (user drives diagnosis; agent coaches hypothesis → check → fix), never a silent fix.

**Goal:** Ship a single component (`Button`) as a real, versioned public npm package, consumed by a real Next.js App Router app, with the full author→publish→consume→re-publish loop, theming, and Chromatic gate ironed out — plus a component-pattern bake-off — establishing and validating the entire stack before any breadth.

**Architecture:** Single ESM-only public scoped npm package. Tailwind v4 compiled internally to precompiled CSS themed by code-first DTCG → Style Dictionary → CSS-variable tokens (zero-specificity override contract). tsdown bundles with React Compiler. Storybook 10 (CSF factories) is the dev/docs/test harness; Vitest browser mode runs interaction + a11y from stories; Chromatic + TurboSnap is a required release gate. Changesets + GitHub Actions + npm OIDC publish.

**Tech Stack:** TypeScript, React 19, pnpm 11, tsdown (Rolldown/Oxc) + `babel-plugin-react-compiler`, Tailwind v4, Style Dictionary v5 + `@tokens-studio/sd-transforms`, `radix-ui` (not until Phase 7), Storybook 10 + `@storybook/react-vite`/`addon-vitest`/`addon-a11y`/`addon-themes`, Vitest + `@vitest/browser-playwright`, Chromatic, Changesets, ESLint flat + Prettier (+ optional oxlint), knip, publint/attw.

**Scope:** Milestone 0 = Phases 1–6. **Phase 7 (scaling) is OUT OF SCOPE** — it gets its own spec→plan cycle after the §4.1 gate. This plan **ends at the §4.1 gate** (Phase 6 quiz gate + gate checklist).

**Source spec:** `docs/superpowers/specs/2026-05-17-component-library-design.md` (r7).

## Execution deviations (live log)

- **Tailwind `prefix(tw)` REJECTED (was: "deferred"); collision-safety achieved differently.** Validated against Tailwind v4 docs (ctx7): `prefix(tw)` namespaces theme **variables** too (`--color-*` → `--tw-color-*`), which would break our consumer override contract (`:root { --color-primary }`) — the core of the theming design. So prefix() is the wrong tool here, not merely "hard." Collision-safety instead comes from three deliberate choices in `src/styles/index.css`: (1) `@import "tailwindcss/…" source(none)` + `@source "../components"` → minimal, doc-independent class surface (the bare `@import "tailwindcss"` had been auto-scanning `docs/*.md` and shipping prose-scraped utilities); (2) our own `ui-*` class names (we author the `@utility` names, so namespacing is a naming choice, no Tailwind machinery, variables untouched); (3) **Preflight omitted** via the layered-import form so we don't impose a global reset on consumers (the larger real collision risk — `prefix()` never covered it). Component classes are self-contained as a result (`.ui-btn` resets `appearance/border/margin/font`). End-to-end verification (no `--tw-color-*`, no Preflight, classes render) happens in Phase 4 once `<Button>` consumes the classes in Storybook.

Real deviations from this plan as executed. A deviation is logged only when it
genuinely changes scope/sequence — not for routine within-task choices.

- **TS 6.0.3 adopted** (plan said `5.9.x / 6.x`). Verified supported by tsdown/oxc (build) and `typescript-eslint` 8.59 (lint). Greenfield → newest, since the binding tools support it.
- **Node pinned `.nvmrc` = 24.16.0 (exact); `engines.node` floor = `>=24.11.1`** — tsdown config-load needs ≥24.11.1. **TODO before Phase 5:** `engines.node` is consumer-facing and likely over-strict; right-size it (dev-need ≠ consumer-need).
- **React Compiler via direct `@rolldown/plugin-babel` + `babel-plugin-react-compiler`** (not `@vitejs/plugin-react`/`reactCompilerPreset`) — avoids a Vite dep in a non-Vite library.
- **attw split out of the Phase-1 gate** into `verify:types` (was in `verify:pack`). `@arethetypeswrong/cli` 0.18.2 (latest) lacks TS 6.0 support; re-add to the gate when upstream supports it (or re-check in Phase 4 with real types). `publint` still gates.
- **`./styles.css` export deferred to Phase 3** (Task 3.2) — `publint` requires `exports` paths to point at files that exist; CSS isn't built until Phase 3.
- **React/a11y ESLint plugins: kept in Phase 1** (briefly considered deferring to Phase 4; reversed — known decision, belongs in foundation).
- **`eslint-plugin-react-server-components` dropped** — v1.2.0 crashes on import under ESLint 10 / current eslint-plugin-react. The `"use client"` guardrail = the build-time assertion (Task 1.8); author-time RSC linting deferred to Phase 4 via `@eslint-react`'s `rsc` rules (lands with the first client component).
- **Native build scripts: approve via pnpm 11 `allowBuilds` (NOT the v10 `onlyBuiltDependencies`).** pnpm 11 blocks dep build scripts by default, and a _blocked_ build makes `pnpm install` **fatally exit 1** — it cascades (it broke the Storybook init's deps-check _and_ the Playwright-binary install). **pnpm 11 removed `onlyBuiltDependencies`/`neverBuiltDependencies`/`ignoredBuiltDependencies` and replaced them with `allowBuilds: { pkg: true|false }`.** The old keys are **silently ignored** (deprecated-key trap) — so a build stays blocked even though it "looks" allowed. _This exact mistake recurred across agents_ (baked into the earlier setup as `onlyBuiltDependencies`) until the validate-against-current-docs rule caught it (Phase 3). Correct form:
  ```yaml
  allowBuilds:
    unrs-resolver: true
    '@parcel/watcher': true
    esbuild: true
  ```
  After changing it, run `pnpm install` (or `pnpm rebuild <pkg>`) to execute the now-approved builds. (All three ship prebuilt binaries + are reputable.)
- **ESLint 10 + `eslint-plugin-jsx-a11y` peer lag** — jsx-a11y@6.10.2 declares `eslint ≤ ^9` (stale range); loads + lints clean, but its rules are unexercised until real JSX. **Validate on Button (Phase 4)**; downgrade to ESLint 9 only if it actually breaks. Benign peer warning accepted (strict peers off). pnpm 11 settings: `engineStrict` kept (moved to `pnpm-workspace.yaml`); `saveExact`/`strictPeerDependencies` dropped; `.npmrc` deleted (pnpm 11 ignored it).
- **knip config (Phase-3 corrected).** `ignoreDependencies`: `react`/`react-dom`/`@types/react`/`@types/react-dom` (peer-backed devDeps), `babel-plugin-react-compiler` (string-referenced in tsdown config), and **`tailwindcss`** — the latter is used only via CSS `@import "tailwindcss/…"` (invisible to knip, which parses JS/TS), and is declared _directly_ (not leaned on transitively via `@tailwindcss/cli`) to avoid a phantom dep. The real public-API guard (spec risk #12) is **`project: ["src/**/\*.{ts,tsx}"]`** (scopes analysis to our source); an explicit `entry: ["src/index.ts"]`and`ignore: ["scripts/**"]`were dropped as **redundant** — knip auto-detects`src/index.ts`as an entry, and`scripts/`is already outside the`project`scope. (An earlier audit overstated this as "entry/project missing"; only`project`was load-bearing.) **Phase-3 to-undo:** remove`vitest`from`ignoreBinaries` once Task 3.4 installs Vitest.
- **Tokens layout: single-file `tokens/tokens.json` (Tokens Studio "sets") — chosen for FREE Figma sync.** Tokens Studio's multi-file sync _and_ themes are Pro (€39/editor/mo); single-file + sets is free (Starter). **Validated locally:** Tokens Studio imports the file, `core`-as-source resolves the references, and export-by-sets → Figma native variables works. The build reads the same single file (merges `core`+`light` / `core`+`dark`). **Remaining for Phase 5:** wire the actual GitHub single-file sync (needs the remote). Caveats: light/dark as variable _modes_ (one variable, two modes) is Pro — on free you export one semantic set at a time; the Studio-platform tiers (Essential/Organization) sell versioning/branching we already do in git+CI. Code-first keeps Figma sync optional/removable.
- **cspell kept as a real `spell` script + CI step** (not editor-only) — an editor-bundled spell-checker wouldn't help devs without the extension or enforce anything; `pnpm spell` is portable + CI-enforced. Scoped to README + `src` to stay low-noise (internal planning docs excluded).
- **Storybook 10.4 harness (Part B) — as-built + findings.** Scaffolded via `pnpm dlx storybook@latest init` (React/Vite; AI-features = Yes → `@storybook/addon-mcp`; onboarding declined). The CSF-Next docs first consulted were Storybook's **`next` (unreleased) branch**, which is ahead of 10.4.1 — _confirm against the installed package's real exports, not `next`/canary docs._ Validated findings: **`defineMain` is `next`-only — NOT exported in 10.4.1**, so `.storybook/main.ts` uses a typed `StorybookConfig` object; **`definePreview` IS exported in 10.4.1** and powers our CSF-Next stories; **`addonDocs()` must be in `definePreview`'s `addons` array** or autodocs throws `baseDocsParameter.renderer is not a function`; `addon-themes` exposes `withThemeByDataAttribute` as a **named export**. Added `@storybook/addon-themes` (init omitted it); pruned the scaffold's example `src/stories/`. **MCP foundation laid now (not deferred):** server verified **live** at `localhost:6006/mcp` (6 tools: `list-all-documentation`, `get-documentation`, `get-documentation-for-story`, `get-storybook-story-instructions`, `run-story-tests`, `preview-stories`), wired in `.mcp.json`, agents instructed via `AGENTS.md` to verify props — installed as foundation because across-agent handoffs have no reliable trigger (deferral-discipline). Only live while `pnpm storybook` runs. Reconciled the init's edits: kept `eslint-plugin-storybook` (flat/recommended, restyled to our Prettier), dropped the redundant `.gitignore` `*storybook.log` + the stale `vitest` knip `ignoreBinaries`; there is no onboarding _addon_ (the "Get started" panel is SB-core UI). **Versioning decision:** SB/Vitest stay on `^` ranges — reproducibility comes from `pnpm-lock.yaml`, not exact pins (exact pins are redundant with the lockfile + block patch fixes + are off our catalog convention); since CSF Next is experimental, re-test stories after any `pnpm update` that bumps Storybook (CLAUDE.md toolchain rule). **Still pending (Part B):** Vitest `unit` jsdom project + `pnpm test`; Chromatic (B3). _Reviewer-subagent checkpoint (B1, superpowers review flow):_ fixed the eslint `files` glob so `.storybook/*.ts(x)` get the TS parser (lint was red — they matched no type-aware block); gitignored Playwright verification artifacts. SB/Vitest/config files sit **outside** the `tsc --noEmit` gate (tsconfig `include: ['src']`, `types: []`) — they're typed by their own tooling/runtime; add `@types/node` if config-file IDE typing bites.
- **Phase 4 (Button + harness verification) — COMMITTED 2026-05-25 (`2903f5f`).** Pulled forward to verify the Phase-3 harness on a real component. Restructured below into the four sub-findings (was a single mega-paragraph; reviewer M3 flagged).

  - **Initial scope (the Button + layered tsconfig).** Validated vs current docs: **React 19 `ref` is a plain prop** — `button.tsx` is a plain function, `ref?: Ref<HTMLButtonElement>` + explicit `ReactElement` return (isolatedDeclarations), **no `forwardRef`**. **CSF Next `play` uses context args** (`{ canvas, userEvent, args }` + `import { fn, expect } from 'storybook/test'`), not `within(canvasElement)`. **Vitest `unit` project = `environment: 'node'`** (pure-logic; no jsdom dep). **Dynamic-class-names bug** (caught by the real component): `ui-btn-${intent}` can't be statically resolved by Tailwind so the precompiled CSS silently omitted `ui-btn-neutral`; fixed with typed literal-class `Record<Intent|Size, string>` maps in `variants.ts` (all variants ship + TS enforces completeness; CLAUDE.md gotcha added). **tsconfig LAYERED** (replaces an earlier reflexive "exclude stories" that lost story type-checking): `tsconfig.build.json` (strict — isolatedDeclarations, rootDir:src, src-only, exclude stories/tests) used by tsdown (`--tsconfig`) + typecheck pass 1; `tsconfig.json` broad (`src` + `.storybook/**/*`, lenient) for editor + typecheck pass 2 → stories/preview/`main.ts` + ambient `globals.d.ts` ARE type-checked. `pnpm typecheck` runs both.

  - **✅ TS2882 BLOCKER RESOLVED — root cause was the `include` glob, none of the three handoff hypotheses applied.** Symptom: `pnpm typecheck` pass 2 failed `TS2882: Cannot find module or type declarations for side-effect import of '../dist/styles.css'` in `.storybook/preview.tsx`. Diagnosis by _evidence_, not guesswork: `tsc --showConfig` showed the broad config's resolved `files` array held **only `src/**`** — zero `.storybook/*` files — despite `include: ['src', '.storybook']`. **TS's `include` globber silently skips dot-directories**, so bare `.storybook` matched nothing; `preview.tsx` was in the program only because a story imports it, and `globals.d.ts` (imported by nobody) never loaded → its `declare module '*.css'` wildcard never registered. (The TS2882 *check itself* is a TS 6.0 change: `noUncheckedSideEffectImports` now defaults on.) The three hypotheses (globals-not-in-include / `verbatimModuleSyntax` / real-file shadowing) and the "drop `verbatimModuleSyntax`" fix were **all wrong** — disproved by `--listFilesOnly` + a throwaway-config typecheck (corrected include + the existing no-body declaration → EXIT 0). **Fix (one line):** `tsconfig.json` → `include: ['src', '.storybook/**/*']`; bonus, `main.ts` is now genuinely type-checked. CLAUDE.md gotcha + `ARCHITECTURE.md` §3 (TypeScript) updated.

  - **CSF Next addon-registration trap — first caught for `addonThemes`, then for `addonA11y` (by the reviewer-subagent).** Visual verification (Playwright-driven via MCP, 4 URL-globals states on the Button Primary story with computed `bgColor` asserted) revealed `@storybook/addon-themes` had to be in `definePreview.addons: [addonThemes()]` and not _only_ in `main.ts addons` — CSF Next splits manager-side addon registration (main.ts) from preview-side wiring (`definePreview.addons`); without the preview-side factory, `globalTypes.theme` is never registered and `withThemeByDataAttribute` silently falls back to `defaultTheme` every render. **Reviewer-subagent checkpoint then caught the identical, unfixed sibling in `@storybook/addon-a11y`** — `parameters.a11y.test: 'error'` was a silent no-op; reviewer empirically proved it by seeding a `button-name` violation that passed all 7 tests until `addonA11y()` was registered. **Audit of all 5 factory-shaped addons in `main.ts`:** added `addonA11y()` + `addonChromatic()` (foundation-prep for B3) alongside `addonDocs()` and `addonThemes()`. **`addonVitest()` deliberately NOT registered** — its module imports `vitest` at load time (only resolvable inside the vitest run context); placing it in `definePreview.addons` crashes Storybook dev. The vitest integration is wired through `storybookTest()` in `vitest.config.ts` instead — different addons need different paths. CLAUDE.md gotcha + AGENTS.md checklist added.

  - **Now-live a11y gate immediately caught a real WCAG AA violation in the primary token** — white-on-`blue.500` = 3.68 : 1, AA needs 4.5 : 1. Root cause was the token, not the Button; the gate worked correctly the moment it became live. **Token fix (owner's option-1 choice):** added darker primitive `color.blue.600: oklch(0.50 0.19 256)` to `tokens/tokens.json`; repointed `light.color.primary` from `{color.blue.500}` to `{color.blue.600}`. Dark theme unchanged (`blue.300` + dark text already passed). `--color-ring` deliberately left on `blue.500` (focus-ring is a separate semantic decision). Rebuild + re-test green; 7/7 tests pass; `dist/styles.css` ships `var(--color-blue-600)` for `--color-primary`.

  - **Pending (post-commit):** Chromatic (B3) — `chromatic.config.json` + CI job; first baseline needs the project token. Then merged Phase 3+4 quiz gate (Teaching Mode). Then **over-strict-settings audit** — does `verbatimModuleSyntax` earn its friction? It was **not** the culprit for the include-glob blocker, so judge it on its own merits.

- **Phase 3 / B3 (Chromatic visual gate) — COMMITTED 2026-05-25 (six commits: `e769f01` spec format-fix, `b536639` ci skeleton + chromatic gate, `2e67313` + `dc446da` two CI fixes caught on first runs, `bbf096a` projectId + branch protection, `d6fe795` close-Phase-3 docs).** Executed without Teaching Mode per owner direction; spec + sub-plan at `docs/superpowers/specs/2026-05-25-chromatic-b3-design.md` (`745b6df`) and `docs/superpowers/plans/2026-05-25-chromatic-b3.md` (`af0cf0b`). **Repo went live at https://github.com/williamphelps13/component-library (public).** Branch protection on `main` via `gh api`: required checks `correctness` + `chromatic` (strict), `enforce_admins: true`, PRs required with 0 reviews (solo-dev), force-push + deletions blocked. **First Chromatic baseline:** Build #1 captured 5 stories from `milestone-0` (`--auto-accept-changes`); `projectId: Project:6a151bd855f397c6fdf9042a` committed to `chromatic.config.json`. Build #2 onwards run from CI's `chromatic` job. Token in GH Actions secret `CHROMATIC_PROJECT_TOKEN` only.

  - **Spec correction (recorded here, not amended in spec/plan):** The B3 spec said "first `.github/workflows/ci.yml` for the project / Task 1.10 deferred." Actually Phase 1 (`a95e03f`) had committed a single-job `quality` workflow. B3 _expanded_ it: renamed `quality`→`correctness`, added `format` + `test` steps, bumped `actions/checkout@v4`→`@v6` and `actions/setup-node@v4`→`@v5`, expanded triggers to all branches, added the new `chromatic` job.

  - **Three in-flight CI fixes the spec/plan didn't anticipate (each caught by CI itself):**
    1. **Playwright Chromium not preinstalled on GH runners** — Vitest storybook (browser-mode) crashed with "Executable doesn't exist." Fix: added `pnpm exec playwright install --with-deps chromium` after `pnpm install --frozen-lockfile` in the `correctness` job. Local was masked by the existing `~/Library/Caches/ms-playwright/` install.
    2. **`pnpm chromatic` script non-functional locally** (caught by Task-2 code-quality reviewer with empirical verification — added `chromatic` as a direct devDependency since pnpm doesn't hoist transitive bins, so `node_modules/.bin/chromatic` was absent). Affected only local DX, not CI (CI uses `chromaui/action`).
    3. **`chromatic` job lacked `pnpm build`** — `chromaui/action` runs `build-storybook` which loads `preview.tsx` which side-effect-imports `dist/styles.css`; `dist/` is gitignored, so without `pnpm build` first the storybook build failed with `UNRESOLVED_IMPORT`. Fix: added `pnpm build` to the `chromatic` job before the action.

  - **Two reviewer-driven cleanups during execution:**
    1. **`onlyChanged` centralized in `chromatic.config.json`** only (was duplicated in `ci.yml`); ensures local `pnpm chromatic` and CI behave identically — Task-2 reviewer Important finding.
    2. **`fetch-depth: 0` removed from `correctness` job** (kept on `chromatic` for TurboSnap); no correctness step uses git history. Spec §4.1 still shows it on both; deviation kept (the spec was being defensive without a use-case).

  - **Other notes:**
    - **TurboSnap dormant for now** — Chromatic free-tier requires ≥10 CI builds before TurboSnap activates. `onlyChanged: true` stays in config; will start working automatically once we cross that threshold.
    - **CI workflow uses `chromaui/action@latest`** — Chromatic publishes a moving `latest` tag (per chromatic.com/docs/github-actions); Dependabot's gh-actions group will still surface major bumps if they retag.
    - **Dependabot opened 2 PRs on first push** (gh-actions group + npm minor-and-patch group); both should be reviewable once branch protection's status-check requirement is exercised on a real PR (the first PR to `main`).
    - **The first PR to `main`** (likely the eventual `milestone-0 → main` merge) is the one that first exercises the required-status-checks rule on the branch — GH only enforces checks it has previously seen.

  - **Pending:** merged Phase 3+4 quiz gate (Teaching Mode); **over-strict-settings audit** (`verbatimModuleSyntax` etc.); plus the standing review of the 2 open Dependabot PRs when convenient.

---

## File Structure (decomposition lock-in)

| Path                                       | Responsibility                                                                                          |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| `package.json`                             | ESM-only manifest: `exports`, `sideEffects`, peer/deps, `publishConfig`, scripts                        |
| `pnpm-workspace.yaml`                      | pnpm catalog — framework-critical version pins in one place                                             |
| `.npmrc`                                   | pnpm settings (exact, strict peers)                                                                     |
| `.nvmrc`                                   | pinned Node (24 LTS)                                                                                    |
| `tsconfig.json`                            | `bundler` resolution, `declaration`/`declarationMap`/`sourceMap`, `isolatedDeclarations`                |
| `tsdown.config.ts`                         | ESM, `unbundle`, externals, `dts`, `sourcemap`, React Compiler via `@rolldown/plugin-babel`             |
| `eslint.config.ts`                         | Flat config: typescript-eslint, react-hooks, jsx-a11y, @eslint-react, import-x, react-server-components |
| `.prettierrc.json`, `.prettierignore`      | Formatting only                                                                                         |
| `cspell.json`                              | Project jargon dictionary (kills the doc-noise diagnostics)                                             |
| `knip.json`                                | Dead-code/dep hygiene; library entry points declared                                                    |
| `.changeset/config.json`                   | Public access, github changelog                                                                         |
| `scripts/assert-use-client.mjs`            | Build-time `"use client"` guardrail assertion                                                           |
| `tokens/**`                                | DTCG JSON — Button-relevant primitive + semantic (+ dark) tokens; Tokens Studio metadata                |
| `style-dictionary.config.mjs`              | SD v5 + sd-transforms; emits `tokens.css` + Tailwind `@theme inline` artifact                           |
| `src/styles/index.css`                     | Tailwind v4 entry: `prefix(tw)`, `@theme inline`, `:where()` dark variant, `@utility`                   |
| `src/components/button/button.tsx`         | The Button (server-renderable; no `"use client"`)                                                       |
| `src/components/button/button.stories.tsx` | CSF-factory stories + `play` interaction                                                                |
| `src/components/button/button.test.tsx`    | Pure-logic unit tests (variant class resolution)                                                        |
| `src/index.ts`                             | Barrel — **must not** carry `"use client"`                                                              |
| `.storybook/main.ts`                       | `@storybook/react-vite`, addons, `react-docgen-typescript`                                              |
| `.storybook/preview.ts`                    | Imports precompiled CSS; `addon-themes` theme + palette globals                                         |
| `.storybook/vitest.setup.ts`               | `setProjectAnnotations` incl. a11y annotations                                                          |
| `vitest.config.ts`                         | `projects`: `storybook` (browser) + `unit` (jsdom)                                                      |
| `.github/workflows/ci.yml`                 | lint, typecheck, build, vitest, publint/attw, use-client assertion, Chromatic                           |
| `.github/workflows/release.yml`            | Changesets action; OIDC `id-token: write`; publish                                                      |
| `docs/workflow.md`                         | **Phase 5 deliverable** — ironed consumer+maintainer loop                                               |
| `docs/component-conventions.md`            | **Phase 6 deliverable** — canonical component pattern                                                   |
| `examples/` _(or external)_                | Pilot Next.js App Router consumer (existing app; owner supplies path)                                   |

---

# PHASE 1 — Foundation

Goal: a published-shaped, lint/typecheck/build/CI-green **empty** package (no component yet). Proves the packaging + toolchain skeleton in isolation.

### Task 1.1: Repo, Node, pnpm, git baseline

**Files:** Create `.nvmrc`, `.npmrc`, `.gitignore`

**Teaching Preamble**

- **Concept:** Pin the runtime (Node) and package manager (pnpm 11) so every machine and CI agree, and configure pnpm for strictness.
- **Why this choice (alternatives rejected):** pnpm 11 over npm/yarn — content-addressed store, strict `node_modules` (catches phantom deps a _library_ must not rely on), and catalogs (Task 1.2). npm's flat `node_modules` hides undeclared deps that then break consumers.
- **Tradeoffs:** Contributors must use pnpm; Corepack handles that. Strict peer deps surface more errors up front (desired for a library).
- **What you'll run:** `corepack`, `pnpm init`, `git init`.

- [ ] **Step 1 (agent authors):** Create `.nvmrc`:

```
24
```

- [ ] **Step 2 (agent authors):** Create `.npmrc`:

```
engine-strict=true
save-exact=true
strict-peer-dependencies=true
```

- [ ] **Step 3 (agent authors):** Create `.gitignore`:

```
node_modules/
dist/
build/
storybook-static/
*.log
.DS_Store
coverage/
```

- [ ] **Step 4 `[USER RUNS]`:** Enable Corepack + pin pnpm:

```bash
corepack enable
corepack prepare pnpm@11 --activate
node -v && pnpm -v
```

Expected: Node `v24.x`, pnpm `11.x`.

- [ ] **Step 5 `[USER RUNS]`:** Initialize the manifest and git (git may already be initialized from spec commits — that's fine):

```bash
pnpm init
git status
```

Expected: a `package.json` is created; `git status` shows it untracked.

- [ ] **Step 6 (agent authors):** Overwrite `package.json` with the Phase-1 manifest (see Task 1.4 — author it now, fields filled progressively).
- [ ] **Step 7 `[USER RUNS]`:** Commit.

```bash
git add .nvmrc .npmrc .gitignore package.json
git commit -m "chore: repo baseline (Node 24, pnpm 11, gitignore)"
```

### Task 1.2: pnpm catalog (framework pins in one place)

**Files:** Create `pnpm-workspace.yaml`

**Teaching Preamble**

- **Concept:** A pnpm _catalog_ defines version specifiers once; `package.json` references them via `catalog:`. One edit re-pins everywhere.
- **Why this choice (alternatives rejected):** Even at single-package scale, the framework-critical quartet (react, react-dom, tailwindcss, typescript) plus Storybook must stay coherent; scattering versions across `package.json` is how peer-range drift (spec risk #7) sneaks in. Rejected: plain `package.json` versions (acceptable but loses the single review point).
- **Tradeoffs:** Slight indirection; a catalog in a non-workspace repo is unusual but valid.
- **What you'll run:** nothing yet (consumed in Task 1.5 install).

- [ ] **Step 1 (agent authors):** Create `pnpm-workspace.yaml`:

```yaml
packages:
  - .
catalog:
  react: 19.2.0
  react-dom: 19.2.0
  typescript: 5.9.2
  tailwindcss: 4.1.0
```

> Exact patch versions are confirmed in Task 1.5 against the registry; the catalog is the single place to adjust them.

- [ ] **Step 2 `[USER RUNS]`:** Commit.

```bash
git add pnpm-workspace.yaml && git commit -m "chore: pnpm catalog for framework pins"
```

### Task 1.3: TypeScript config (library-grade)

**Files:** Create `tsconfig.json`

**Teaching Preamble**

- **Concept:** Compiler settings tuned for an ESM library that ships types and source maps.
- **Why this choice (alternatives rejected):** `moduleResolution: "bundler"` matches how both Next and Vite resolve our `exports` map. `declarationMap` + `sourceMap` + shipping `src/` is the go-to-source DX (spec §3.4) — consumers cmd-click into real source. `isolatedDeclarations` lets tsdown emit DTS fast in parallel via Oxc. Rejected: `node16` resolution (wrong model for a bundler-targeted ESM lib); skipping declaration maps (loses cross-project navigability).
- **Tradeoffs:** `isolatedDeclarations` requires explicit return types on exports — more annotation discipline, cleaner public types. Fallback documented.
- **What you'll run:** `pnpm exec tsc --noEmit` (after install).

- [ ] **Step 1 (agent authors):** Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["DOM", "DOM.Iterable", "ES2023"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "types": [],
    "strict": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "isolatedDeclarations": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "skipLibCheck": true,
    "noUncheckedIndexedAccess": true,
    "rootDir": "src",
    "outDir": "dist",
    "noEmit": true
  },
  "include": ["src"]
}
```

> `noEmit: true` here — tsc is the typecheck gate; **tsdown** does the actual emit (Task 1.6).

- [ ] **Step 2 `[USER RUNS]`:** Commit.

```bash
git add tsconfig.json && git commit -m "chore: library-grade tsconfig"
```

### Task 1.4: `package.json` — published shape

**Files:** Modify `package.json`

**Teaching Preamble**

- **Concept:** The manifest is the public contract: `exports` map, `sideEffects` CSS exception, peer/deps split, `files` (incl. `src`), `publishConfig`.
- **Why this choice (alternatives rejected):** ESM-only (`"type":"module"`, no `main`/CJS) — RSC + Vite both resolve ESM; CJS doubles surface and fights `"use client"`. `sideEffects` lists the CSS explicitly so consumers' `import "@scope/ui/styles.css"` is **not** tree-shaken (spec risk #3). `react` in `peerDependencies` with `>=19` floor (enables React Compiler `target:'19'` with no runtime dep, spec risk #9). `files: ["dist","src"]` ships source for go-to-source. Rejected: bundling React; `sideEffects:false` blanket; `private:true`.
- **Tradeoffs:** ESM-only excludes legacy CJS-only consumers (acceptable; not a target). Shipping `src` enlarges the tarball ~2× (acceptable; public lib).
- **What you'll run:** `pnpm publint` later validates this.

- [ ] **Step 1 (agent authors):** Set `package.json` to (scope name is a placeholder the owner finalizes — `@williamphelps13/ui` used here):

```json
{
  "name": "@williamphelps13/ui",
  "version": "0.0.0",
  "description": "Reusable React component library",
  "type": "module",
  "license": "MIT",
  "sideEffects": ["**/*.css", "./dist/styles.css"],
  "files": ["dist", "src"],
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    },
    "./styles.css": "./dist/styles.css"
  },
  "scripts": {
    "tokens": "node style-dictionary.config.mjs",
    "build": "pnpm tokens && tsdown",
    "typecheck": "tsc --noEmit",
    "lint": "eslint .",
    "format": "prettier --check .",
    "test": "vitest run",
    "knip": "knip",
    "assert:use-client": "node scripts/assert-use-client.mjs",
    "verify:pack": "publint && attw --pack"
  },
  "peerDependencies": {
    "react": ">=19",
    "react-dom": ">=19"
  },
  "publishConfig": {
    "access": "public",
    "provenance": true
  }
}
```

- [ ] **Step 2 `[USER RUNS]`:** Commit.

```bash
git add package.json && git commit -m "chore: published package shape (exports, sideEffects, peers)"
```

### Task 1.5: Install the Phase-1 toolchain

**Files:** Modify `package.json` (devDeps), create `pnpm-lock.yaml`

**Teaching Preamble**

- **Concept:** Install build/lint/type tooling as devDependencies; React goes in `devDependencies` too (for building/testing) while staying a `peerDependency` for consumers.
- **Why this choice (alternatives rejected):** tsdown for bundling (spec §3.2, alternatives already weighed in spec); `publint`+`@arethetypeswrong/cli` validate the published artifact. Rejected re-litigating the bundler — settled in the spec.
- **Tradeoffs:** Pinning exact versions (via `save-exact`) means manual bumps, but reproducible CI.
- **What you'll run:** the install commands below.

- [ ] **Step 1 `[USER RUNS]`:** Install runtime/peer + build tooling:

```bash
pnpm add -D react@catalog: react-dom@catalog: @types/react @types/react-dom \
  typescript@catalog: tsdown @rolldown/plugin-babel babel-plugin-react-compiler \
  publint @arethetypeswrong/cli
```

Expected: resolves with no peer errors; `pnpm-lock.yaml` created.

- [ ] **Step 2 `[USER RUNS]`:** Sanity-check the typechecker runs (no source yet → passes trivially):

```bash
pnpm typecheck
```

Expected: exits 0, no output.

- [ ] **Step 3 `[USER RUNS]`:** Commit.

```bash
git add package.json pnpm-lock.yaml && git commit -m "chore: install Phase 1 build toolchain"
```

### Task 1.6: tsdown config with React Compiler

**Files:** Create `tsdown.config.ts`

**Teaching Preamble**

- **Concept:** tsdown turns `src/` into per-module ESM + `.d.ts` + sourcemaps, running React Compiler during the build.
- **Why this choice (alternatives rejected):** `unbundle:true` keeps each module separate so `"use client"` boundaries stay granular and tree-shaking is maximal (spec §3.2, risk #8). Externalizing react/radix prevents duplicate instances in consumers (risk #4). React Compiler ships memoized output because consumers cannot compile our `dist` (spec §3.2). Rejected: single-bundle output (drags whole lib across client boundary); not externalizing peers (duplicate React).
- **Tradeoffs:** Per-module output = many files; that's the point for tree-shaking. React Compiler adds build time; net win for a UI lib.
- **What you'll run:** `pnpm build` once `src/index.ts` exists (Task 1.7).

- [ ] **Step 1 (agent authors):** Create `tsdown.config.ts`:

```ts
import { defineConfig } from 'tsdown'
import babel from '@rolldown/plugin-babel'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  unbundle: true,
  dts: true,
  sourcemap: true,
  external: [/^react($|\/)/, /^react-dom($|\/)/, /^radix-ui($|\/)/, /^@radix-ui\//],
  plugins: [
    babel({
      filter: /\.[jt]sx?$/,
      babelOptions: {
        plugins: [['babel-plugin-react-compiler', { target: '19' }]],
      },
    }),
  ],
})
```

> The exact `@rolldown/plugin-babel` option name/shape is the one spring-2026-volatile spot here. **Verification step 3 is the guard.**

- [ ] **Step 2 (agent authors):** Create minimal `src/index.ts` so the build has an entry:

```ts
export {}
```

- [ ] **Step 3 `[USER RUNS]`:** Build and inspect output:

```bash
pnpm build && ls -R dist
```

Expected: `dist/index.js` + `dist/index.d.ts` (+ `.map` files) emitted, exit 0.

- [ ] **Step 4 — guided debugging if Step 3 fails:** If the babel plugin option shape errors, the user runs `npx ctx7@latest library "tsdown" "react compiler @rolldown/plugin-babel recipe"` then `npx ctx7@latest docs <id> "..."`; agent coaches mapping the current recipe into the config. Do **not** silently rewrite — diagnose together.
- [ ] **Step 5 `[USER RUNS]`:** Commit.

```bash
git add tsdown.config.ts src/index.ts && git commit -m "build: tsdown ESM + React Compiler"
```

### Task 1.7: ESLint flat + Prettier + `"use client"` lint rule

**Files:** Create `eslint.config.ts`, `.prettierrc.json`, `.prettierignore`

**Teaching Preamble**

- **Concept:** ESLint enforces React-hooks/a11y/RSC correctness; Prettier owns formatting; `eslint-plugin-react-server-components` flags missing/extra `"use client"`.
- **Why this choice (alternatives rejected):** ESLint is the only stack with authoritative react-hooks v6/7 + jsx-a11y for a shipped UI lib (spec §3.10); Biome rejected for the documented hooks-rule gap. Rejected: Biome single-binary (hooks fidelity), no linter (a public lib must enforce a11y/hooks).
- **Tradeoffs:** ESLint slower than Rust linters → optional `oxlint` pre-pass added in Task 1.8.
- **What you'll run:** `pnpm lint`, `pnpm format`.

- [ ] **Step 1 `[USER RUNS]`:** Install lint/format tooling:

```bash
pnpm add -D eslint @eslint/js typescript-eslint eslint-plugin-react-hooks \
  eslint-plugin-jsx-a11y @eslint-react/eslint-plugin eslint-plugin-import-x \
  eslint-plugin-react-server-components prettier jiti
```

- [ ] **Step 2 (agent authors):** Create `eslint.config.ts`:

```ts
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import eslintReact from '@eslint-react/eslint-plugin'
import importX from 'eslint-plugin-import-x'
import rsc from 'eslint-plugin-react-server-components'

export default tseslint.config(
  { ignores: ['dist', 'build', 'storybook-static', 'coverage'] },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: { parserOptions: { projectService: true } },
    plugins: {
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y,
      '@eslint-react': eslintReact,
      'import-x': importX,
      'react-server-components': rsc,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.flatConfigs.strict.rules,
      'react-server-components/use-client': 'error',
    },
  },
)
```

> If a plugin's flat-config export path differs in its current version, that is a **guided-debugging** moment (Step 5), not a silent edit.

- [ ] **Step 3 (agent authors):** Create `.prettierrc.json`:

```json
{ "semi": false, "singleQuote": true, "printWidth": 100 }
```

- [ ] **Step 4 (agent authors):** Create `.prettierignore`:

```
dist
build
storybook-static
pnpm-lock.yaml
```

- [ ] **Step 5 `[USER RUNS]`:** Verify:

```bash
pnpm lint && pnpm format
```

Expected: lint exits 0 (no source); prettier reports all matched files formatted.

- [ ] **Step 6 `[USER RUNS]`:** Commit.

```bash
git add eslint.config.ts .prettierrc.json .prettierignore package.json pnpm-lock.yaml
git commit -m "chore: ESLint flat + Prettier + use-client lint rule"
```

### Task 1.8: `"use client"` build-time guardrail script

**Files:** Create `scripts/assert-use-client.mjs`; Test: same script run against `dist`

**Teaching Preamble**

- **Concept:** A CI assertion that scans built `dist` and fails if (a) a known client entrypoint lost its `"use client"` or (b) the barrel `index.js` accidentally carries one.
- **Why this choice (alternatives rejected):** Lint catches source; only a _post-build_ check catches directive hoisting/stripping by the bundler (spec risks #2, #8) — the failure mode that silently breaks every App Router consumer. Rejected: trusting lint alone; trusting the bundler.
- **Tradeoffs:** A small bespoke script to maintain; cheap insurance for the highest-severity risk.
- **What you'll run:** `pnpm assert:use-client` after build.

- [ ] **Step 1 — Write the failing test first (agent authors):** Create `scripts/assert-use-client.mjs`:

```js
import { readFileSync, existsSync } from 'node:fs'

const BARREL = 'dist/index.js'
// Phase 1 invariant: barrel must NOT declare "use client".
// (Per-component client entrypoints get added to CLIENT_ENTRIES from Phase 4+.)
const CLIENT_ENTRIES = []

let failed = false

if (existsSync(BARREL)) {
  const src = readFileSync(BARREL, 'utf8')
  if (/^\s*['"]use client['"]/.test(src)) {
    console.error(`FAIL: ${BARREL} must not carry "use client" (kills server rendering)`)
    failed = true
  }
}

for (const f of CLIENT_ENTRIES) {
  const src = readFileSync(f, 'utf8')
  if (!/^\s*['"]use client['"]/.test(src)) {
    console.error(`FAIL: ${f} lost its "use client" directive`)
    failed = true
  }
}

if (failed) process.exit(1)
console.log('OK: "use client" invariants hold')
```

- [ ] **Step 2 `[USER RUNS]`:** Run it against the current (empty) build — should pass (barrel has no directive):

```bash
pnpm build && pnpm assert:use-client
```

Expected: `OK: "use client" invariants hold`, exit 0.

- [ ] **Step 3 `[USER RUNS]`:** Prove it _can_ fail: temporarily prepend `'use client'` to `src/index.ts`, rebuild, run — expect FAIL — then revert.

```bash
# edit src/index.ts to start with: 'use client'
pnpm build && pnpm assert:use-client; echo "exit=$?"
git checkout -- src/index.ts
```

Expected: prints FAIL line, `exit=1`. After revert + rebuild it passes again.

- [ ] **Step 4 `[USER RUNS]`:** Commit.

```bash
git add scripts/assert-use-client.mjs && git commit -m "ci: build-time use-client guardrail"
```

### Task 1.9: knip, cspell, Changesets config

**Files:** Create `knip.json`, `cspell.json`, `.changeset/config.json`

**Teaching Preamble**

- **Concept:** knip = dead-code/unused-dep hygiene; cspell dictionary silences the domain-jargon doc noise; Changesets config sets public access + GitHub changelog (used in Phase 5).
- **Why this choice (alternatives rejected):** knip entry points must be declared or it false-flags public exports (spec risk #12). `access:"public"` in changeset config is _the_ gotcha for scoped packages. Rejected: depcheck (weaker); manual changelogs.
- **Tradeoffs:** knip config needs entry-point upkeep as the API grows (fine at Button scale).
- **What you'll run:** `pnpm knip`.

- [ ] **Step 1 `[USER RUNS]`:** Install:

```bash
pnpm add -D knip cspell @changesets/cli @changesets/changelog-github
```

- [ ] **Step 2 `[USER RUNS]`:** Init Changesets:

```bash
pnpm changeset init
```

Expected: creates `.changeset/config.json` + `README`.

- [ ] **Step 3 (agent authors):** Overwrite `.changeset/config.json`:

```json
{
  "$schema": "https://unpkg.com/@changesets/config@3/schema.json",
  "changelog": ["@changesets/changelog-github", { "repo": "OWNER/REPO" }],
  "commit": false,
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": []
}
```

> Replace `OWNER/REPO` with the GitHub slug when the remote exists (Phase 5, Task 5.1).

- [ ] **Step 4 (agent authors):** Create `knip.json`:

```json
{
  "$schema": "https://unpkg.com/knip@6/schema.json",
  "entry": ["src/index.ts"],
  "project": ["src/**/*.{ts,tsx}"],
  "ignore": ["scripts/**"],
  "ignoreBinaries": ["corepack"]
}
```

- [ ] **Step 5 (agent authors):** Create `cspell.json`:

```json
{
  "version": "0.2",
  "language": "en",
  "words": [
    "tsdown",
    "bunchee",
    "rslib",
    "oxlint",
    "knip",
    "attw",
    "publint",
    "DTCG",
    "oklch",
    "Rolldown",
    "tsgo",
    "subpaths",
    "unlayered",
    "renderable",
    "misconfig",
    "Turbosnap",
    "Changesets",
    "Storybook",
    "Vitest",
    "Radix"
  ],
  "ignorePaths": ["dist", "build", "pnpm-lock.yaml", "node_modules"]
}
```

- [ ] **Step 6 `[USER RUNS]`:** Verify:

```bash
pnpm knip
```

Expected: exits 0 (entry declared; no unused yet).

- [ ] **Step 7 `[USER RUNS]`:** Commit.

```bash
git add knip.json cspell.json .changeset package.json pnpm-lock.yaml
git commit -m "chore: knip + cspell + changesets config"
```

### Task 1.10: CI skeleton

**Files:** Create `.github/workflows/ci.yml`

**Teaching Preamble**

- **Concept:** One CI workflow runs the whole quality gate on every PR/push: lint, typecheck, build, use-client assertion, publint/attw.
- **Why this choice (alternatives rejected):** Validating the _packed artifact_ (`attw --pack`) is the only way to catch dual-consumer (RSC+Vite) resolution bugs before publish. Chromatic + Vitest jobs are appended in Phase 3 when they exist. Rejected: testing only source (misses packaging bugs).
- **Tradeoffs:** Slower PRs; correctness for a published lib outweighs it.
- **What you'll run:** push a branch / open a PR to see it run.

- [ ] **Step 1 (agent authors):** Create `.github/workflows/ci.yml`:

```yaml
name: CI
on:
  push: { branches: [main] }
  pull_request:
concurrency: { group: ci-${{ github.ref }}, cancel-in-progress: true }
jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 24, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm build
      - run: pnpm assert:use-client
      - run: pnpm verify:pack
      - run: pnpm knip
```

- [ ] **Step 2 `[USER RUNS]`:** Validate workflow syntax locally (optional, if `act`/`actionlint` available) or push a throwaway branch and confirm the run is green in GitHub Actions:

```bash
git add .github/workflows/ci.yml
git commit -m "ci: quality skeleton (lint/typecheck/build/pack/knip)"
git push origin HEAD   # if a remote exists; otherwise note for Phase 5
```

Expected: GitHub Actions "CI / quality" job passes (or note to verify in Phase 5 once the remote exists).

### 🚦 Phase 1 Quiz Gate (HARD — agent administers; do not proceed until passed)

Agent asks; user must articulate (not recite). Shaky → re-teach the specific item, re-quiz.

1. Why is the package **ESM-only**, and what specifically would shipping CJS too cost us given our two consumer types?
2. `sideEffects` is `false` _except_ the CSS. What concretely breaks for a consumer if we forgot the CSS exception?
3. Why is `react` a **peerDependency** with a `>=19` floor rather than a regular dependency — and how does that floor connect to React Compiler `target:'19'`?
4. What does `unbundle: true` buy us, and what would a single bundled chunk do to RSC consumers?
5. The `assert-use-client` script checks two opposite things. What are they, and which spec risk does each defend against?
6. Why does `tsc` have `noEmit: true` while tsdown does the real build?

Pass criterion: correct, in the user's own words, for all six. Then proceed to Phase 2.

---

# PHASE 2 — Token Slice

Goal: a Button-relevant DTCG token set compiled by Style Dictionary v5 into (a) `tokens.css` (`:root` + `[data-theme=dark]`) and (b) a Tailwind `@theme inline` artifact. No component yet.

### Task 2.1: Author the Button-relevant DTCG tokens

**Files:** Create `tokens/primitive/color.json`, `tokens/semantic/color.light.json`, `tokens/semantic/color.dark.json`, `tokens/$metadata.json`, `tokens/$themes.json`

**Teaching Preamble**

- **Concept:** Three tiers (spec §3.5): primitives (raw scale), semantic (intent; the override surface; flips light/dark), component (skip for Button). DTCG = `$value`/`$type`.
- **Why this choice (alternatives rejected):** Code-first DTCG so code is the source of truth and Figma mirrors (spec §3.5). Semantic-only override surface keeps the semver contract small. Rejected: hand-written CSS vars (no Figma round-trip, no validation); component tier now (YAGNI for Button).
- **Tradeoffs:** Indirection (primitive→semantic) for one button feels heavy now; it's the whole point of zero-rebuild theming later.
- **What you'll run:** nothing yet (compiled in Task 2.2).

- [ ] **Step 1 (agent authors):** `tokens/primitive/color.json`:

```json
{
  "color": {
    "blue": {
      "500": { "$value": "oklch(0.62 0.19 256)", "$type": "color" },
      "300": { "$value": "oklch(0.78 0.12 256)", "$type": "color" }
    },
    "gray": {
      "100": { "$value": "oklch(0.97 0 0)", "$type": "color" },
      "900": { "$value": "oklch(0.22 0 0)", "$type": "color" }
    },
    "white": { "$value": "oklch(1 0 0)", "$type": "color" },
    "red": { "500": { "$value": "oklch(0.58 0.22 27)", "$type": "color" } }
  }
}
```

- [ ] **Step 2 (agent authors):** `tokens/semantic/color.light.json`:

```json
{
  "color": {
    "primary": { "$value": "{color.blue.500}", "$type": "color" },
    "primary-fg": { "$value": "{color.white}", "$type": "color" },
    "neutral-bg": { "$value": "{color.gray.100}", "$type": "color" },
    "neutral-fg": { "$value": "{color.gray.900}", "$type": "color" },
    "danger": { "$value": "{color.red.500}", "$type": "color" },
    "ring": { "$value": "{color.blue.500}", "$type": "color" }
  }
}
```

- [ ] **Step 3 (agent authors):** `tokens/semantic/color.dark.json`:

```json
{
  "color": {
    "primary": { "$value": "{color.blue.300}", "$type": "color" },
    "primary-fg": { "$value": "{color.gray.900}", "$type": "color" },
    "neutral-bg": { "$value": "{color.gray.900}", "$type": "color" },
    "neutral-fg": { "$value": "{color.gray.100}", "$type": "color" },
    "danger": { "$value": "{color.red.500}", "$type": "color" },
    "ring": { "$value": "{color.blue.300}", "$type": "color" }
  }
}
```

- [ ] **Step 4 (agent authors):** `tokens/$metadata.json`:

```json
{ "tokenSetOrder": ["primitive/color", "semantic/color.light", "semantic/color.dark"] }
```

- [ ] **Step 5 (agent authors):** `tokens/$themes.json`:

```json
[
  {
    "id": "light",
    "name": "light",
    "selectedTokenSets": { "primitive/color": "source", "semantic/color.light": "enabled" }
  },
  {
    "id": "dark",
    "name": "dark",
    "selectedTokenSets": { "primitive/color": "source", "semantic/color.dark": "enabled" }
  }
]
```

- [ ] **Step 6 `[USER RUNS]`:** Commit.

```bash
git add tokens && git commit -m "tokens: Button-relevant DTCG primitive + semantic (light/dark)"
```

### Task 2.2: Style Dictionary v5 build (CSS vars + Tailwind `@theme inline`)

**Files:** Create `style-dictionary.config.mjs`; Modify `.gitignore` (already ignores `build/`)

**Teaching Preamble**

- **Concept:** SD v5 compiles DTCG → `build/tokens.css` (`:root` light + `[data-theme=dark]`) and `build/theme.css` (a `@theme inline { --color-*: var(--…) }` block Tailwind consumes).
- **Why this choice (alternatives rejected):** `outputReferences:true` keeps semantic tokens as `var(--primitive)` so one consumer override cascades (spec §3.5, risk #5). sd-transforms needs **explicit** `preprocessors:['tokens-studio']` (risk #6). A _custom_ format is required because SD has no built-in Tailwind v4 format. Rejected: resolving values (kills the override cascade); skipping sd-transforms (Tokens Studio refs won't resolve).
- **Tradeoffs:** A hand-written custom format to maintain; unavoidable (no built-in).
- **What you'll run:** `pnpm tokens`.

- [ ] **Step 1 `[USER RUNS]`:** Install:

```bash
pnpm add -D style-dictionary @tokens-studio/sd-transforms
```

- [ ] **Step 2 (agent authors):** Create `style-dictionary.config.mjs`:

```js
import StyleDictionary from 'style-dictionary'
import { register } from '@tokens-studio/sd-transforms'

register(StyleDictionary)

// Custom format: wrap CSS variables in Tailwind v4 `@theme inline`.
StyleDictionary.registerFormat({
  name: 'tailwind/theme-inline',
  format: ({ dictionary }) => {
    const vars = dictionary.allTokens
      .filter((t) => t.attributes?.category !== 'primitive')
      .map((t) => `  --color-${t.path.slice(1).join('-')}: var(--${t.name});`)
      .join('\n')
    return `@theme inline {\n${vars}\n}\n`
  },
})

const base = {
  source: ['tokens/primitive/color.json'],
  preprocessors: ['tokens-studio'],
  platforms: {},
}

function cssPlatform(extraSource, selector, file) {
  return {
    ...base,
    source: ['tokens/primitive/color.json', extraSource],
    platforms: {
      css: {
        transformGroup: 'tokens-studio',
        buildPath: 'build/',
        options: { outputReferences: true },
        files: [{ destination: file, format: 'css/variables', options: { selector } }],
      },
    },
  }
}

const light = new StyleDictionary(
  cssPlatform('tokens/semantic/color.light.json', ':root', 'tokens.light.css'),
)
const dark = new StyleDictionary(
  cssPlatform('tokens/semantic/color.dark.json', '[data-theme="dark"]', 'tokens.dark.css'),
)
const theme = new StyleDictionary({
  ...base,
  source: ['tokens/primitive/color.json', 'tokens/semantic/color.light.json'],
  platforms: {
    tw: {
      transformGroup: 'tokens-studio',
      buildPath: 'build/',
      files: [{ destination: 'theme.css', format: 'tailwind/theme-inline' }],
    },
  },
})

await Promise.all([light.buildAllPlatforms(), dark.buildAllPlatforms(), theme.buildAllPlatforms()])
```

> Concatenation of `tokens.light.css` + `tokens.dark.css` into `tokens.css` happens in Task 3.2's CSS entry via `@import`. Keep them separate here.

- [ ] **Step 3 `[USER RUNS]`:** Build tokens and inspect:

```bash
pnpm tokens && cat build/tokens.light.css build/tokens.dark.css build/theme.css
```

Expected: `:root { --color-primary: var(--color-blue-500); … }`, a `[data-theme="dark"]` block, and a `@theme inline { --color-primary: var(--color-primary); … }` block. Crucially, semantic vars must be `var(--…)` references, **not** resolved `oklch(...)`.

- [ ] **Step 4 — guided debugging if Step 3 shows resolved values instead of `var()`:** user inspects whether `outputReferences:true` is set and whether `preprocessors:['tokens-studio']` is present; agent coaches against spec risks #5/#6. No silent fix.
- [ ] **Step 5 `[USER RUNS]`:** Commit (build/ is gitignored — commit only config):

```bash
git add style-dictionary.config.mjs package.json pnpm-lock.yaml
git commit -m "tokens: Style Dictionary v5 build (CSS vars + Tailwind @theme inline)"
```

### Task 2.3: Tokens Studio (Figma) sync wiring — documentation

**Files:** Create `tokens/README.md`

**Teaching Preamble**

- **Concept:** Tokens Studio (Figma plugin) points its GitHub multi-file storage at `tokens/`; code stays the source of truth; designer edits arrive via branch + PR.
- **Why this choice (alternatives rejected):** Documenting the contract now (not wiring a live plugin in code) keeps Milestone 0 dev-driven while making the round-trip explicit. Rejected: Figma-first (designers drive tokens — not this team's model); no doc (drift).
- **Tradeoffs:** Sync is manual/process, not automated CI — acceptable at this scale.
- **What you'll run:** nothing (process doc).

- [ ] **Step 1 (agent authors):** Create `tokens/README.md` documenting: DTCG format, the three sets, that Tokens Studio uses GitHub provider in multi-file mode pointed at `tokens/`, code is source of truth, designers PR changes, never push to `main` directly.
- [ ] **Step 2 `[USER RUNS]`:** Commit.

```bash
git add tokens/README.md && git commit -m "docs(tokens): Tokens Studio sync contract"
```

### 🚦 Phase 2 Quiz Gate (HARD)

1. Walk the cascade: a consumer sets `--color-primary` in their `:root`. Trace exactly how that reaches a Button's background, through SD output → Tailwind → utility.
2. Why must `outputReferences` be `true`? Show what the generated CSS looks like with it vs. without, and which spec risk the "without" case is.
3. Why is `preprocessors: ['tokens-studio']` explicitly set, and what's the failure mode if omitted?
4. Why is the semantic tier — not primitives or component tokens — the only semver-stable public contract?
5. Why did we need a _custom_ Style Dictionary format instead of a built-in one?

Pass criterion: all five in the user's own words. Then Phase 3.

---

# PHASE 3 — Styling + Storybook + Visual-Regression Harness

Goal: Tailwind v4 compiled to precompiled CSS with the zero-specificity strategy; Storybook 10 (CSF factories) with theme/palette toolbar and accurate prop docs; Vitest browser mode running stories as tests with a11y; Chromatic + TurboSnap wired. Still no component — a placeholder story proves the harness.

### Task 3.1: Tailwind v4 entry CSS (zero-specificity strategy)

**Files:** Create `src/styles/index.css`

> ⚠️ **SUPERSEDED in Phase-3 execution — the shipped `src/styles/index.css` differs from the draft below.** Changes: layered imports with **Preflight omitted**; `source(none)` + `@source "../components"` instead of whole-repo scanning (which had been scraping classes from `docs/*.md`); `prefix(tw)` **rejected** (it renames theme vars `--color-*` → `--tw-color-*` and breaks the override contract); and `btn*` → self-contained `ui-btn*`. Rationale lives in the `prefix(tw)`-rejected entry of the Execution-deviations log; the source of truth is the shipped file. The draft below is retained for history only.

**Teaching Preamble**

- **Concept:** The CSS entry imports Tailwind + generated tokens, binds tokens via `@theme inline`, defines a zero-specificity `:where()` dark variant, and namespaces with `prefix(tw)`.
- **Why this choice (alternatives rejected):** `@theme inline` (not plain `@theme`) is the single highest-risk detail — plain `@theme` breaks consumer overrides in portals (spec risk #1). `:where()` keeps dark/palette specificity zero so consumers override with no `!important` (spec §3.6, risk #10). `prefix(tw)` avoids collisions with consumer Tailwind. Rejected: plain `@theme`; class-based dark without `:where()` (specificity wars); no prefix (collisions).
- **Tradeoffs:** `prefix(tw)` makes internal classes verbose; invisible to consumers (precompiled).
- **What you'll run:** the compiled CSS is produced in Task 3.2.

- [ ] **Step 1 (agent authors):** Create `src/styles/index.css`:

```css
@import 'tailwindcss' prefix(tw);

/* Generated token layers (paths resolved at build, Task 3.2). */
@import '../../build/tokens.light.css';
@import '../../build/tokens.dark.css';
@import '../../build/theme.css';

/* Zero-specificity dark variant — matches token pipeline selector. */
@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));

/* Component classes go through @utility (predictable override order). */
@utility btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
  outline: 2px solid transparent;
  outline-offset: 2px;
}
@utility btn-primary {
  background: var(--color-primary);
  color: var(--color-primary-fg);
}
@utility btn-neutral {
  background: var(--color-neutral-bg);
  color: var(--color-neutral-fg);
}
@utility btn-danger {
  background: var(--color-danger);
  color: var(--color-primary-fg);
}
@utility btn-sm {
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
}
@utility btn-md {
  padding: 0.5rem 1rem;
  font-size: 1rem;
}
@utility btn-focus {
}
.btn:focus-visible {
  outline-color: var(--color-ring);
}
```

- [ ] **Step 2 `[USER RUNS]`:** Commit.

```bash
git add src/styles/index.css && git commit -m "style: Tailwind v4 entry (@theme inline, :where dark, @utility)"
```

### Task 3.2: Compile precompiled CSS in the build

**Files:** Modify `package.json` (scripts), `tsdown.config.ts` (copy CSS) or add a CSS build step

**Teaching Preamble**

- **Concept:** Tailwind CLI compiles `src/styles/index.css` → `dist/styles.css` as part of `pnpm build`, after tokens are generated.
- **Why this choice (alternatives rejected):** Precompiled CSS shipped as one file means consumers never run Tailwind (spec §1/§3.6). Build order: tokens → CSS → bundle. Rejected: a runtime CSS-in-JS approach (RSC-hostile, runtime cost); requiring consumer Tailwind (breaks the contract).
- **Tradeoffs:** Two build artifacts (JS + CSS) to keep in the `exports` map; already wired in Task 1.4.
- **What you'll run:** `pnpm build` then inspect `dist/styles.css`.

- [ ] **Step 1 `[USER RUNS]`:** Install Tailwind v4 CLI:

```bash
pnpm add -D tailwindcss@catalog: @tailwindcss/cli
```

- [ ] **Step 2 (agent authors):** Update `package.json` scripts:

```json
{
  "scripts": {
    "tokens": "node style-dictionary.config.mjs",
    "css": "tailwindcss -i src/styles/index.css -o dist/styles.css",
    "build": "pnpm tokens && pnpm css && tsdown",
    "typecheck": "tsc --noEmit",
    "lint": "eslint .",
    "format": "prettier --check .",
    "test": "vitest run",
    "knip": "knip",
    "assert:use-client": "node scripts/assert-use-client.mjs",
    "verify:pack": "publint && attw --pack"
  }
}
```

- [ ] **Step 3 `[USER RUNS]`:** Build and verify the CSS is real and override-safe:

```bash
pnpm build && grep -n "color-primary" dist/styles.css | head
```

Expected: `dist/styles.css` exists; utilities reference `var(--color-primary)` (not a hard-coded color); a `:root` and `[data-theme="dark"]` block are present.

- [ ] **Step 4 — guided debugging if `@theme inline` produced indirection:** user diffs behavior of `@theme` vs `@theme inline` per spec risk #1; agent coaches. No silent fix.
- [ ] **Step 5 `[USER RUNS]`:** Commit.

```bash
git add package.json pnpm-lock.yaml && git commit -m "build: compile precompiled dist/styles.css"
```

### Task 3.3: Storybook 10 install + config (CSF factories, docgen)

**Files:** Create `.storybook/main.ts`, `.storybook/preview.ts`

**Teaching Preamble**

- **Concept:** Storybook 10 on `@storybook/react-vite` is dev/docs/test harness; `react-docgen-typescript` gives accurate prop tables; precompiled CSS is imported once in preview.
- **Why this choice (alternatives rejected):** Greenfield on the current major (CSF factories + addon-vitest materially better, spec §3.8). `react-docgen-typescript` over default `react-docgen` for accurate (Radix-extended later) prop types. Importing the _precompiled_ CSS (no Tailwind Vite plugin) makes the preview match real consumers. Rejected: SB 9 (older harness); default react-docgen (inaccurate types); compiling Tailwind in SB (drift from shipped artifact).
- **Tradeoffs:** `react-docgen-typescript` is slower; bounded at this scale.
- **What you'll run:** the SB init + `pnpm storybook`.

- [ ] **Step 1 `[USER RUNS]`:** Scaffold Storybook 10 (interactive — answer React/Vite):

```bash
pnpm create storybook@latest
```

Expected: `.storybook/` created, `storybook`/`build-storybook` scripts added, deps installed.

- [ ] **Step 2 `[USER RUNS]`:** Add the addons we rely on:

```bash
pnpm add -D @storybook/addon-a11y @storybook/addon-themes @storybook/addon-vitest \
  @vitest/browser-playwright react-docgen-typescript
pnpm exec playwright install chromium
```

- [ ] **Step 3 (agent authors):** Overwrite `.storybook/main.ts`:

```ts
import type { StorybookConfig } from '@storybook/react-vite'

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-a11y', '@storybook/addon-themes', '@storybook/addon-vitest'],
  framework: { name: '@storybook/react-vite', options: {} },
  typescript: {
    reactDocgen: 'react-docgen-typescript',
    reactDocgenTypescriptOptions: {
      shouldExtractLiteralValuesFromEnum: true,
      propFilter: (prop) =>
        !/node_modules/.test(prop.parent?.fileName ?? '') ||
        /@radix-ui/.test(prop.parent?.fileName ?? ''),
    },
  },
}
export default config
```

- [ ] **Step 4 (agent authors):** Overwrite `.storybook/preview.ts`:

```ts
import type { Preview } from '@storybook/react-vite'
import { withThemeByDataAttribute } from '@storybook/addon-themes'
import '../dist/styles.css'

export const decorators = [
  withThemeByDataAttribute({
    attributeName: 'data-theme',
    themes: { light: 'light', dark: 'dark' },
    defaultTheme: 'light',
  }),
]

export const globalTypes = {
  palette: {
    description: 'Override semantic palette',
    toolbar: {
      title: 'Palette',
      items: [
        { value: 'default', title: 'Default' },
        { value: 'brand', title: 'Brand (override)' },
      ],
    },
  },
}
export const initialGlobals = { palette: 'default' }

const withPalette = (Story, ctx) => {
  const el = document.documentElement
  if (ctx.globals.palette === 'brand')
    el.style.setProperty('--color-primary', 'oklch(0.55 0.2 320)')
  else el.style.removeProperty('--color-primary')
  return Story()
}

const preview: Preview = {
  decorators: [withPalette],
  parameters: { a11y: { test: 'error' } },
}
export default preview
```

- [ ] **Step 5 `[USER RUNS]`:** Run Storybook; confirm it boots (no stories yet is fine) and the toolbar shows Theme + Palette:

```bash
pnpm storybook
```

Expected: Storybook opens; theme & palette toolbar controls present. Ctrl-C to stop.

- [ ] **Step 6 `[USER RUNS]`:** Commit.

```bash
git add .storybook package.json pnpm-lock.yaml
git commit -m "chore: Storybook 10 (react-vite, addons, docgen, theme/palette toolbar)"
```

### Task 3.4: Vitest browser-mode wiring (stories as tests + a11y)

**Files:** Create `vitest.config.ts`, `.storybook/vitest.setup.ts`

**Teaching Preamble**

- **Concept:** One Vitest run executes every story in real Chromium; `play` stories become interaction tests, all get axe a11y; a second jsdom project runs pure unit tests.
- **Why this choice (alternatives rejected):** Browser mode because Radix/focus/portals and Tailwind layout need real CSS — jsdom mishandles all three (spec §3.8). Stories-as-tests removes duplicate test scaffolding. Rejected: jsdom for components (false greens); separate test-runner (SB 10 consolidated this into addon-vitest).
- **Tradeoffs:** Browser tests are heavier; the scale-time perf levers are deferred (spec §3.8).
- **What you'll run:** `pnpm test`.

- [ ] **Step 1 (agent authors):** Create `.storybook/vitest.setup.ts`:

```ts
import { setProjectAnnotations } from '@storybook/react-vite'
import * as a11yAddonAnnotations from '@storybook/addon-a11y/preview'
import * as previewAnnotations from './preview'

setProjectAnnotations([a11yAddonAnnotations, previewAnnotations])
```

- [ ] **Step 2 (agent authors):** Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin'
import { playwright } from '@vitest/browser-playwright'

export default defineConfig({
  test: {
    projects: [
      {
        plugins: [storybookTest({ configDir: '.storybook' })],
        test: {
          name: 'storybook',
          browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            instances: [{ browser: 'chromium' }],
          },
          setupFiles: ['./.storybook/vitest.setup.ts'],
        },
      },
      {
        test: { name: 'unit', environment: 'jsdom', include: ['src/**/*.test.ts'] },
      },
    ],
  },
})
```

> The SB↔Vitest↔addon-vitest peer triad is spec risk #7 — if `pnpm test` errors on plugin/provider API, that is the **guided-debugging** path (verify current addon-vitest docs via ctx7), not a silent rewrite.

- [ ] **Step 3 `[USER RUNS]`:** Run tests (no stories yet → "no tests" is acceptable; we just prove the harness loads):

```bash
pnpm test
```

Expected: Vitest starts both projects, Chromium launches headless, exits 0 with no failures.

- [ ] **Step 4 `[USER RUNS]`:** Commit.

```bash
git add vitest.config.ts .storybook/vitest.setup.ts
git commit -m "test: Vitest browser mode + storybook + a11y wiring"
```

### Task 3.5: Chromatic + TurboSnap wiring

> **SUPERSEDED by the B3 spec + sub-plan (executed without Teaching Mode):**
> `docs/superpowers/specs/2026-05-25-chromatic-b3-design.md` (`745b6df`) +
> `docs/superpowers/plans/2026-05-25-chromatic-b3.md` (`af0cf0b`). Original
> Teaching-Mode walkthrough preserved below for historical reference.

**Files:** Create `chromatic.config.json`; Modify `.github/workflows/ci.yml`

**Teaching Preamble**

- **Concept:** Chromatic snapshots the built Storybook; TurboSnap (`onlyChanged`) re-snaps only affected stories; it becomes a required release gate.
- **Why this choice (alternatives rejected):** Standing up the Chromatic↔Storybook↔CI↔TurboSnap↔gate integration in isolation on one component is the explicit Milestone 0 reason (spec §4.1) — it's the historically painful piece. Rejected: deferring it (debugging it later amid many components + real diffs is strictly worse, spec rationale).
- **Tradeoffs:** External SaaS + a project token; TurboSnap + one component keeps it in free tier.
- **What you'll run:** `npx chromatic` (after a story exists, Phase 4) and the CI integration.

- [ ] **Step 1 `[USER RUNS]`:** Install + create a Chromatic project (gets a project token from chromatic.com):

```bash
pnpm add -D chromatic @chromatic-com/storybook
```

- [ ] **Step 2 (agent authors):** Create `chromatic.config.json`:

```json
{ "onlyChanged": true, "exitZeroOnChanges": "!(main)" }
```

- [ ] **Step 3 (agent authors):** Append a Chromatic job to `.github/workflows/ci.yml`:

```yaml
chromatic:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
      with: { fetch-depth: 0 }
    - uses: pnpm/action-setup@v4
    - uses: actions/setup-node@v4
      with: { node-version: 24, cache: pnpm }
    - run: pnpm install --frozen-lockfile
    - run: pnpm build
    - uses: chromaui/action@latest
      with:
        projectToken: ${{ secrets.CHROMATIC_PROJECT_TOKEN }}
        onlyChanged: true
        exitZeroOnChanges: ${{ github.ref != 'refs/heads/main' }}
```

- [ ] **Step 4 `[USER RUNS]`:** Add the `CHROMATIC_PROJECT_TOKEN` secret to the GitHub repo (note this for Phase 5 if the remote doesn't exist yet). Verify config commits cleanly:

```bash
git add chromatic.config.json .github/workflows/ci.yml
git commit -m "ci: Chromatic + TurboSnap (required release gate)"
```

Expected: a clean commit; first real Chromatic run happens in Phase 4 once a story exists.

### 🚦 Phase 3 Quiz Gate (HARD)

1. Why `@theme inline` rather than `@theme`? What concretely breaks for a consumer with the wrong one, and where (which DOM situation)?
2. Why does the dark variant use `:where()`? What would `.dark &` do to a consumer's override attempt?
3. Why import the _precompiled_ `dist/styles.css` into Storybook instead of compiling Tailwind inside Storybook?
4. Why browser mode (not jsdom) for component tests — name two concrete things jsdom gets wrong here.
5. We're wiring Chromatic now with zero components. Argue _why_ that's the right call given Milestone 0's purpose.

Pass criterion: all five in the user's own words. Then Phase 4.

---

# PHASE 4 — Button

Goal: a real, server-renderable `Button` with typed variants, token-driven styling, CSF-factory stories, interaction + a11y tests, React-Compiler-verified build, publint/attw green, first Chromatic baseline. TDD.

### Task 4.1: Button variant logic (unit, TDD)

**Files:** Create `src/components/button/variants.ts`, `src/components/button/button.test.ts`

**Teaching Preamble**

- **Concept:** A pure function maps `{intent,size}` → the `@utility` class string. Pure logic = fast jsdom unit test, no browser.
- **Why this choice (alternatives rejected):** Separating class resolution from the component keeps the component thin and the logic unit-testable (TDD). Rejected: inline conditional classNames in JSX (untestable in isolation, harder to reason about).
- **Tradeoffs:** One extra tiny module; pays off in testability and the bake-off comparison.
- **What you'll run:** `pnpm test`.

- [ ] **Step 1 — Write the failing test (agent authors):** `src/components/button/button.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { buttonClasses } from './variants'

describe('buttonClasses', () => {
  it('composes base + intent + size', () => {
    expect(buttonClasses('primary', 'md')).toBe('ui-btn ui-btn-primary ui-btn-md')
  })
  it('supports danger + sm', () => {
    expect(buttonClasses('danger', 'sm')).toBe('ui-btn ui-btn-danger ui-btn-sm')
  })
})
```

- [ ] **Step 2 `[USER RUNS]`:** Confirm it fails:

```bash
pnpm test
```

Expected: FAIL — `./variants` not found / `buttonClasses` undefined.

- [ ] **Step 3 — Minimal implementation (agent authors):** `src/components/button/variants.ts`:

```ts
export type Intent = 'primary' | 'neutral' | 'danger'
export type Size = 'sm' | 'md'

export function buttonClasses(intent: Intent, size: Size): string {
  return `ui-btn ui-btn-${intent} ui-btn-${size}`
}
```

- [ ] **Step 4 `[USER RUNS]`:** Confirm it passes:

```bash
pnpm test
```

Expected: PASS (unit project green).

- [ ] **Step 5 `[USER RUNS]`:** Commit.

```bash
git add src/components/button/variants.ts src/components/button/button.test.ts
git commit -m "feat(button): variant class resolution (TDD)"
```

### Task 4.2: Button component (server-renderable)

**Files:** Create `src/components/button/button.tsx`; Modify `src/index.ts`

**Teaching Preamble**

- **Concept:** A typed, ref-forwarding `<button>` consuming `buttonClasses`; **no `"use client"`** — it has no hooks/state, so it stays a Server Component (proves the no-directive path, spec §3.3).
- **Why this choice (alternatives rejected):** Explicit return type (for `isolatedDeclarations`), `className` merge, forwarded ref, `...rest` passthrough — the working conventions (spec §3.7) the bake-off will test. Rejected: adding `"use client"` "to be safe" (would needlessly force client rendering, spec risk #8).
- **Tradeoffs:** No client-only affordances yet (none needed for Button).
- **What you'll run:** `pnpm build && pnpm assert:use-client`.

- [ ] **Step 1 (agent authors):** `src/components/button/button.tsx`:

```tsx
import { forwardRef, type ButtonHTMLAttributes, type ForwardedRef } from 'react'
import { buttonClasses, type Intent, type Size } from './variants'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  intent?: Intent
  size?: Size
}

export const Button = forwardRef(function Button(
  { intent = 'primary', size = 'md', className, ...rest }: ButtonProps,
  ref: ForwardedRef<HTMLButtonElement>,
): React.ReactElement {
  const classes = [buttonClasses(intent, size), className].filter(Boolean).join(' ')
  return <button ref={ref} className={classes} {...rest} />
})
```

- [ ] **Step 2 (agent authors):** Set `src/index.ts`:

```ts
export { Button, type ButtonProps } from './components/button/button'
export type { Intent, Size } from './components/button/variants'
```

- [ ] **Step 3 `[USER RUNS]`:** Build, verify directive invariant + types:

```bash
pnpm build && pnpm assert:use-client && pnpm typecheck && pnpm verify:pack
```

Expected: build OK; `OK: "use client" invariants hold`; typecheck 0; publint/attw clean.

- [ ] **Step 4 `[USER RUNS]`:** Commit.

```bash
git add src/components/button/button.tsx src/index.ts
git commit -m "feat(button): server-renderable Button"
```

### Task 4.3: Button stories (CSF factory) + interaction `play`

**Files:** Create `src/components/button/button.stories.tsx`

**Teaching Preamble**

- **Concept:** CSF-factory stories; one story has a `play` (click → assertion) becoming a Vitest interaction test; a11y runs on all via the addon.
- **Why this choice (alternatives rejected):** CSF factory removes `Meta`/`StoryObj` boilerplate with end-to-end inference (spec §3.8). `play` is the single source for interaction tests (no separate spec file). Rejected: CSF3 (more boilerplate); RTL component test files (duplicates the story).
- **Tradeoffs:** CSF factory is experimental → SB minors pinned (Task 1.2 catalog / lockfile).
- **What you'll run:** `pnpm test` (stories now run).

- [ ] **Step 1 — Write the story-as-failing-test (agent authors):** `src/components/button/button.stories.tsx`:

```tsx
import preview from '../../../.storybook/preview'
import { expect, userEvent, within, fn } from 'storybook/test'
import { Button } from './button'

const meta = preview.meta({
  title: 'Components/Button',
  component: Button,
  args: { children: 'Button' },
})

export const Primary = meta.story({ args: { intent: 'primary' } })
export const Danger = meta.story({ args: { intent: 'danger' } })
export const Small = meta.story({ args: { size: 'sm' } })

export const Clicks = meta.story({
  args: { onClick: fn() },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: 'Button' }))
    await expect(args.onClick).toHaveBeenCalledOnce()
  },
})
```

> If the CSF-factory import shape differs in the installed SB 10 minor, that is **guided debugging** (check current SB docs via ctx7), not a silent rewrite.

- [ ] **Step 2 `[USER RUNS]`:** Run tests — stories execute, `Clicks` `play` is an interaction test, a11y runs:

```bash
pnpm test
```

Expected: storybook project runs Button stories; all pass; a11y `error` finds no violations.

- [ ] **Step 3 `[USER RUNS]`:** Eyeball it in Storybook; toggle Theme=dark and Palette=Brand and confirm the Button recolors with no rebuild:

```bash
pnpm storybook
```

Expected: dark + brand palette visibly change Button colors. Ctrl-C.

- [ ] **Step 4 `[USER RUNS]`:** Commit.

```bash
git add src/components/button/button.stories.tsx
git commit -m "test(button): CSF-factory stories + interaction play + a11y"
```

### Task 4.4: First Chromatic baseline

**Files:** none (uses existing config)

**Teaching Preamble**

- **Concept:** First `chromatic` run establishes the Button baselines; subsequent runs diff against them.
- **Why this choice (alternatives rejected):** Establishing the baseline now, with the visual system stable, is what makes later diffs meaningful and the gate trustworthy. Rejected: skipping until scaling (spec §4.1 rationale).
- **Tradeoffs:** First run accepts everything as baseline (expected).
- **What you'll run:** the Chromatic CLI.

- [ ] **Step 1 `[USER RUNS]`:** Build Storybook + run Chromatic (uses the project token from Task 3.5):

```bash
pnpm build
CHROMATIC_PROJECT_TOKEN=<token> pnpm exec chromatic --build-script-name=build-storybook
```

Expected: snapshots uploaded; first run sets baselines; a Chromatic build URL is printed.

- [ ] **Step 2 `[USER RUNS]`:** Accept the initial baselines in the Chromatic UI.
      Expected: build marked passed; baselines stored.
- [ ] **Step 3 `[USER RUNS]`:** Commit (nothing code-side; record the milestone):

```bash
git commit --allow-empty -m "chore(chromatic): initial Button baselines accepted"
```

### 🚦 Phase 4 Quiz Gate (HARD)

1. Why does `Button` have **no** `"use client"`? What is the precise rule for when a component in this library needs it?
2. How does a single `play` function end up being an interaction test _and_ contribute an a11y check — what wired that?
3. You toggled Palette=Brand and the Button recolored with no rebuild. Explain the full mechanism (consumer override → … → painted pixel).
4. What does the first Chromatic run do differently from every subsequent run, and why is "accept everything" correct here?
5. `pnpm verify:pack` passed. What two distinct classes of bug do publint and attw each catch?

Pass criterion: all five in the user's own words. Then Phase 5.

---

# PHASE 5 — Workflow Loop (the core deliverable)

Goal: publish `0.1.0` for real, consume it from the pilot Next.js App Router app, apply a theme, run the consumer-driven change → Chromatic-accept → republish (`0.x`/`canary`) → `pnpm update` loop until friction-free, and write `docs/workflow.md`.

### Task 5.1: GitHub remote + release workflow + OIDC trusted publishing

**Files:** Create `.github/workflows/release.yml`; Modify `.changeset/config.json` (`OWNER/REPO`)

**Teaching Preamble**

- **Concept:** Changesets opens a "Version Packages" PR; merging publishes to npm via OIDC trusted publishing (no `NPM_TOKEN`), provenance automatic.
- **Why this choice (alternatives rejected):** OIDC eliminates long-lived npm tokens and gives automatic provenance (spec §3.9). Real publish is the authoritative loop (spec §4.1) because it's exactly what the team's other consumed libraries do. Rejected: `NPM_TOKEN` (secret sprawl); `npm link` for the loop (bypasses the packaging we must validate).
- **Tradeoffs:** OIDC needs npm trusted-publisher registration (one-time, manual on npmjs.com).
- **What you'll run:** repo creation, npm trusted-publisher setup, the release PR merge.

- [ ] **Step 1 `[USER RUNS]`:** Create the GitHub repo + push (if not already remote):

```bash
gh repo create wphelps/ui --private --source=. --remote=origin --push
```

- [ ] **Step 2 (agent authors):** Update `.changeset/config.json` `repo` to the real `wphelps/ui`.
- [ ] **Step 3 (agent authors):** Create `.github/workflows/release.yml`:

```yaml
name: Release
on: { push: { branches: [main] } }
concurrency: release-${{ github.ref }}
permissions:
  contents: write
  pull-requests: write
  id-token: write
jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 24, cache: pnpm, registry-url: 'https://registry.npmjs.org' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm build && pnpm test && pnpm verify:pack && pnpm assert:use-client
      - uses: changesets/action@v1
        with:
          version: pnpm changeset version
          publish: pnpm changeset publish
```

- [ ] **Step 4 `[USER RUNS]`:** On npmjs.com, register `wphelps/ui` (or chosen scope) as a **Trusted Publisher** pointing at this repo + `Release` workflow. Add `CHROMATIC_PROJECT_TOKEN` repo secret (Task 3.5).
- [ ] **Step 5 `[USER RUNS]`:** Commit + push.

```bash
git add .github/workflows/release.yml .changeset/config.json
git commit -m "ci: Changesets release workflow + OIDC trusted publishing"
git push
```

Expected: CI (incl. Chromatic) runs green on `main`.

### Task 5.2: First real publish — `0.1.0`

**Files:** Create a changeset

**Teaching Preamble**

- **Concept:** A changeset describes the version bump; merging the generated PR triggers the real npm publish.
- **Why this choice (alternatives rejected):** Going to a real registry version (not a tarball) is the point — it exercises OIDC/provenance/version mechanics the loop must prove. Rejected: skipping straight to `1.0.0` (pre-1.0 churn is expected and keeps semver honest, spec §4.1).
- **Tradeoffs:** Real version numbers consumed during ironing-out — mitigated by staying `0.x` and using `canary` (Task 5.4).
- **What you'll run:** `pnpm changeset`, PR merge, `npm view`.

- [ ] **Step 1 `[USER RUNS]`:** Create the changeset (choose **minor** → `0.1.0`):

```bash
pnpm changeset
```

Expected: a markdown file under `.changeset/`.

- [ ] **Step 2 `[USER RUNS]`:** Commit, push, open PR, merge to `main`:

```bash
git add .changeset && git commit -m "chore: changeset for 0.1.0 (Button)"
git push
```

- [ ] **Step 3 `[USER RUNS]`:** Merge the auto-opened "Version Packages" PR; watch the `Release` job publish.
      Expected: `npm view @williamphelps13/ui version` → `0.1.0`; npm shows provenance.
- [ ] **Step 4 — guided debugging if publish fails (e.g. OIDC/access):** user reads the Actions log; agent coaches against spec §3.9 (access:public, id-token:write, trusted-publisher registration). No silent fix.

### Task 5.3: Integrate into the pilot Next.js App Router app + apply theme

**Files:** (in the pilot app — owner supplies path) a route + a small client theme toggle; `app/layout.tsx` CSS import; `app/globals.css` palette override

**Teaching Preamble**

- **Concept:** Install the real published package, import the CSS once at the root layout (Server Component), render `<Button>` in a route, override the palette + toggle dark from a tiny client component — proving zero-rebuild theming and RSC correctness.
- **Why this choice (alternatives rejected):** App Router is the riskiest consumer (spec §4.1) so we de-risk it first. CSS import in root `layout.tsx` is the documented contract. Rejected: a Vite SPA pilot first (lower risk, less learning); importing CSS per-component (wrong place).
- **Tradeoffs:** Touches an existing app; keep changes isolated to one route.
- **What you'll run:** install, `next dev`, theme toggling.

- [ ] **Step 1 `[USER RUNS]`:** In the pilot app, install the published package:

```bash
pnpm add @williamphelps13/ui
```

- [ ] **Step 2 (agent authors, in pilot app):** Add to root `app/layout.tsx` (top): `import '@williamphelps13/ui/styles.css'`.
- [ ] **Step 3 (agent authors, in pilot app):** A route `app/ui-test/page.tsx` (Server Component) rendering `<Button intent="primary">Hello</Button>` and `<Button intent="danger">Danger</Button>`.
- [ ] **Step 4 (agent authors, in pilot app):** `app/globals.css` (after the lib import) adds `:root { --color-primary: oklch(0.55 0.2 320); }` and a small `"use client"` toggle component setting `document.documentElement.dataset.theme`.
- [ ] **Step 5 `[USER RUNS]`:** Run the app, verify:

```bash
pnpm dev
```

Expected: `/ui-test` renders Buttons server-side (view-source shows markup), the brand override recolors them, the toggle flips dark — all with no rebuild of the library.

- [ ] **Step 6 — guided debugging if styles missing / RSC error:** check import order (lib CSS before overrides), root-layout import, server/client boundary; agent coaches against spec risks #1/#3/#10. No silent fix.
- [ ] **Step 7 `[USER RUNS]`:** Commit (in the pilot app repo).

```bash
git add app && git commit -m "test: consume @williamphelps13/ui Button + theme override"
```

### Task 5.4: Run the change → republish → re-consume loop

**Files:** iterate on `src/components/button/*`; changesets; `canary` dist-tag

**Teaching Preamble**

- **Concept:** Exercise the real loop: consumer needs a Button tweak → change here → Chromatic flags the diff on the PR → accept baseline → changeset → publish a `0.x` under `canary` → consumer installs `@williamphelps13/ui@canary` → verify → promote to `latest`.
- **Why this choice (alternatives rejected):** `canary` dist-tag keeps `latest` clean during churn while still being a _real_ publish (spec §4.1). `pnpm pack` is the optional fast pre-publish sanity check. Rejected: only `latest` (pollutes during experimentation); pkg.pr.new (deferred, spec §4.2).
- **Tradeoffs:** Two-step (canary → promote) adds ceremony; it's the ceremony being learned.
- **What you'll run:** the full loop, ≥2 iterations.

- [ ] **Step 1 `[USER RUNS]`:** Optional fast pre-check before any publish:

```bash
pnpm pack && tar -tf *.tgz | head
```

Expected: tarball contains `dist/`, `src/`, `package.json` — sanity-checks `files`/`exports`.

- [ ] **Step 2 (agent authors):** Make a representative consumer-driven change (e.g. add an `outline` intent → new `@utility btn-outline` + `Intent` union + story).
- [ ] **Step 3 `[USER RUNS]`:** Push a PR; observe **Chromatic flag the visual diff**; review & **accept** the new baseline; merge.
      Expected: Chromatic shows the intended diff; accepting it unblocks the gate.
- [ ] **Step 4 `[USER RUNS]`:** Publish under `canary`:

```bash
pnpm changeset            # patch/minor
git add .changeset && git commit -m "feat(button): outline intent" && git push
# after Version PR merges, the Release job publishes; tag it canary:
npm dist-tag add @williamphelps13/ui@<new> canary
```

- [ ] **Step 5 `[USER RUNS]`:** In the pilot app, consume the canary, verify, then promote:

```bash
pnpm add @williamphelps13/ui@canary && pnpm dev   # verify the change landed
npm dist-tag add @williamphelps13/ui@<new> latest
```

- [ ] **Step 6 `[USER RUNS]`:** Repeat Steps 2–5 once more with a different change until the loop feels friction-free; note every rough edge.

### Task 5.5: Write `docs/workflow.md`

**Files:** Create `docs/workflow.md`

**Teaching Preamble**

- **Concept:** Capture the ironed-out loop as the team contract: consumer steps + maintainer steps + the Chromatic baseline-review step + canary→latest promotion.
- **Why this choice (alternatives rejected):** A written, validated workflow is the actual Milestone 0 deliverable (spec §4.1) — the understanding must outlive this session. Rejected: leaving it tribal.
- **Tradeoffs:** None; pure capture.
- **What you'll run:** nothing (doc).

- [ ] **Step 1 (agent authors):** Create `docs/workflow.md` documenting, from the lived Task 5.3–5.4 experience: install/consume, the CSS-at-root-layout rule, palette/dark override, the maintainer change→Chromatic-accept→changeset→publish→canary→promote loop, and the `pnpm pack` pre-check. Include the rough edges found and how they were resolved.
- [ ] **Step 2 `[USER RUNS]`:** Commit.

```bash
git add docs/workflow.md && git commit -m "docs: ironed-out consumer + maintainer workflow"
```

### 🚦 Phase 5 Quiz Gate (HARD)

1. Trace a consumer-driven change end to end: where does Chromatic gate, where does the version bump happen, what does the consumer run to get it?
2. Why `canary` dist-tag during ironing-out instead of always `latest`? What stays clean, and why does it still count as "real"?
3. What does `pnpm pack` validate that a Git diff does not — and what does a real `npm publish` validate that `pnpm pack` does not?
4. Why is OIDC trusted publishing preferable to an `NPM_TOKEN` secret? What does provenance give a consumer?
5. The Button rendered in a Server Component but the theme toggle is a client component. Why exactly that split?

Pass criterion: all five in the user's own words. Then Phase 6.

---

# PHASE 6 — Component-Pattern Bake-off (ends at the §4.1 gate)

Goal: compare the owner's own Button against the fresh one, agree the canonical pattern, write `docs/component-conventions.md`, amend spec §3.6/§3.7/§3.8 if indicated. Then evaluate the §4.1 gate.

### Task 6.1: Bring in the owner's Button + harness it

**Files:** Create `src/components/button-owner/` (owner's implementation), `*.stories.tsx`

**Teaching Preamble**

- **Concept:** Place the owner's existing/independent Button beside the fresh one, with equivalent stories/tests, so the comparison is apples-to-apples.
- **Why this choice (alternatives rejected):** Real head-to-head beats abstract debate (spec §4.1). Rejected: comparing from memory/description.
- **Tradeoffs:** Temporary duplicate component; removed after the decision.
- **What you'll run:** `pnpm storybook`, `pnpm test`.

- [ ] **Step 1 `[USER RUNS]` / owner provides:** Add the owner's Button under `src/components/button-owner/` (owner authors; agent assists wiring only).
- [ ] **Step 2 (agent authors):** Equivalent CSF-factory stories for it (mirror Task 4.3) so both run under Vitest + a11y + Chromatic.
- [ ] **Step 3 `[USER RUNS]`:** Verify both build/test/render:

```bash
pnpm test && pnpm storybook
```

Expected: both Buttons green; both visible in Storybook for side-by-side.

- [ ] **Step 4 `[USER RUNS]`:** Commit.

```bash
git add src/components/button-owner && git commit -m "chore(bakeoff): owner Button harnessed for comparison"
```

### Task 6.2: Structured comparison

**Files:** none (analysis captured in 6.3)

**Teaching Preamble**

- **Concept:** Score both across the spec §4.1 axes: public API shape, prop/variant ergonomics, ref/`asChild`, token usage, `"use client"` decision, story/test ergonomics, type DX — "better and worse" for each.
- **Why this choice (alternatives rejected):** Fixed axes prevent a vibes-based decision. Rejected: unstructured preference.
- **Tradeoffs:** Some axes are taste — capture the reasoning, not just the verdict.
- **What you'll run:** nothing (discussion + agent-facilitated).

- [ ] **Step 1 (agent facilitates):** Walk each axis; for each, agent states observed pros/cons of _both_ implementations with evidence (code refs), user judges. Capture decisions.
- [ ] **Step 2 (agent + user):** Decide the canonical choice per axis (may be a blend).

### Task 6.3: Write `docs/component-conventions.md` + amend spec if indicated

**Files:** Create `docs/component-conventions.md`; possibly Modify spec §3.6/§3.7/§3.8

**Teaching Preamble**

- **Concept:** The canonical component pattern, written down, becomes the rule every Phase-7 component follows.
- **Why this choice (alternatives rejected):** Spec §4.1 marks §3.6/§3.7/§3.8 conventions provisional until exactly this; this concludes them. Rejected: leaving conventions implicit.
- **Tradeoffs:** None; this is the gate's second half.
- **What you'll run:** commits.

- [ ] **Step 1 (agent authors):** `docs/component-conventions.md`: per-axis canonical decision + rationale + a tiny code exemplar (the agreed Button shape), explicitly noting what was adopted from the owner's version and what from the fresh one.
- [ ] **Step 2 (agent authors, if indicated):** Edit spec §3.6/§3.7/§3.8 to match the agreed conventions; bump nothing else.
- [ ] **Step 3 `[USER RUNS]`:** Remove the losing duplicate implementation; keep the canonical Button.

```bash
git rm -r src/components/button-owner   # or the other, per decision
```

- [ ] **Step 4 `[USER RUNS]`:** Commit.

```bash
git add docs/component-conventions.md docs/superpowers/specs
git commit -m "docs: canonical component conventions (bake-off outcome)"
```

### 🚦 Phase 6 Quiz Gate + §4.1 GATE EVALUATION (HARD — terminal)

Quiz:

1. State the canonical decision on three of the seven axes and _why_ (the tradeoff, not just the choice).
2. What did the owner's Button do better that we adopted? What did it do worse that we rejected — and why?
3. Which spec sections did the bake-off amend (if any), and what changed?

**§4.1 Gate checklist — ALL must be true to consider Milestone 0 complete:**

- [ ] Workflow loop is friction-free and `docs/workflow.md` is committed (Phase 5).
- [ ] Canonical component pattern agreed and `docs/component-conventions.md` committed (Phase 6).
- [ ] `0.1.0`+ published for real; pilot App Router app consumes it with working theme override + dark mode.
- [ ] Chromatic is a green required gate; CI (lint/typecheck/build/use-client/pack/knip/test) green on `main`.
- [ ] All six phase quiz gates passed in the user's own words.

**This plan ends here.** Phase 7 (component #2 / breadth / scale-time hardening) is a **separate** spec→plan cycle initiated only after this gate is satisfied (spec §4.2).

---

## Self-Review (author's check against spec r7)

**Spec coverage:** §3.1 package shape → T1.4; §3.2 tsdown+RC → T1.5–1.6; §3.3 RSC/use-client → T1.7–1.8, T4.2; §3.4 tsconfig/go-to-source → T1.3; §3.5 tokens pipeline → T2.1–2.3; §3.6 styling zero-specificity → T3.1–3.2; §3.7 component model → T4.2 (conventions), Appendix A migration is Phase 7 (out of scope, correctly absent); §3.8 Storybook/Vitest/Chromatic → T3.3–3.5, T4.3–4.4; §3.9 release/OIDC → T5.1–5.2; §3.10 lint/knip/pack → T1.7,1.9,1.10; §3.11 versions → catalog T1.2 + installs; §4.1 Milestone 0 (Button, loop, bake-off, gate) → Phases 4–6; §4.3 phases → Phases 1–6; §5 Teaching Mode → preambles + `[USER RUNS]` + quiz gates throughout; §7 risks → guarded in T1.8 (#2,#8), T1.4 (#3,#9), T2.2 (#5,#6), T3.1–3.2 (#1,#10), T3.4 (#7), T4.2 (#8), plus quiz questions. Phase 7 / §4.2 deliberately excluded per scope. **No gaps.**

**Placeholder scan:** Versions in the catalog are concrete with an explicit registry-confirm step (not a placeholder — the spec itself mandates verifying the SB↔Vitest triad at implementation, risk #7); the few "verify current API via ctx7" steps are guarded debugging steps, not unfinished content. `@williamphelps13/ui` is a clearly-flagged scope placeholder the owner finalizes (spec §8 open item). No `TBD`/`TODO`/"handle edge cases".

**Type consistency:** `buttonClasses(intent, size)`, `Intent`, `Size`, `ButtonProps` consistent across T4.1→4.2→4.3 and `src/index.ts`. `data-theme` attribute consistent across token CSS (T2.2), Tailwind variant (T3.1), Storybook (T3.3), pilot app (T5.3). Script name `assert:use-client` consistent T1.8/1.10/4.2/5.1. `dist/styles.css` exports key consistent T1.4/3.2/3.3.

Fixed inline: none required.
