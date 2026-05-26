# ARCHITECTURE.md — @williamphelps13/ui

## Introduction

Source of truth for the current architecture and the reasoning behind it. When an architecture decision is made or changed, update this file with the what and why.

### See Also

Listed as most important first.

1. `ARCHITECTURE.md` — what the architecture is now and why
2. `CLAUDE.md` — always-loaded operating rules and hard-won gotchas
3. Spec (`docs/superpowers/specs/`) — original design exploration and alternatives considered; may lag this file
4. Plan (`docs/superpowers/plans/`) — execution steps (what was planned) and the live deviation log (why we changed course)
5. `AGENTS.md` — thin `CLAUDE.md` redirect for non-Claude-Code agents

### Status

- ✅ Phase 1 - Foundation
- ✅ Phase 2 - Token slice
- ✅ Phase 3 - Styling, Storybook, and visual-regression harness
- ✅ Phase 4 - Button
- Phase 5 - Workflow loop
- Phase 6 - Bake-off

---

## Purpose and shape

A versioned, public React component library published to npm and consumed by Next.js (App Router /
RSC) and Vite apps. Everything follows from four library constraints: small, precisely typed, debuggable from outside, and adaptable.

## Pipeline and data flow

```
tokens/tokens.json ──(Style Dictionary v5 + sd-transforms)──> build/tokens.{light,dark}.css (:root / [data-theme=dark])
                                                          └──> build/theme.css (@theme inline)
src/styles/index.css ──(@tailwindcss/cli; source-scoped, Preflight omitted)──> dist/styles.css   (precompiled, controlled)
src/**/*.tsx ──(tsdown: Rolldown/Oxc + babel-plugin-react-compiler)──> dist/*.mjs + dist/*.d.mts  (unbundled, RC-optimized)
stories ──> Storybook 10 ──> Vitest browser mode (stories-as-tests + a11y) + Chromatic (visual gate)
main ──> Changesets ──> GitHub Actions ──> npm (OIDC trusted publish + provenance)
```

Build order is `tokens && tsdown && css` — `css` runs after tsdown because tsdown wipes
`dist/` each run (see CLAUDE.md gotcha).

## Key decisions and rationale (as-built)

### Package shape — ESM-only (`package.json`)

`"type":"module"`, no CJS. `exports`: `.` → `./dist/index.mjs` and `./dist/index.d.mts`; `./styles.css` → `./dist/styles.css`. `sideEffects: ["**/*.css","./dist/styles.css"]` so consumer bundlers never tree-shake the stylesheet. `files: ["dist","src"]` ships source for go-to-source. `react` and `react-dom` are peerdeps (`>=19`) — one copy in the consumer, and React Compiler `target:'19'` needs no runtime dep. `publishConfig`: public access and provenance. Why: RSC and Vite both resolve ESM; CJS doubles surface and fights `"use client"`.

### Build — tsdown and React Compiler (`tsdown.config.ts`)

tsdown (Rolldown and Oxc) emits per-file ESM with `unbundle:true` (keeps `"use client"` boundaries granular and tree-shaking maximal), `dts` and sourcemaps, `target:'es2022'` (set explicitly — tsdown otherwise infers it from `engines.node`), externalizes `react`, `react-dom`, and `radix`. React Compiler runs in our build (via `@rolldown/plugin-babel` and `babel-plugin-react-compiler`, `target:'19'`) so every consumer gets memoized output for free. Emits `.mjs` and `.d.mts` — `exports` point there.

### TypeScript — layered configs, TS 6.0.3

