# ARCHITECTURE.md — @williamphelps13/ui

## Introduction

Source of truth for the current architecture and the reasoning behind it. When an architecture decision is made or changed, update this file with the what and why.

### See also

Listed as most important first.

1. `ARCHITECTURE.md` — what the architecture is now and why
2. `CLAUDE.md` — always-loaded operating rules and hard-won gotchas
3. `docs/component-conventions.md` — the canonical component pattern; authority layer 1 for component decisions
4. `docs/workflow.md` — the publish, local-test, and consumer update loops
5. Active plan (`docs/superpowers/plans/`) — execution steps and the live deviation log (why we changed course); superseded plans and specs are deleted, git history is the archive
6. Reviews (`docs/reviews/`) — dated audits and decision inputs, frozen at their date; each carries a status line saying what happened to it. Settled outcomes live in this file, never there
7. `AGENTS.md` — thin `CLAUDE.md` redirect for non-Claude-Code agents

### Status

- ✅ Milestone 0 — foundation, tokens, styling and test harness, Button, workflow loop (its Phase 6 comparison was superseded by the swfllive component assessment)
- Active: foundation-components plan (`docs/superpowers/plans/2026-07-04-foundation-components.md`) — ✅ Phase 0 docs, ✅ Phase 1 default theme, ✅ Phase 2 conventions and skill, ✅ Phase 3 Badge; next: Phase 4 field system
- ✅ 2026-07-06 library review remediated in full (`docs/reviews/2026-07-06-library-review.md`, HISTORICAL)

---

## Purpose and shape

A versioned, public React component library published to npm and consumed by Next.js (App Router, RSC) and Vite apps. Everything follows from four library constraints: small, precisely typed, debuggable from outside, and adaptable.

### Positioning — why this library exists instead of MUI

MUI is the design target for interaction quality, so the question deserves a standing answer. This library is justified by four things MUI structurally cannot do:

- Server-first. MUI generates CSS at runtime (Emotion), themes through a context provider, and implements interaction with hooks — every MUI component forces a `"use client"` boundary and ships hydration JavaScript. Components here render on the server with zero JavaScript where possible, and `assert-use-client.mjs` proves it on every build
- MUI's interaction quality without Material's look. Using MUI means a product looks like Material Design until its generated styles are overridden, which is the notorious time sink of MUI projects. Here the look lives entirely in `--ui-*` variables: rebranding a product is one CSS file of overrides, no rebuild, no provider
- An API surface exactly as large as the products need. A prop enters the library because a real product needed it. A small surface can be held in one person's head, which compounds across every consuming app
- Change on the owner's schedule. Pre-1.0 corrections happen freely; 1.0 becomes a contract consumers can trust indefinitely, with no upstream forcing migrations

The strategy that follows: narrow and deep. Ten to twelve components at MUI-grade depth, server-first and token-skinned, beat a broad shallow catalog. Components that exist to serve one app's workflow (data tables with editable cells, date pickers) stay in that app until a second consumer needs them.

### Component growth — rebuild with a requirements source

Components are built fresh through the add-component flow, not migrated from earlier codebases. The owner's prior set (swfllive, Tailwind Plus-derived) serves as the requirements source: it says what each component must do — which props earned their place in production, which edge cases occurred — never how it looks or what it is named. Full analysis and roadmap: `docs/reviews/2026-07-04-swfllive-component-assessment.md`.

Reference discipline, in authority order: (1) this library's conventions — tokens, this file, `docs/component-conventions.md` — settle questions permanently; (2) MUI is the single design target for interaction depth, deviations only via the two named bars in §Component model; (3) the swfllive counterpart supplies requirements; (4) shadcn/Chakra and similar are gap-finding cross-checks, never a source of naming or styling. Styling decisions come from the token system alone — a question tokens cannot answer escalates to the token layer for a system-wide answer.

## Pipeline and data flow

