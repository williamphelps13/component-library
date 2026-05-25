# ARCHITECTURE.md — @williamphelps13/ui

**Source of truth for the *current, as-built* architecture and the *why* behind it.** Read this
first. It outlives any single plan.

How the docs relate (precedence, highest first):
1. **`ARCHITECTURE.md`** (this file) — what the architecture *is now* and why.
2. **Spec** `docs/superpowers/specs/2026-05-17-component-library-design.md` (r7) — original design
   exploration + alternatives considered. Background; **may lag** this file (reconciled at Phase 6).
3. **Plan + deviation log** `docs/superpowers/plans/2026-05-17-component-library-milestone-0.md`
   — execution steps (what was *planned*) and the live deviation log (*why* we changed course).
4. **`CLAUDE.md`** — always-loaded operating rules + hard-won gotchas. **`OVERVIEW.md`** — plain-
   English teaching field guide.

> When an architecture decision is made or changed, update this file (the *what + why*); record the
> transition in the plan's deviation log (the *why it changed*).

**Status:** Phase 1 (Foundation) ✅ · Phase 2 (Token slice) ✅ · Phase 3 (Styling + Storybook +
visual-regression harness) 🔄 (styling done; Storybook/Vitest/Chromatic in progress) · Phase 4
(Button) ⏳ · Phase 5 (Workflow loop) ⏳ · Phase 6 (Bake-off) ⏳.

---

## 1. Purpose & shape

A versioned, public React component library published to npm and consumed by Next.js (App Router /
RSC) **and** Vite apps. Everything follows from four library constraints: **small** (don't drag a
world into consumers), **precisely typed** (the `.d.mts` is the contract), **debuggable from
outside** (ship source + maps for go-to-source), **forgiving** (works server or client, Next or
Vite).

**Mental model (one breath):** design tokens → Style Dictionary → CSS variables → Tailwind v4
(`@theme inline`) → one *precompiled* `dist/styles.css`; component source → tsdown (+ React
Compiler) → per-file ESM (`.mjs` + `.d.mts`); Storybook/Vitest/Chromatic prove it; Changesets +
OIDC publish it. Consumers `pnpm add`, import one stylesheet, override a few CSS variables.

## 2. Pipeline / data flow

```
tokens/tokens.json ──(Style Dictionary v5 + sd-transforms)──> build/tokens.{light,dark}.css (:root / [data-theme=dark])
                                                          └──> build/theme.css (@theme inline)
src/styles/index.css ──(@tailwindcss/cli; source-scoped, Preflight omitted)──> dist/styles.css   (precompiled, controlled)
src/**/*.tsx ──(tsdown: Rolldown/Oxc + babel-plugin-react-compiler)──> dist/*.mjs + dist/*.d.mts  (unbundled, RC-optimized)
stories ──> Storybook 10 ──> Vitest browser mode (stories-as-tests + a11y) + Chromatic (visual gate)
main ──> Changesets ──> GitHub Actions ──> npm (OIDC trusted publish + provenance)
```
Build order is **`tokens && tsdown && css`** — `css` runs *after* tsdown because tsdown wipes
`dist/` each run (see CLAUDE.md gotcha).

## 3. Key decisions & rationale (as-built)

### Package shape — ESM-only (`package.json`)
`"type":"module"`, no CJS. `exports`: `.` → `./dist/index.mjs` + `./dist/index.d.mts`;
`./styles.css` → `./dist/styles.css`. `sideEffects: ["**/*.css","./dist/styles.css"]` so consumer
bundlers never tree-shake the stylesheet. `files: ["dist","src"]` ships source for go-to-source.
`react`/`react-dom` are **peer**deps (`>=19`) — one copy in the consumer, and React Compiler
`target:'19'` needs no runtime dep. `publishConfig`: public access + provenance. *Why:* RSC + Vite
both resolve ESM; CJS doubles surface and fights `"use client"`.