Two explicit configs (a child can't merge `include` or `exclude` from `extends`):

- `tsconfig.build.json` (strict — the publish contract): `isolatedDeclarations` (fast parallel DTS via Oxc; requires explicit export return types), `rootDir:src`, src-only (excludes stories and tests). Drives tsdown's emit (`--tsconfig`) and typecheck pass 1.
- `tsconfig.json` (broad, lenient): `src` and `.storybook/**/*` — type-checks the stories, `preview.tsx`, `main.ts`, and ambient `globals.d.ts`; powers the editor and typecheck pass 2.

Shared: `moduleResolution:"bundler"` (matches Next and Vite resolving our `exports`), `verbatimModuleSyntax`, `declarationMap` and `sourceMap` shipped from `src/` (go-to-source), `noEmit:true` — tsc is the typecheck gate only; tsdown emits. `pnpm typecheck` runs both passes.

Critical: the broad `include` must be `'.storybook/**/*'`, not bare `'.storybook'` — TS silently skips dot-directories, so the bare form loads nothing and the `*.css` ambient declaration vanishes → `TS2882` (under TS 6.0's now-default `noUncheckedSideEffectImports`). Diagnose include scope with `tsc --showConfig`. See CLAUDE.md and the plan's deviation log.

### Tokens — 3-tier DTCG, single-file (`tokens/tokens.json`, `style-dictionary.config.mjs`)

Tiers: primitive (raw scale) → semantic (intent; the override surface; flips between light and dark); component tier deferred (not needed for Button). Single-file Tokens Studio layout (sets: `core`, `light`, `dark`) — chosen for free Figma Git sync (multi-file and themes are Pro). SD v5 with `@tokens-studio/sd-transforms`, `outputReferences:true` so semantic tokens stay `var(--primitive)` (one consumer override cascades — the themeable chain). Emits three CSS artifacts: `:root` (light), `[data-theme=dark]`, and a `@theme inline` artifact. Dark build filters to semantics only; its "filtered references" warning is silenced but broken references stay fatal.

### Styling and theming — Tailwind v4, precompiled and controlled (`src/styles/index.css`)

The most-corrected area. Decisions:

- `@theme inline` (not plain `@theme`) — utilities reference the live `--color-*` variable, so
  a consumer override in their `:root` cascades with no rebuild. This is the crown-jewel contract.
- `prefix()` REJECTED. Validated against Tailwind v4 docs: `prefix(tw)` also renames theme
  variables (`--color-*` → `--tw-color-*`), which would break the override contract. Wrong tool.
- `source(none)` and `@source "../components"` (layered import form) — disables Tailwind's whole-repo auto-scan (which had been scraping class names out of `docs/*.md` into the output). The shipped CSS is now minimal and deterministic — doc-independent.
- Preflight omitted — a precompiled component lib must not impose a global reset on consumers.
  Component classes are therefore self-contained (`.ui-btn` resets `appearance/border/margin/font`).
- `ui-` namespaced component classes (authored via `@utility`) — collision-safety by naming,
  with variables left untouched (vs. `prefix()`).
- `:where()` zero-specificity dark variant matching `[data-theme="dark"]` so consumer overrides
  win with no `!important`.

Override contract (the public theming API): consumers set semantic tokens in their own
`:root { --color-primary: … }` (and `[data-theme="dark"] { … }`) — unprefixed `--color-*`, which
beat ours by cascade order. No rebuild, no Tailwind install.

### Server and client boundary — `"use client"`

The barrel (`src/index.ts`) must not carry `"use client"` (would force the whole lib to the client). Interactive components get the directive per-file; purely-visual ones stay server-renderable. A build-time assertion (`scripts/assert-use-client.mjs`) scans `dist/` to catch directive stripping or hoisting — the highest-severity RSC failure mode.

### Component model — Button

- `ref` is a plain prop (React 19) — `Button` is a plain function with `ref?: Ref<HTMLButtonElement>`;
  no `forwardRef` (removed in React 19). An explicit `ReactElement` return type satisfies
  `isolatedDeclarations`.
- Variants are a typed literal-class map (`variants.ts`): `Record<Intent,string>` and `Record<Size,string>` resolve to `ui-btn …` strings. Tailwind can't see dynamic names (`ui-btn-${intent}`), so each class must appear as a literal in scanned source; the `Record` makes TS enforce one class per variant — add a variant and TS forces its class to ship. The pure `buttonClasses()` is unit-testable on its own.
- Purely visual → no `"use client"` (server-renderable). Native props spread via `...rest`; `className` merges with the variant classes.
- Stories are CSF Next (`preview.meta()` → `meta.story()`); `play({ canvas, userEvent, args })` with `import { fn, expect } from 'storybook/test'`. One story feeds the interaction test, a11y audit, and Chromatic visual snapshot.

### Testing and docs

Storybook 10 on `@storybook/react-vite` is the dev, docs, and test harness; CSF Next factory stories (`definePreview` → `preview.meta()` → `meta.story()`) for type-safe stories; `react-docgen-typescript` for accurate prop tables; the preview imports the precompiled `dist/styles.css` (matches consumers). One Storybook story feeds the interaction test, the a11y audit (Vitest browser mode, real headless Chromium via `@vitest/browser-playwright`), and the Chromatic visual snapshot. A second `node`-environment Vitest project (`unit`) runs pure-logic unit tests (no DOM needed — not jsdom).

Chromatic with TurboSnap is a required visual gate. CI shape: a `correctness` job (all 9 local gates plus `playwright install`) → a `chromatic` job (`needs: correctness`). Gating chromatic on correctness ensures cheap gates fail-fast and no Chromatic snapshot is spent on a broken build. Chromatic policy (`autoAcceptChanges: 'main'`, `exitZeroOnChanges: false`, `onlyChanged: true`) lives in `chromatic.config.json` so local `pnpm chromatic` and CI behave identically; the workflow only passes `projectToken` to the action.

An MCP server (`@storybook/addon-mcp`, live at `localhost:6006/mcp` while `pnpm storybook` runs) exposes the library's real component docs, props, and stories. See CLAUDE.md § "Storybook MCP" for usage rules.

### Release

Changesets (public access, `@changesets/changelog-github`) with GitHub Actions and npm OIDC trusted publishing (no stored `NPM_TOKEN`) with automatic provenance.

### Quality gates

ESLint flat (typescript-eslint, react-hooks, jsx-a11y, `@eslint-react`, import-x), Prettier, knip (scoped via `project: src/`; CSS-only and peer deps in `ignoreDependencies`), cspell, and publint. `attw` is split into `verify:types` and not gating yet — `@arethetypeswrong/cli` lacks TS 6.0 support; revisit.

## File and module map

| Path                                                               | Responsibility                                                                                                                                                                                                                                           |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `package.json`                                                     | ESM manifest: exports, sideEffects, peers, scripts, publishConfig                                                                                                                                                                                        |
| `pnpm-workspace.yaml`                                              | pnpm catalog (react, react-dom, typescript, tailwindcss) and pnpm settings (`engineStrict`, `allowBuilds`)                                                                                                                                               |
| `.nvmrc` (24.16.0 exact), Corepack pin `pnpm@11.1.2`               | runtime and package-manager pins                                                                                                                                                                                                                         |
| `tsconfig.build.json`                                              | strict publish contract: isolatedDeclarations, rootDir:src, src-only; tsdown emit and typecheck pass 1                                                                                                                                                   |
| `tsconfig.json`                                                    | broad and lenient: `src` and `.storybook/**/*`; editor and typecheck pass 2                                                                                                                                                                              |
| `tsdown.config.ts`                                                 | ESM, unbundle, externals, dts, React Compiler                                                                                                                                                                                                            |
| `eslint.config.ts`, `.prettierrc.json`, `cspell.json`, `knip.json` | lint, format, spell, dead-code                                                                                                                                                                                                                           |
| `scripts/assert-use-client.mjs`                                    | build-time `"use client"` guardrail                                                                                                                                                                                                                      |
| `tokens/tokens.json`, `tokens/README.md`                           | DTCG tokens (single-file sets) and sync contract                                                                                                                                                                                                         |
| `style-dictionary.config.mjs`                                      | tokens → `build/*.css` (CSS vars and `@theme inline`)                                                                                                                                                                                                    |
| `src/styles/index.css`                                             | Tailwind entry → `dist/styles.css` (source-scoped, Preflight off, `ui-*`)                                                                                                                                                                                |
| `src/index.ts`                                                     | barrel (no `"use client"`); exports `Button`, `Intent`, `Size`, `ButtonProps`                                                                                                                                                                            |
| `src/components/button/**`                                         | Button: `button.tsx`, `variants.ts`, `*.stories.tsx`, `*.test.ts`                                                                                                                                                                                        |
| `.storybook/main.ts`, `.storybook/preview.tsx`                     | Storybook 10 config (CSF Next `definePreview`; addon-themes, addon-docs, addon-a11y, addon-vitest, addon-mcp; react-docgen-typescript)                                                                                                                   |
| `.mcp.json`, `AGENTS.md`                                           | Storybook MCP wiring (Claude Code) and cross-tool agent guidance (verify props via MCP)                                                                                                                                                                  |
| `vitest.config.ts`                                                 | Vitest: `storybook` browser project and `node`-env `unit` project                                                                                                                                                                                        |
| `.github/workflows/ci.yml`                                         | `correctness` job (typecheck, lint, knip, spell, format, build, assert:use-client, test, publint, and playwright install) → `chromatic` job (needs:correctness; `chromaui/action@latest`, TurboSnap via config). Concurrency cancel-in-progress per ref. |
| `chromatic.config.json`                                            | Chromatic policy: TurboSnap (`onlyChanged`), `autoAcceptChanges:"main"`, `exitZeroOnChanges:false`. Token never here — GitHub Actions secret only.                                                                                                       |
| `.github/dependabot.yml`                                           | Weekly grouped PRs: npm minor and patch updates, plus gh-actions. Storybook majors ignored (CSF Next experimental).                                                                                                                                      |
| `.github/workflows/release.yml`, `.changeset/`                     | Changesets and OIDC publish — pending (not yet built)                                                                                                                                                                                                    |

## Invariants and contracts

- Semantic tokens (`--color-*`) are the public, semver-stable override surface. Primitives and (future) component tokens are internal — renaming them is not a breaking change; renaming a semantic token is.
- The barrel never carries `"use client"`.
- `dist/styles.css` is precompiled and content-controlled (`source(none)` and `@source`) — editing docs must not change it.
- `exports` resolve to `.mjs` and `.d.mts` (tsdown's output extensions).
- Build order is `tokens && tsdown && css` (tsdown wipes `dist/`).
- `engines.node` floor (`>=24.11.1`) is a dev and build need (tsdown config load) — right-size it for consumers before the first publish (pending).