```
tokens/tokens.json ──(Style Dictionary v5 with sd-transforms; --ui- prefix)──> build/tokens.{light,dark}.css (:root / [data-theme=dark])
src/styles/index.css ──(Lightning CSS: bundle @import layer(…), minify)──> dist/styles.css   (precompiled, all inside cascade layers)
src/**/*.tsx ──(tsdown: Rolldown/Oxc with babel-plugin-react-compiler)──> dist/*.mjs and dist/*.d.mts  (unbundled; client components RC-optimized, server components hook-free)
stories ──> Storybook 10 ──> Vitest browser mode (stories-as-tests, a11y) and Chromatic (visual gate)
main ──> Changesets ──> GitHub Actions ──> npm (OIDC trusted publish, provenance)
```

## Key decisions and rationale (as-built)

### API philosophy — convention-based, not composition

Public component APIs are high-level and convention-based: each component exposes an opinionated prop surface rather than a primitive composition. `<Button loading>` not `<Button><Spinner /></Button>`. The library handles internal composition; the consumer sees one configurable component.

Why convention over composition: composition libraries push consistency onto the consumer. A loading button in shadcn requires the consumer to import a Spinner, place it inside the Button, and wire `disabled` — at every use site. Across an app that is many places to keep consistent; forget one and the button is clickable while looking busy. Convention-based APIs move the burden into the library, enforced once.

When behavior-heavy components are added (combobox, dialog, menu, etc.), behavior primitives from headless libraries are wrapped internally as implementation details. They are never re-exported. The consumer's mental model is the high-level component, not the underlying primitive.

### Package shape — ESM-only (`package.json`)

- `"type":"module"`, no CJS
- `exports`: `.` → `./dist/index.mjs` and `./dist/index.d.mts` (plus a `default` condition so modern `require(esm)` resolves); `./styles.css` → `./dist/styles.css`; `./package.json` for introspecting tools
- `sideEffects: ["**/*.css"]` so consumer bundlers never tree-shake the stylesheet
- `files` whitelists `dist` plus `src` TS/TSX for go-to-source (stories, tests, and build-time styles negated out)
- `react` and `react-dom` are peerdeps (`>=19`) — one copy in the consumer; React Compiler `target:'19'` uses React 19's built-in runtime, no extra dep
- `publishConfig`: public access and provenance

Why ESM-only: RSC and Vite both resolve ESM; CJS doubles surface and fights `"use client"`.

### Build — tsdown and React Compiler (`tsdown.config.ts`)

tsdown (Rolldown and Oxc) emits per-file ESM. Config:

- `unbundle:true` — keeps `"use client"` boundaries granular and tree-shaking maximal
- `dts` and sourcemaps emitted
- `target:'es2022'` set explicitly (tsdown otherwise infers it from `engines.node`)
- Externals: `react` and `react-dom` only — declared peers, nothing else. A pre-registered external for a not-yet-declared package would let a component import it with no gate failing; a component that needs a runtime dependency adds the external and the peer dep in the same change (none planned — Dialog builds on the native `<dialog>` element per the foundation plan)
- React Compiler runs in-build via `@rolldown/plugin-babel` and `babel-plugin-react-compiler` (`target:'19'`) in the default `infer` mode — every component is auto-memoized unless it opts out. Memoization is itself a hook (`useMemoCache`), so compiled output cannot render in RSC; server-renderable components add a file-level `"use no memo"` directive, stay uncompiled, and ship hook-free. Client components get precompiled, auto-memoized output for free (React's recommended library path); server components opt out and stay RSC-native. Memoization only matters where a component re-renders — i.e. on the client — so opting server components out loses nothing. `assert-use-client.mjs` enforces the split: a compiled file with no `"use client"` fails the build.
- Emits `.mjs` and `.d.mts` — `exports` point there

### TypeScript — layered configs, TS 6.0

Two explicit configs (a child can't merge `include` or `exclude` from `extends`):

- `tsconfig.build.json` (strict — the publish contract): `isolatedDeclarations` (fast parallel DTS via Oxc; requires explicit export return types), `rootDir:src`, src-only (excludes stories and tests). Drives tsdown's emit (`--tsconfig`) and typecheck pass 1.
- `tsconfig.json` (broad, lenient): `src` and `.storybook/**/*` — type-checks the stories, `preview.tsx`, `main.ts`, and ambient `globals.d.ts`; powers the editor and typecheck pass 2.

Shared settings:

- `moduleResolution:"bundler"` — matches Next and Vite resolving our `exports`
- `verbatimModuleSyntax`
- `declarationMap` and `sourceMap` shipped from `src/` (go-to-source)
- `noEmit:true` — tsc is the typecheck gate only; tsdown emits

`pnpm typecheck` runs three passes — the two above plus `tsconfig.node.json` (root `*.config.ts` files, which belong to no other program; a type error there otherwise surfaces only as a runtime load failure).

The broad `include` uses the glob `'.storybook/**/*'`, not bare `'.storybook'` — TS silently skips dot-directories. See CLAUDE.md's gotcha for the symptom and diagnosis.

### Tokens — 3-tier DTCG, single-file (`tokens/tokens.json`, `style-dictionary.config.mjs`)

- Tiers: primitive (raw scale) → semantic (intent; the override surface; flips between light and dark). Component tier deferred (not needed for Button). Primitives: `core.color`, `core.spacing` (0/1/2/3/4/5/6/8/10, rem-based in 0.5rem increments), `core.radius` (none/sm/md/lg/full), `core.shadow` (level-1…4 + none), `core.duration` (fast/base/slow), `core.font-size` (sm/md/lg), `core.font-weight`. Semantics: `light`/`dark` color intents, surfaces, borders, input, overlay, plus `shadow` states (resting/raised/focus/pressed/flat) referencing the levels, so dark can rebind elevation later without touching components.
- Default palette values come verbatim from Radix Colors 3.0.0 (slate neutrals, blue primary, red/green intents) — the named source that replaced the original placeholder values. Color primitives keep Radix's scale-and-step names (`slate.6`, `blue.11`) for traceability; light and dark scales are separate primitive families (`slate` / `slate-dark`) because the core set is theme-agnostic. One deliberate deviation from Radix's step guide: solid intent backgrounds use step 11, not Radix's designated step 9 — step 9 fails WCAG AA (4.5:1) with white text on every scale we use, and the library's axe gate enforces AA. In dark themes no step passes with white text, so dark intents are light-colored solids with near-black text (matching MUI's dark palette). Every text pair is contrast-verified programmatically at design time and by axe at test time.
- Every emitted variable carries the `--ui-` prefix via a name transform — unprefixed names collide with consumer theme systems (Tailwind v4 reserves `--color-*`, `--spacing-*`, `--radius-*`, and an unlayered unprefixed token silently overrides the consumer's utilities app-wide). Dimensions are rem-based so component text and spacing respect user font-size preferences.
- Single-file Tokens Studio layout (sets: `core`, `light`, `dark`) — chosen for free Figma Git sync (multi-file and themes are Pro).
- SD v5 with `@tokens-studio/sd-transforms`, `outputReferences:true` so semantic tokens stay `var(--primitive)` — one consumer override cascades down the themeable chain.
- Emits two CSS artifacts: `:root` (light) and `[data-theme=dark]` (semantics re-bound, plus `color-scheme: dark` so native form controls and scrollbars match the theme).
- Dark build filters to semantics only; its "filtered references" warning is silenced but broken references stay fatal.

### Styling and theming — vanilla CSS in cascade layers (`src/styles/index.css`)

Component CSS is plain `.class { … }` rules and the bundle is produced by Lightning CSS (`--bundle --minify`). Decisions:

- Everything ships inside named cascade layers, and the names deliberately match Tailwind v4's (`theme, base, components, utilities`). Same-named layers merge across stylesheets, so in a Tailwind consumer app the cascade composes correctly in either import order: Preflight (their `base`) stays below our `components`, and their utility classes stay above (so `className="rounded-full"` overrides work). A private layer name fails one way or the other — declared before Tailwind, Preflight's button reset beats our components; declared after, consumer utilities lose. Verified empirically in both import orders against a stock Tailwind v4 build.
- Every published variable carries the `--ui-` prefix and every class the `ui-` prefix — the library never collides with consumer theme variables or utility names (see §Tokens).
- No global reset ships (Preflight-equivalent deliberately absent) — component classes are self-contained (`.ui-btn` resets `appearance/border/margin/font`).
- `:where()` zero-specificity token selectors (`:root`, `[data-theme="dark"]`) so consumer overrides win by plain specificity inside the shared `theme` layer, and unlayered consumer CSS wins over everything.
- Focus-visible shows a real ring on `--ui-color-ring` (outline, so it also survives Forced Colors Mode) plus an elevation step; elevation/motion/type resolve through semantic tokens, not hardcoded values.

Override contract: the public theming API is the `--ui-*` variables (semantic colors, spacing, radius, shadow, duration, type scale) — consumers' overrides beat ours by cascade order (no `!important`, no rebuild, no CSS framework required). Overrides should be paired light+dark; see README for the consumer-facing rules and example.

Per-component CSS layout: each component's styles live in `src/components/<name>/<name>.css` (co-located with the TSX). `src/styles/index.css` is a thin entry point that declares the layer order, imports the Style Dictionary outputs into `layer(theme)`, and `@import`s each component's CSS into `layer(components)`. Adding a new component means creating the CSS file and adding one `@import` line — `scripts/assert-css-imports.mjs` fails the build if the line is missing, because a forgotten import ships the component unstyled while every other gate stays green.

### Server and client boundary — `"use client"`

The barrel (`src/index.ts`) must not carry `"use client"` (would force the whole lib to the client). Components that create their own interactivity get the directive per-file and are auto-memoized by the compiler; server-renderable components add a file-level `"use no memo"` to opt out of compilation and stay hook-free (mechanism in § Build). A server-renderable component may still expose optional callback props — forwarding a consumer-supplied function is not owning interactivity (Badge's `onRemove`; rule in conventions § Server and client). `scripts/assert-use-client.mjs` scans `dist/` and enforces two invariants: the `"use client"` allowlist is symmetric (no stray or stripped directives), and every file lacking `"use client"` is genuinely hook-free — it imports no `react/compiler-runtime` and calls no React hook. The second check is the critical one: absence of a directive does not prove server-renderability, since the compiler silently injects `useMemoCache` into any component that didn't opt out. This is the highest-severity RSC failure mode, and it passes every client-context gate (Storybook, Vitest browser mode, typecheck, lint) — only this assertion and a real RSC render catch it.

### Component model — Button

Design target: MUI Material Button. When MUI does X, we do X unless the deviation has a named justification of one of two kinds: (a) a concrete user-visible UX improvement, or (b) alignment with the library's core positioning — React 19, Next.js App Router, RSC-first. Both bars are concrete: "modernization" alone is not (a), and "feels cleaner" alone is not (b). Surfaces that match MUI: hover and active color shifts (mechanism differs — oklch lightness vs alpha overlays — visual outcome aligned), a focus-visible elevation step (between hover and active) reinforcing the 2px `--ui-color-ring` outline (see § Styling), disabled treatment, `@media (hover: hover)` suppression on touch, `forced-colors` border, `prefers-reduced-motion`, icon a11y, ripple existence. Sizes (`small | medium | large`) approximate MUI's perceptual scale.

Deliberate deviations with named justifications. Each line names which bar the deviation clears — (a) user-visible UX win, or (b) React 19 / Next.js App Router / RSC alignment.

- (b) `ref` is a plain prop — `Button` is a plain function with `ref?: Ref<HTMLButtonElement>`; no `forwardRef` (removed in React 19). An explicit `ReactElement` return type satisfies `isolatedDeclarations`. The whole library is React 19-only; using the React 19 idiom for ref is the alignment, not a deviation worth re-litigating.
- Variants are a typed literal-class map (`variants.ts`): `Record<ButtonIntent,string>` and `Record<ButtonSize,string>` resolve to `ui-btn …` strings. The `Record` makes TS enforce one class per variant — add a variant and TS forces its class to exist — and literal strings keep the class ↔ stylesheet pairing searchable in both directions. The pure `buttonClasses()` is unit-testable on its own.
- Native HTML props spread via `...rest`; `className` merges with the variant classes.
- Stories are CSF Next (`preview.meta()` → `meta.story()`); `play({ canvas, userEvent, args })` with `import { fn, expect } from 'storybook/test'`.
- (a) Default `type='button'` (MUI inherits browser default). Prevents accidental form submit when the Button is dropped inside a `<form>`.
- (a) Explicit `aria-busy={loading || undefined}` (MUI relies on implicit busy semantics). One less semantic gap for screen readers.
- (a) Hover/active color shift via `oklch(from var(--ui-color-X-bg) calc(l ± N) c h)` instead of MUI's `alpha(palette.main, 0.04)` overlay. Both work; ours is theme-token-portable and lets the same shift formula serve every intent. Marginal — kept because the override contract (point below) needs CSS-var inputs and oklch shifts compose with them: one `-bg` override re-derives its own hover/active shifts, where Radix-style hover tokens would turn pair overrides into triples. Browsers without relative-color support drop the shift; the elevation change still signals state.
- (b) Semantic-token theming (`--ui-color-primary-bg`, `--ui-color-primary-fg`, …) rather than a JS theme object. The whole library targets RSC and Next.js App Router; a JS theme object would require a Provider in every consumer's `layout.tsx` and forfeit server-renderability. CSS-var overrides need no JS, no Provider, and no rebuild.
- (a) Color-alone warning in `intent` JSDoc: pair `danger` with an explicit destructive label. Concrete a11y improvement codified at the prop type rather than left as Material guidance.

#### Server-renderable Button — the trade-off

(b) `button.tsx` carries no `"use client"`. The component is presentational — no hooks, no event handlers wired internally, CSS-only ripple and spinner animations. This is a deliberate deviation from MUI (which requires `"use client"` because of its `useState`/`useRef` ripple machinery) and clears the React 19 / Next.js App Router / RSC alignment bar directly: the library exists to be RSC-native, and the Button is the most-used component in any app — making it server-renderable by default is the highest-leverage place to honor that positioning.

Benefit (the user-visible one): zero JS shipped for the Button in any RSC consumer. No hydration cost. Pages where a Button only fires `onClick` after hydration (which the consumer wires via prop, not the library) get the static markup at first paint and stay interactive without the library contributing a single byte of JS. Static surfaces (marketing pages, docs, table action buttons, server-rendered admin tools) benefit directly.

Cost (the user-visible one): the ripple is a centered scale flash, not a MUI-style click-point origin. MUI's ripple expands from `clientX`/`clientY`; ours starts from the button's geometric center. Reproducing MUI's behavior would require `"use client"` and `useState` to capture click coordinates — at which point we forfeit the SSR benefit above.

Future agents: do not re-open this without a specific user-visible improvement that requires it. The architectural simplicity (no hooks, no client boundary) is what makes the "Button is free in RSC" claim true.

### Cross-cutting accessibility

Three policies every component honors. Documented here so the first component to need each one inherits the convention rather than re-discovering it.

- Survive `forced-colors` (Windows HCM). Token colors collapse to system colors under `@media (forced-colors: active)`, so each component adds an explicit `border: 1px solid ButtonText` (or equivalent) and a `Highlight` focus outline. Button is the reference.
- Respect `prefers-reduced-motion`. Every transition and animation is disabled under `@media (prefers-reduced-motion: reduce)` — Button (transitions, spinner, ripple) and Badge (remove-control transition) are the references.
- Never rely on color alone. Destructive intent pairs with an explicit label; status indicators pair with an icon or text. Documented per-component in JSDoc.
- Right-to-left support deferred. `modes.ts` exports only `light` and `dark` today. Add an `rtl: { dir: 'rtl' }` mode there when the first directional component lands (none in the foundation set).

### Story pattern

Every component's `*.stories.tsx` follows the same shape so reviewers and agents pattern-match without rediscovery. Button is the reference.

Authoring source-of-truth split:

- Component file (`component.tsx`) — JSDoc on props interface fields → autodocs prop descriptions; JSDoc above the component export → autodocs component description.
- Story file (`component.stories.tsx`) — runtime examples (stories, play tests, override demos, the matrix).
- `.storybook/preview.tsx` — globals: `tags: ['autodocs']` cascade, `a11y: { test: 'error' }`, themes.
- `.storybook/modes.ts` — Chromatic mode definitions (`allModes.{light,dark}`).
- `.storybook/main.ts` — `reactDocgenTypescriptOptions.shouldRemoveUndefinedFromOptional: true` (strips `undefined` from optional union props in inferred controls); `propFilter` excludes `ref` globally (React 19 ref-as-prop is implementation detail, not consumer surface).

Per-story shape: the five-story set defined in `docs/component-conventions.md` § "Stories and tests" (variant baselines, state baselines, interaction plays, override demo, `AllVariants` dual-theme matrix) — that document is the single copy.

Deferred (re-evaluate at component #3 — Rule of Three):

- Helper factories (`variantMatrix(Component, intents, sizes)`, assertion shorthands).
- MDX per component (autodocs from CSF and JSDoc covers the docs case; reach for MDX only when a component needs multi-section narrative).
- `KeyboardActivation` tests for components that don't customize keyboard handling.

### Testing and docs

- Storybook 10 on `@storybook/react-vite` is the dev, docs, and test harness
- CSF Next factory stories (`definePreview` → `preview.meta()` → `meta.story()`) for type-safe stories
- `react-docgen-typescript` for accurate prop tables
- The preview imports the precompiled `dist/styles.css` (matches consumers)
- One Storybook story feeds the interaction test, the a11y audit (Vitest browser mode, real headless Chromium via `@vitest/browser-playwright`), and the Chromatic visual snapshot
- A second `node`-environment Vitest project (`unit`) runs pure-logic unit tests (no DOM — not jsdom)

Chromatic with TurboSnap is a required visual gate. CI shape: a `correctness` job (all local gates plus `playwright install`) → a `chromatic` job (`needs: correctness`). Gating chromatic on correctness ensures cheap gates fail-fast and no Chromatic snapshot is spent on a broken build. Chromatic policy (`autoAcceptChanges: 'main'`, `exitZeroOnChanges: false`, `onlyChanged: true`) lives in `chromatic.config.json` so local `pnpm chromatic` and CI behave identically; the workflow only passes `projectToken` to the action.

An MCP server (`@storybook/addon-mcp`) exposes the library's real component docs, props, and stories. See CLAUDE.md § "Storybook MCP" for the URL, lifecycle, and usage rules.

### Release

Changesets (public access) with automatic provenance and `@changesets/changelog-github` changelogs. `release.yml` runs on push to `main`: after the gate suite (typecheck, lint, build, test) passes, `changesets/action` opens a Version Packages PR, and merging it runs `pnpm release` (`changeset publish`; the build and verifications run in `prepublishOnly`). Publishing uses npm OIDC trusted publishing (no stored `NPM_TOKEN`), granted via the workflow's `id-token: write` permission.

The Version Packages PR is App-authored so its required checks run (see [`docs/workflow.md`](./docs/workflow.md) for the why and the full mechanics). The `repository` field in `package.json` is required for OIDC provenance to attach. `prepublishOnly` rebuilds and re-verifies (`verify:pack`, `assert:use-client`, `smoke:dist`) on every publish path, manual or CI.

The full maintainer publish loop, the `pnpm pack` local-test loop, and the consumer update loop are documented in [`docs/workflow.md`](./docs/workflow.md).

### Quality gates

ESLint flat (typescript-eslint, react-hooks, jsx-a11y, `@eslint-react`, import-x; type-aware config also covers `.storybook/**/*.tsx`; `eslint-config-prettier` last; `--max-warnings 0` so warnings gate), Prettier, knip, cspell (all markdown and source), publint, and `attw` (`verify:types`, in CI; `--profile esm-only` accepts no-CJS/no-node10 as intended, `--exclude-entrypoints styles.css` skips the non-JS subpath). Vitest runs with v8 coverage thresholds; the `unit` project covers pure logic (`variants.test.ts`) alongside the browser-mode story tests. Root config files are type-checked by `tsconfig.node.json` (typecheck pass 3).

## File and module map

| Path                                                                                                    | Responsibility                                                                                                                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `package.json`                                                                                          | ESM manifest: exports, sideEffects, peers, scripts, publishConfig                                                                                                                                                                                                                 |
| `pnpm-workspace.yaml`                                                                                   | pnpm catalog (react, react-dom, typescript) and pnpm settings (`engineStrict`, `allowBuilds`)                                                                                                                                                                                     |
| `.nvmrc`, `package.json` `packageManager`                                                               | runtime and package-manager pins (exact, no ranges)                                                                                                                                                                                                                               |
| `tsconfig.build.json`                                                                                   | strict publish contract: isolatedDeclarations, rootDir:src, src-only; tsdown emit and typecheck pass 1                                                                                                                                                                            |
| `tsconfig.json`                                                                                         | broad and lenient: `src` and `.storybook/**/*`; editor and typecheck pass 2                                                                                                                                                                                                       |
| `tsconfig.node.json`                                                                                    | root `*.config.ts` type-checking (typecheck pass 3)                                                                                                                                                                                                                               |
| `tsdown.config.ts`                                                                                      | ESM, unbundle, externals, dts, React Compiler (infer; server components opt out)                                                                                                                                                                                                  |
| `eslint.config.ts`, `.prettierrc.json`, `cspell.json`, `knip.json`                                      | lint, format, spell, dead-code                                                                                                                                                                                                                                                    |
| `scripts/assert-use-client.mjs`                                                                         | build-time `"use client"` guardrail                                                                                                                                                                                                                                               |
| `scripts/assert-theme-parity.mjs`, `scripts/assert-css-imports.mjs`, `scripts/assert-pack-contents.mjs` | build-time silent-failure guards: light/dark token parity; every component CSS imported; no stories/tests/style sources leak into the published tarball (with publint = `verify:pack`)                                                                                            |
| `scripts/css-watch.mjs`                                                                                 | dev loop: rebuild `dist/styles.css` on CSS edits (Storybook consumes dist)                                                                                                                                                                                                        |
| `tokens/tokens.json`, `tokens/README.md`                                                                | DTCG tokens (single-file sets) and sync contract                                                                                                                                                                                                                                  |
| `style-dictionary.config.mjs`                                                                           | tokens → `build/*.css` (`--ui-`-prefixed CSS vars, light + dark)                                                                                                                                                                                                                  |
| `src/styles/index.css`                                                                                  | CSS entry → Lightning CSS bundles/minifies into `dist/styles.css` (layered, `ui-*`, no reset)                                                                                                                                                                                     |
| `src/index.ts`                                                                                          | barrel (no `"use client"`); exports each component, its props type, and its component-prefixed variant unions (`ButtonIntent`, `BadgeIntent`, …)                                                                                                                                  |
| `src/components/button/**`                                                                              | Button: `button.tsx`, `variants.ts`, `button.css`, `*.stories.tsx`, `variants.test.ts`                                                                                                                                                                                            |
| `src/components/badge/**`                                                                               | Badge: same file shape as Button (the add-component scaffold)                                                                                                                                                                                                                     |
| `.storybook/main.ts`, `.storybook/preview.tsx`, `.storybook/modes.ts`                                   | Storybook 10 config (CSF Next `definePreview`; addon-themes, addon-docs, addon-a11y, addon-vitest, addon-mcp, addon-pseudo-states; react-docgen-typescript) and Chromatic mode definitions                                                                                        |
| `.storybook/brand-swfllive.css`                                                                         | brand-preset override sheet for the Palette toolbar (runtime rebrand proof)                                                                                                                                                                                                       |
| `.mcp.json`, `AGENTS.md`                                                                                | Storybook MCP wiring (Claude Code) and cross-tool agent guidance (verify props via MCP)                                                                                                                                                                                           |
| `vitest.config.ts`                                                                                      | Vitest: `storybook` browser project and `node`-env `unit` project                                                                                                                                                                                                                 |
| `.github/workflows/ci.yml`                                                                              | `correctness` job (typecheck, lint, knip, spell, format, build, assert:use-client, test, publint, and playwright install) → `chromatic` job (needs:correctness; skipped on fork PRs; `chromaui/action` SHA-pinned, TurboSnap via config). Concurrency cancel-in-progress per ref. |
| `chromatic.config.json`                                                                                 | Chromatic policy: TurboSnap (`onlyChanged`), `autoAcceptChanges:"main"`, `exitZeroOnChanges:false`. Token never here — GitHub Actions secret only.                                                                                                                                |
| `renovate.json`                                                                                         | Weekly grouped PRs: npm + github-actions minor and patch updates, SHA-pin digest maintenance. Storybook majors ignored (CSF Next experimental).                                                                                                                                   |
| `.github/workflows/release.yml`, `.changeset/`                                                          | Changesets release: Version Packages PR (App-token authored) → OIDC trusted publish with provenance                                                                                                                                                                               |
| `docs/workflow.md`                                                                                      | publish, local-test, and consumer update loops (persistent doc)                                                                                                                                                                                                                   |
| `docs/component-conventions.md`                                                                         | canonical component pattern — authority layer 1 for component decisions (persistent doc)                                                                                                                                                                                          |
| `.claude/skills/add-component/SKILL.md`                                                                 | the add-component flow: reference discipline, scaffold, RSC decision, gates, owner gate                                                                                                                                                                                           |

## Invariants and contracts

- Semantic tokens (`--ui-color-*-bg/-fg`, `--ui-shadow-*`) plus the published scales (`--ui-spacing-*`, `--ui-radius-*`, `--ui-duration-*`, `--ui-font-*`) are the public, semver-stable override surface. Internal primitives (e.g. `--ui-color-blue-11`, `--ui-shadow-level-*`) may be renamed without a breaking change; renaming any public variable is one.
- The barrel never carries `"use client"`.
- `dist/styles.css` is precompiled from explicit `@import`s only (no source scanning) — editing docs must not change it.
- `exports` resolve to `.mjs` and `.d.mts` (tsdown's output extensions).
- Build order is `tokens && tsdown && css` (tsdown wipes `dist/`).
- `engines.node` floor is `>=22.12.0` — the consumer floor (Vite 6's floor; satisfies React 19, Next.js, and Active LTS Node 22). The contributor build floor is separate: `devEngines.runtime` (`>=24.11.1`, `onFail: error`) fails install on a Node too old to load `tsdown.config.ts`; `.nvmrc` (24.16.0 exact) is the dev pin.
- `peerDependencies` for `react` and `react-dom` are `>=19` while pre-1.0. Tighten to `^19.0.0` before the first `1.0.0` publish; expand to `^19.0.0 || ^20.0.0` after React 20 is verified. React Compiler `target: '19'` is fixed at build time, so accepting unverified majors silently is a real risk at v1.
- `--ui-spacing-*` and `--ui-radius-*` are part of the public override surface alongside the semantic colors — consumers can rebrand proportions without rebuild.