### Build — tsdown + React Compiler (`tsdown.config.ts`)
tsdown (Rolldown/Oxc) emits per-file ESM with `unbundle:true` (keeps `"use client"` boundaries
granular + maximal tree-shaking), `dts` + sourcemaps, `target:'es2022'` (set explicitly — tsdown
otherwise infers it from `engines.node`), externalizes `react`/`react-dom`/`radix`. React Compiler
runs **in our build** (via `@rolldown/plugin-babel` + `babel-plugin-react-compiler`, `target:'19'`)
so every consumer gets memoized output for free. Emits **`.mjs`/`.d.mts`** — `exports` point there.

### TypeScript (`tsconfig.json`) — TS **6.0.3**
`moduleResolution:"bundler"` (matches Next/Vite resolving our `exports`), `isolatedDeclarations`
(fast parallel DTS via Oxc; requires explicit export return types), `declarationMap` + `sourceMap`
+ shipped `src/` (go-to-source). `noEmit:true` — **tsc is the typecheck gate only; tsdown emits.**

### Tokens — 3-tier DTCG, single-file (`tokens/tokens.json`, `style-dictionary.config.mjs`)
Tiers: **primitive** (raw scale) → **semantic** (intent; the override surface; flips light/dark);
component tier deferred (YAGNI for Button). **Single-file** Tokens Studio layout (sets:
`core`/`light`/`dark`) — chosen for **free** Figma Git sync (multi-file + themes are Pro). SD v5 +
`@tokens-studio/sd-transforms`, `outputReferences:true` so semantic tokens stay `var(--primitive)`
(one consumer override cascades — the themeable chain). Emits `:root` (light) + `[data-theme=dark]`
+ a `@theme inline` artifact. Dark build filters to semantics only; its "filtered references"
warning is silenced **but broken references stay fatal**.

### Styling & theming — Tailwind v4, precompiled & *controlled* (`src/styles/index.css`)
The most-corrected area. Decisions:
- **`@theme inline`** (not plain `@theme`) — utilities reference the *live* `--color-*` variable, so
  a consumer override in their `:root` cascades with no rebuild. This is the crown-jewel contract.
- **`prefix()` REJECTED.** Validated against Tailwind v4 docs: `prefix(tw)` also renames theme
  *variables* (`--color-*` → `--tw-color-*`), which would **break the override contract**. Wrong tool.
- **`source(none)` + `@source "../components"`** (layered import form) — disables Tailwind's
  whole-repo auto-scan (which had been scraping class names out of `docs/*.md` into the output). The
  shipped CSS is now minimal and **deterministic / doc-independent**.
- **Preflight omitted** — a precompiled component lib must not impose a global reset on consumers.
  Component classes are therefore **self-contained** (`.ui-btn` resets `appearance/border/margin/font`).
- **`ui-` namespaced** component classes (authored via `@utility`) — collision-safety by naming,
  with variables left untouched (vs. `prefix()`).
- **`:where()` zero-specificity dark variant** matching `[data-theme="dark"]` so consumer overrides
  win with no `!important`.

**Override contract (the public theming API):** consumers set semantic tokens in their own
`:root { --color-primary: … }` (and `[data-theme="dark"] { … }`) — unprefixed `--color-*`, which
beat ours by cascade order. No rebuild, no Tailwind install.

### Server/client boundary — `"use client"`
The **barrel (`src/index.ts`) must NOT carry `"use client"`** (would force the whole lib to the
client). Interactive components get the directive per-file; purely-visual ones (the Button) stay
server-renderable. A build-time assertion (`scripts/assert-use-client.mjs`) scans `dist/` to catch
directive stripping/hoisting — the highest-severity RSC failure mode.

