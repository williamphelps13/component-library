# ARCHITECTURE.md — @williamphelps13/ui

**Source of truth for the _current, as-built_ architecture and the _why_ behind it.** Read this
first. It outlives any single plan.

How the docs relate (precedence, highest first):

1. **`ARCHITECTURE.md`** (this file) — what the architecture _is now_ and why.
2. **Spec** `docs/superpowers/specs/2026-05-17-component-library-design.md` (r7) — original design
   exploration + alternatives considered. Background; **may lag** this file (reconciled at Phase 6).
3. **Plan + deviation log** `docs/superpowers/plans/2026-05-17-component-library-milestone-0.md`
   — execution steps (what was _planned_) and the live deviation log (_why_ we changed course).
4. **`CLAUDE.md`** — always-loaded operating rules + hard-won gotchas.
5. **`AGENTS.md`** — cross-tool agent guidance (verify component props via the Storybook MCP;
   addon-registration checklist when adding a Storybook addon).

> When an architecture decision is made or changed, update this file (the _what + why_); record the
> transition in the plan's deviation log (the _why it changed_).

**Status:** Phase 1 (Foundation) ✅ · Phase 2 (Token slice) ✅ · Phase 3 (Styling + Storybook +
visual-regression harness) ✅ · Phase 4 (Button) ✅ _(merged P3/P4 quiz gate pending)_ ·
Phase 5 (Workflow loop) ⏳ · Phase 6 (Bake-off) ⏳. The **deviation log** is the canonical
current-state record; this status line is the one-glance summary.

---

## 1. Purpose & shape

A versioned, public React component library published to npm and consumed by Next.js (App Router /
RSC) **and** Vite apps. Everything follows from four library constraints: **small** (don't drag a
world into consumers), **precisely typed** (the `.d.mts` is the contract), **debuggable from
outside** (ship source + maps for go-to-source), **forgiving** (works server or client, Next or
Vite).