### Testing & docs (Phase 3 / in progress)
Storybook 10 on `@storybook/react-vite` is the dev/docs/test harness; **CSF Next** factory stories
(`definePreview` → `preview.meta()` → `meta.story()`) for type-safe stories; `react-docgen-typescript`
for accurate prop tables; the preview imports the **precompiled `dist/styles.css`** (matches
consumers). One Storybook story feeds: interaction test + a11y audit (Vitest **browser mode**, real
headless Chromium via `@vitest/browser-playwright`) + Chromatic visual snapshot. A second jsdom
Vitest project runs pure-logic unit tests. **Chromatic + TurboSnap** is a required visual gate.

### Release (Phase 5)
Changesets (public access, `@changesets/changelog-github`) + GitHub Actions + **npm OIDC trusted
publishing** (no stored `NPM_TOKEN`) with automatic provenance.

### Quality gates
ESLint flat (typescript-eslint, react-hooks, jsx-a11y, `@eslint-react`, import-x) · Prettier ·
**knip** (scoped via `project: src/**`; CSS-only/peer deps in `ignoreDependencies`) · cspell ·
**publint**. (`attw` is split into `verify:types` and not gating yet — `@arethetypeswrong/cli`
lacks TS 6.0 support; revisit.)

## 4. File / module map

| Path | Responsibility | Status |
|---|---|---|
| `package.json` | ESM manifest: exports, sideEffects, peers, scripts, publishConfig | ✅ |
| `pnpm-workspace.yaml` | pnpm catalog (react/react-dom/typescript/tailwindcss) + pnpm settings (`engineStrict`, `onlyBuiltDependencies`) | ✅ |
| `.nvmrc` (24.16.0 exact), Corepack pin `pnpm@11.1.2` | runtime + package-manager pins | ✅ |
| `tsconfig.json` | bundler resolution, isolatedDeclarations, maps, `noEmit` | ✅ |
| `tsdown.config.ts` | ESM, unbundle, externals, dts, React Compiler | ✅ |
| `eslint.config.ts` / `.prettierrc.json` / `cspell.json` / `knip.json` | lint/format/spell/dead-code | ✅ |
| `scripts/assert-use-client.mjs` | build-time `"use client"` guardrail | ✅ |
| `tokens/tokens.json`, `tokens/README.md` | DTCG tokens (single-file sets) + sync contract | ✅ |
| `style-dictionary.config.mjs` | tokens → `build/*.css` (CSS vars + `@theme inline`) | ✅ |
| `src/styles/index.css` | Tailwind entry → `dist/styles.css` (source-scoped, Preflight off, `ui-*`) | ✅ |
| `src/index.ts` | barrel (no `"use client"`) | ✅ (stub) |
| `src/components/**` | components (Button = Phase 4) | ⏳ |
| `.storybook/{main,preview,vitest.setup}.ts`, `vitest.config.ts` | Storybook + Vitest harness | 🔄 Part B |
| `chromatic.config.json`, `.github/workflows/ci.yml` | visual gate + CI | 🔄 Part B |
| `.github/workflows/release.yml`, `.changeset/` | Changesets + OIDC publish | ⏳ Phase 5 |

## 5. Invariants & contracts

- **Semantic tokens (`--color-*`) are the public, semver-stable override surface.** Primitives and
  (future) component tokens are internal — renaming them is not a breaking change; renaming a
  semantic token is.
- **The barrel never carries `"use client"`.**
- **`dist/styles.css` is precompiled and content-controlled** (`source(none)` + `@source`) — editing
  docs must not change it.
- **`exports` resolve to `.mjs`/`.d.mts`** (tsdown's output extensions).
- **Build order is `tokens && tsdown && css`** (tsdown wipes `dist/`).
- **`engines.node` floor (`>=24.11.1`) is a *dev/build* need** (tsdown config load) — right-size it
  for *consumers* before the first publish (Phase 5 TODO).

## 6. See also
Spec (design rationale / alternatives), the plan's deviation log (decision history), `CLAUDE.md`
(operating rules + gotchas), `OVERVIEW.md` (plain-English tour).