**Mental model (one breath):** design tokens → Style Dictionary → CSS variables → Tailwind v4
(`@theme inline`) → one _precompiled_ `dist/styles.css`; component source → tsdown (+ React
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

Build order is **`tokens && tsdown && css`** — `css` runs _after_ tsdown because tsdown wipes
`dist/` each run (see CLAUDE.md gotcha).

## 3. Key decisions & rationale (as-built)

### Package shape — ESM-only (`package.json`)

`"type":"module"`, no CJS. `exports`: `.` → `./dist/index.mjs` + `./dist/index.d.mts`;
`./styles.css` → `./dist/styles.css`. `sideEffects: ["**/*.css","./dist/styles.css"]` so consumer
bundlers never tree-shake the stylesheet. `files: ["dist","src"]` ships source for go-to-source.
`react`/`react-dom` are **peer**deps (`>=19`) — one copy in the consumer, and React Compiler
`target:'19'` needs no runtime dep. `publishConfig`: public access + provenance. _Why:_ RSC + Vite
both resolve ESM; CJS doubles surface and fights `"use client"`.

### Build — tsdown + React Compiler (`tsdown.config.ts`)

tsdown (Rolldown/Oxc) emits per-file ESM with `unbundle:true` (keeps `"use client"` boundaries
granular + maximal tree-shaking), `dts` + sourcemaps, `target:'es2022'` (set explicitly — tsdown
otherwise infers it from `engines.node`), externalizes `react`/`react-dom`/`radix`. React Compiler
runs **in our build** (via `@rolldown/plugin-babel` + `babel-plugin-react-compiler`, `target:'19'`)
so every consumer gets memoized output for free. Emits **`.mjs`/`.d.mts`** — `exports` point there.

### TypeScript — layered configs, TS **6.0.3**

Two explicit configs (a child can't merge `include`/`exclude` from `extends`):

- **`tsconfig.build.json`** (strict — the publish contract): `isolatedDeclarations` (fast parallel
  DTS via Oxc; requires explicit export return types), `rootDir:src`, **src-only** (excludes
  stories/tests). Drives tsdown's emit (`--tsconfig`) + typecheck pass 1.
- **`tsconfig.json`** (broad, lenient): `src` + `.storybook/**/*` — type-checks the stories,
  `preview.tsx`, `main.ts`, and ambient `globals.d.ts`; powers the editor + typecheck pass 2.

Shared: `moduleResolution:"bundler"` (matches Next/Vite resolving our `exports`),
`verbatimModuleSyntax`, `declarationMap` + `sourceMap` shipped from `src/` (go-to-source),
`noEmit:true` — **tsc is the typecheck gate only; tsdown emits.** `pnpm typecheck` runs both passes.

> **Load-bearing gotcha:** the broad `include` must be `'.storybook/**/*'`, _not_ bare `'.storybook'`
> — TS silently skips dot-directories, so the bare form loads nothing and the `*.css` ambient
> declaration vanishes → `TS2882` (under TS 6.0's now-default `noUncheckedSideEffectImports`).
> Diagnose include scope with `tsc --showConfig`. See CLAUDE.md + the plan's Phase-4 deviation entry.

### Tokens — 3-tier DTCG, single-file (`tokens/tokens.json`, `style-dictionary.config.mjs`)

Tiers: **primitive** (raw scale) → **semantic** (intent; the override surface; flips light/dark);
component tier deferred (YAGNI for Button). **Single-file** Tokens Studio layout (sets:
`core`/`light`/`dark`) — chosen for **free** Figma Git sync (multi-file + themes are Pro). SD v5 +
`@tokens-studio/sd-transforms`, `outputReferences:true` so semantic tokens stay `var(--primitive)`
(one consumer override cascades — the themeable chain). Emits `:root` (light) + `[data-theme=dark]`

- a `@theme inline` artifact. Dark build filters to semantics only; its "filtered references"
  warning is silenced **but broken references stay fatal**.

### Styling & theming — Tailwind v4, precompiled & _controlled_ (`src/styles/index.css`)

The most-corrected area. Decisions:

- **`@theme inline`** (not plain `@theme`) — utilities reference the _live_ `--color-*` variable, so
  a consumer override in their `:root` cascades with no rebuild. This is the crown-jewel contract.
- **`prefix()` REJECTED.** Validated against Tailwind v4 docs: `prefix(tw)` also renames theme
  _variables_ (`--color-*` → `--tw-color-*`), which would **break the override contract**. Wrong tool.
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

### Component model — Button (first component, Phase 4)

- **`ref` is a plain prop** (React 19) — `Button` is a plain function with `ref?: Ref<HTMLButtonElement>`;
  **no `forwardRef`** (removed in React 19). An explicit `ReactElement` return type satisfies
  `isolatedDeclarations`.
- **Variants = a typed literal-class map** (`variants.ts`): `Record<Intent,string>` /
  `Record<Size,string>` resolve to `ui-btn …` strings. Tailwind can't see dynamic names
  (`ui-btn-${intent}`), so each class must appear as a literal in scanned source; the `Record` makes
  TS enforce one class per variant — add a variant and TS forces its class to ship. The pure
  `buttonClasses()` is unit-testable on its own.
- **Purely visual → no `"use client"`** (server-renderable). Native props spread via `...rest`;
  `className` merges with the variant classes.
- **Stories are CSF Next** (`preview.meta()` → `meta.story()`); `play({ canvas, userEvent, args })`
  with `import { fn, expect } from 'storybook/test'`. One story feeds the interaction test + a11y
  audit + the Chromatic visual snapshot.

### Testing & docs (Phase 3)

Storybook 10 on `@storybook/react-vite` is the dev/docs/test harness; **CSF Next** factory stories
(`definePreview` → `preview.meta()` → `meta.story()`) for type-safe stories; `react-docgen-typescript`
for accurate prop tables; the preview imports the **precompiled `dist/styles.css`** (matches
consumers). One Storybook story feeds: interaction test + a11y audit (Vitest **browser mode**, real
headless Chromium via `@vitest/browser-playwright`) + Chromatic visual snapshot. A second
`node`-environment Vitest project (`unit`) runs pure-logic unit tests (no DOM needed — not jsdom). **Chromatic + TurboSnap** is a required visual gate. CI shape: `correctness` job (all 9 local gates + `playwright install`) → `chromatic` job (`needs: correctness`) — gating chromatic on correctness ensures cheap gates fail-fast and no Chromatic snapshot is spent on a broken build. Chromatic policy (`autoAcceptChanges: 'main'`, `exitZeroOnChanges: false`, `onlyChanged: true`) lives in `chromatic.config.json` so local `pnpm chromatic` and CI behave identically; the workflow only passes `projectToken` to the action.
An **MCP server** (`@storybook/addon-mcp`, live at `localhost:6006/mcp` while `pnpm storybook`
runs) exposes the library's real component docs/props/stories to AI agents (`AGENTS.md`) so they
verify props instead of hallucinating.

### Release (Phase 5)

Changesets (public access, `@changesets/changelog-github`) + GitHub Actions + **npm OIDC trusted
publishing** (no stored `NPM_TOKEN`) with automatic provenance.

### Quality gates

ESLint flat (typescript-eslint, react-hooks, jsx-a11y, `@eslint-react`, import-x) · Prettier ·
**knip** (scoped via `project: src/**`; CSS-only/peer deps in `ignoreDependencies`) · cspell ·
**publint**. (`attw` is split into `verify:types` and not gating yet — `@arethetypeswrong/cli`
lacks TS 6.0 support; revisit.)

## 4. File / module map

| Path                                                                  | Responsibility                                                                                                                                                                                                                        | Status     |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| `package.json`                                                        | ESM manifest: exports, sideEffects, peers, scripts, publishConfig                                                                                                                                                                     | ✅         |
| `pnpm-workspace.yaml`                                                 | pnpm catalog (react/react-dom/typescript/tailwindcss) + pnpm settings (`engineStrict`, `allowBuilds`)                                                                                                                                 | ✅         |
| `.nvmrc` (24.16.0 exact), Corepack pin `pnpm@11.1.2`                  | runtime + package-manager pins                                                                                                                                                                                                        | ✅         |
| `tsconfig.build.json`                                                 | strict publish contract: isolatedDeclarations, rootDir:src, src-only; tsdown emit + typecheck pass 1                                                                                                                                  | ✅         |
| `tsconfig.json`                                                       | broad/lenient: `src` + `.storybook/**/*`; editor + typecheck pass 2 (dot-dir glob is load-bearing)                                                                                                                                    | ✅         |
| `tsdown.config.ts`                                                    | ESM, unbundle, externals, dts, React Compiler                                                                                                                                                                                         | ✅         |
| `eslint.config.ts` / `.prettierrc.json` / `cspell.json` / `knip.json` | lint/format/spell/dead-code                                                                                                                                                                                                           | ✅         |
| `scripts/assert-use-client.mjs`                                       | build-time `"use client"` guardrail                                                                                                                                                                                                   | ✅         |
| `tokens/tokens.json`, `tokens/README.md`                              | DTCG tokens (single-file sets) + sync contract                                                                                                                                                                                        | ✅         |
| `style-dictionary.config.mjs`                                         | tokens → `build/*.css` (CSS vars + `@theme inline`)                                                                                                                                                                                   | ✅         |
| `src/styles/index.css`                                                | Tailwind entry → `dist/styles.css` (source-scoped, Preflight off, `ui-*`)                                                                                                                                                             | ✅         |
| `src/index.ts`                                                        | barrel (no `"use client"`); exports `Button` + `Intent`/`Size`/`ButtonProps`                                                                                                                                                          | ✅         |
| `src/components/button/**`                                            | Button: `button.tsx`, `variants.ts`, `*.stories.tsx`, `*.test.ts`                                                                                                                                                                     | ✅         |
| `.storybook/main.ts`, `.storybook/preview.tsx`                        | Storybook 10 config (CSF Next `definePreview`; addon-themes/docs/a11y/vitest/mcp; react-docgen-typescript)                                                                                                                            | ✅ boots   |
| `.mcp.json`, `AGENTS.md`                                              | Storybook MCP wiring (Claude Code) + cross-tool agent guidance (verify props via MCP)                                                                                                                                                 | ✅         |
| `vitest.config.ts`                                                    | Vitest: `storybook` browser project + `node`-env `unit` project                                                                                                                                                                       | ✅         |
| `.github/workflows/ci.yml`                                            | `correctness` (typecheck/lint/knip/spell/format/build/assert:use-client/test/publint, +playwright install) → `chromatic` (needs:correctness; `chromaui/action@latest`, TurboSnap via config). Concurrency cancel-in-progress per ref. | ✅         |
| `chromatic.config.json`                                               | Chromatic policy: TurboSnap (`onlyChanged`), `autoAcceptChanges:"main"`, `exitZeroOnChanges:false`. Token NEVER here — GH Actions secret only.                                                                                        | ✅         |
| `.github/dependabot.yml`                                              | Weekly grouped npm minor+patch + gh-actions PRs. Storybook majors ignored (CSF Next experimental).                                                                                                                                    | ✅         |
| `.github/workflows/release.yml`, `.changeset/`                        | Changesets + OIDC publish                                                                                                                                                                                                             | ⏳ Phase 5 |

## 5. Invariants & contracts

- **Semantic tokens (`--color-*`) are the public, semver-stable override surface.** Primitives and
  (future) component tokens are internal — renaming them is not a breaking change; renaming a
  semantic token is.
- **The barrel never carries `"use client"`.**
- **`dist/styles.css` is precompiled and content-controlled** (`source(none)` + `@source`) — editing
  docs must not change it.
- **`exports` resolve to `.mjs`/`.d.mts`** (tsdown's output extensions).
- **Build order is `tokens && tsdown && css`** (tsdown wipes `dist/`).
- **`engines.node` floor (`>=24.11.1`) is a _dev/build_ need** (tsdown config load) — right-size it
  for _consumers_ before the first publish (Phase 5 TODO).

## 6. See also

Spec (design rationale / alternatives), the plan's deviation log (decision history), `CLAUDE.md`
(operating rules + gotchas).
