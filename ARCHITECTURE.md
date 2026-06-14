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
- Phase 6 - Comparison

---

## Purpose and shape

A versioned, public React component library published to npm and consumed by Next.js (App Router, RSC) and Vite apps. Everything follows from four library constraints: small, precisely typed, debuggable from outside, and adaptable.

## Pipeline and data flow

```
tokens/tokens.json ──(Style Dictionary v5 with sd-transforms)──> build/tokens.{light,dark}.css (:root / [data-theme=dark])
                                                            └──> build/theme.css (@theme inline)
src/styles/index.css ──(@tailwindcss/cli; source-scoped, Preflight omitted)──> dist/styles.css   (precompiled, controlled)
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
- `exports`: `.` → `./dist/index.mjs` and `./dist/index.d.mts`; `./styles.css` → `./dist/styles.css`
- `sideEffects: ["**/*.css","./dist/styles.css"]` so consumer bundlers never tree-shake the stylesheet
- `files: ["dist","src"]` ships source for go-to-source
- `react` and `react-dom` are peerdeps (`>=19`) — one copy in the consumer; React Compiler `target:'19'` uses React 19's built-in runtime, no extra dep
- `publishConfig`: public access and provenance

Why ESM-only: RSC and Vite both resolve ESM; CJS doubles surface and fights `"use client"`.

### Build — tsdown and React Compiler (`tsdown.config.ts`)

tsdown (Rolldown and Oxc) emits per-file ESM. Config:

- `unbundle:true` — keeps `"use client"` boundaries granular and tree-shaking maximal
- `dts` and sourcemaps emitted
- `target:'es2022'` set explicitly (tsdown otherwise infers it from `engines.node`)
- Externals: `react`, `react-dom`, and `radix-ui` and `@radix-ui/*` (Radix entries pre-registered for component #2 — Dialog — per spec §4.2; no-op until the first Radix import lands)
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

`pnpm typecheck` runs both passes.

The broad `include` uses the glob `'.storybook/**/*'`, not bare `'.storybook'` — TS silently skips dot-directories. See CLAUDE.md's gotcha for the symptom and diagnosis.

### Tokens — 3-tier DTCG, single-file (`tokens/tokens.json`, `style-dictionary.config.mjs`)

- Tiers: primitive (raw scale) → semantic (intent; the override surface; flips between light and dark). Component tier deferred (not needed for Button). Primitives include `core.color`, `core.spacing` (0/1/2/3/4/5/6/8/10 in 8px increments) and `core.radius` (none/sm/md/lg/full). Spacing and radius are exposed via `@theme inline` so Tailwind utilities resolve through them.
- Single-file Tokens Studio layout (sets: `core`, `light`, `dark`) — chosen for free Figma Git sync (multi-file and themes are Pro).
- SD v5 with `@tokens-studio/sd-transforms`, `outputReferences:true` so semantic tokens stay `var(--primitive)` — one consumer override cascades down the themeable chain.
- Emits three CSS artifacts: `:root` (light), `[data-theme=dark]`, and a `@theme inline` artifact.
- Dark build filters to semantics only; its "filtered references" warning is silenced but broken references stay fatal.

### Styling and theming — Tailwind v4, precompiled and controlled (`src/styles/index.css`)

The most-corrected area. Decisions:

- `@theme inline` (not plain `@theme`) — utilities reference the live `--color-*` variable, so
  a consumer override in their `:root` cascades with no rebuild.
- `prefix()` rejected. Validated against Tailwind v4 docs: `prefix(tw)` also renames theme
  variables (`--color-*` → `--tw-color-*`), which would break the override contract. Wrong tool.
- `source(none)` and `@source "../components"` (layered import form) — disables Tailwind's whole-repo auto-scan (which had been scraping class names out of `docs/*.md` into the output). The shipped CSS is now minimal and deterministic — doc-independent.
- Preflight omitted — a precompiled component lib must not impose a global reset on consumers.
  Component classes are therefore self-contained (`.ui-btn` resets `appearance/border/margin/font`).
- `ui-` namespaced component classes (authored via `@utility`) — collision-safety by naming,
  with variables left untouched (vs. `prefix()`).
- `:where()` zero-specificity dark variant matching `[data-theme="dark"]` so consumer overrides
  win with no `!important`.

Override contract: the public theming API is unprefixed `--color-*` semantic tokens — consumers' overrides beat ours by cascade order (no `!important`, no rebuild, no Tailwind install). See README for the consumer-facing example.

Per-component CSS layout: each component's styles live in `src/components/<name>/<name>.css` (co-located with the TSX). `src/styles/index.css` is a thin entry point that `@layer`-declares the order, imports Tailwind's theme and utilities layers, imports the Style Dictionary outputs, declares the dark custom-variant, and then `@import`s each component's CSS file explicitly. Adding a new component means creating the CSS file and adding one `@import` line. `@utility` blocks compile into `@layer utilities` regardless of which file they live in, so layer ordering stays predictable.

Direction: planned migration from Tailwind v4 to vanilla CSS using native `@layer` and per-component `.css` files. We do not use Tailwind's JIT utility classes in JSX; `@utility` blocks compile to plain CSS regardless; `@theme inline` is convenience over vanilla `:root` variable declarations. A future agent should verify the three premises still hold (no JIT utility classes have crept into JSX; `@utility` syntax is used only as block sugar rewritable to `.class { … }` rules; `@theme inline` remains single-purpose) and then execute the migration. Current state stays Tailwind until that verification passes.

### Server and client boundary — `"use client"`

The barrel (`src/index.ts`) must not carry `"use client"` (would force the whole lib to the client). Interactive components get the directive per-file and are auto-memoized by the compiler; purely-visual server-renderable components add a file-level `"use no memo"` to opt out of compilation and stay hook-free. `scripts/assert-use-client.mjs` scans `dist/` and enforces two invariants: the `"use client"` allowlist is symmetric (no stray or stripped directives), and every file lacking `"use client"` is genuinely hook-free — it imports no `react/compiler-runtime` and calls no React hook. The second check is the critical one: absence of a directive does not prove server-renderability, since the compiler silently injects `useMemoCache` into any component that didn't opt out. This is the highest-severity RSC failure mode, and it passes every client-context gate (Storybook, Vitest browser mode, typecheck, lint) — only this assertion and a real RSC render catch it.

### Component model — Button

Design target: MUI Material Button. When MUI does X, we do X unless the deviation has a named justification of one of two kinds: (a) a concrete user-visible UX improvement, or (b) alignment with the library's core positioning — React 19, Next.js App Router, RSC-first. Both bars are concrete: "modernization" alone is not (a), and "feels cleaner" alone is not (b). Surfaces that match MUI: hover and active color shifts (mechanism differs — oklch lightness vs alpha overlays — visual outcome aligned), focus-visible signaled by elevation depth (between hover and active; no static ring), disabled treatment, `@media (hover: hover)` suppression on touch, `forced-colors` border, `prefers-reduced-motion`, icon a11y, ripple existence. Sizes (`small | medium | large`) approximate MUI's perceptual scale.

Deliberate deviations with named justifications. Each line names which bar the deviation clears — (a) user-visible UX win, or (b) React 19 / Next.js App Router / RSC alignment.

- (b) `ref` is a plain prop — `Button` is a plain function with `ref?: Ref<HTMLButtonElement>`; no `forwardRef` (removed in React 19). An explicit `ReactElement` return type satisfies `isolatedDeclarations`. The whole library is React 19-only; using the React 19 idiom for ref is the alignment, not a deviation worth re-litigating.
- Variants are a typed literal-class map (`variants.ts`): `Record<Intent,string>` and `Record<Size,string>` resolve to `ui-btn …` strings. Tailwind can't see dynamic names (`ui-btn-${intent}`), so each class must appear as a literal in scanned source; the `Record` makes TS enforce one class per variant — add a variant and TS forces its class to ship. The pure `buttonClasses()` is unit-testable on its own.
- Native HTML props spread via `...rest`; `className` merges with the variant classes.
- Stories are CSF Next (`preview.meta()` → `meta.story()`); `play({ canvas, userEvent, args })` with `import { fn, expect } from 'storybook/test'`.
- (a) Default `type='button'` (MUI inherits browser default). Prevents accidental form submit when the Button is dropped inside a `<form>`.
- (a) Explicit `aria-busy={loading || undefined}` (MUI relies on implicit busy semantics). One less semantic gap for screen readers.
- (a) Hover/active color shift via `oklch(from var(--color-X) calc(l ± N) c h)` instead of MUI's `alpha(palette.main, 0.04)` overlay. Both work; ours is theme-token-portable and lets the same shift formula serve every intent. Marginal — kept because the override contract (point below) needs CSS-var inputs and oklch shifts compose with them.
- (b) Semantic-token theming (`--color-primary`, `--color-primary-fg`, …) rather than a JS theme object. The whole library targets RSC and Next.js App Router; a JS theme object would require a Provider in every consumer's `layout.tsx` and forfeit server-renderability. CSS-var overrides need no JS, no Provider, and no rebuild.
- (a) Color-alone warning in `intent` JSDoc: pair `danger` with an explicit destructive label. Concrete a11y improvement codified at the prop type rather than left as Material guidance.

#### Server-renderable Button — the trade-off

(b) `button.tsx` carries no `"use client"`. The component is presentational — no hooks, no event handlers wired internally, CSS-only ripple and spinner animations. This is a deliberate deviation from MUI (which requires `"use client"` because of its `useState`/`useRef` ripple machinery) and clears the React 19 / Next.js App Router / RSC alignment bar directly: the library exists to be RSC-native, and the Button is the most-used component in any app — making it server-renderable by default is the highest-leverage place to honor that positioning.

Benefit (the user-visible one): zero JS shipped for the Button in any RSC consumer. No hydration cost. Pages where a Button only fires `onClick` after hydration (which the consumer wires via prop, not the library) get the static markup at first paint and stay interactive without the library contributing a single byte of JS. Static surfaces (marketing pages, docs, table action buttons, server-rendered admin tools) benefit directly.

Cost (the user-visible one): the ripple is a centered scale flash, not a MUI-style click-point origin. MUI's ripple expands from `clientX`/`clientY`; ours starts from the button's geometric center. Reproducing MUI's behavior would require `"use client"` and `useState` to capture click coordinates — at which point we forfeit the SSR benefit above.

Future agents: do not re-open this without a specific user-visible improvement that requires it. The architectural simplicity (no hooks, no client boundary) is what makes the "Button is free in RSC" claim true.

### Cross-cutting accessibility

Three policies every component honors. Documented here so the first component to need each one inherits the convention rather than re-discovering it.

- Survive `forced-colors` (Windows HCM). Token colors collapse to system colors under `@media (forced-colors: active)`, so each component adds an explicit `border: 1px solid ButtonText` (or equivalent) and a `Highlight` focus outline. Button is the reference.
- Respect `prefers-reduced-motion`. Animations and transitions are gated behind `@media (prefers-reduced-motion: no-preference)` (or kept short and non-essential). No current component needs this; the first one with a transition is the trigger.
- Never rely on color alone. Destructive intent pairs with an explicit label; status indicators pair with an icon or text. Documented per-component in JSDoc.
- Right-to-left support deferred. `modes.ts` exports only `light` and `dark` today. Add an `rtl: { dir: 'rtl' }` mode there when the first directional component lands (likely Tabs, Menu, or Tooltip post-§4.1).

### Story pattern

Every component's `*.stories.tsx` follows the same shape so reviewers and agents pattern-match without rediscovery. Button is the reference.

Authoring source-of-truth split:

- Component file (`component.tsx`) — JSDoc on props interface fields → autodocs prop descriptions; JSDoc above the component export → autodocs component description.
- Story file (`component.stories.tsx`) — runtime examples (stories, play tests, override demos, the matrix).
- `.storybook/preview.tsx` — globals: `tags: ['autodocs']` cascade, `a11y: { test: 'error' }`, themes.
- `.storybook/modes.ts` — Chromatic mode definitions (`allModes.{light,dark}`).
- `.storybook/main.ts` — `reactDocgenTypescriptOptions.shouldRemoveUndefinedFromOptional: true` (strips `undefined` from optional union props in inferred controls); `propFilter` excludes `ref` globally (React 19 ref-as-prop is implementation detail, not consumer surface).

Per-story shape, in order:

1. Variant baselines — one one-liner per public variant (`export const Primary = meta.story({ args: { intent: 'primary' } })`). Story names carry the meaning; no `parameters.docs.description.story` blocks.
2. State baselines — render-only one-liners for visually-distinct states (`Disabled`, `Loading`). Captured by Chromatic; scanned by addon-a11y.
3. Interaction test — one `play` story per user interaction the component owns. Skip native HTML behavior the component doesn't customize (e.g., browser-default Enter/Space activation on a plain `<button>`).
4. Override demo — one story wrapping the component in an ancestor that sets a `--color-*` token, proving the runtime override contract per-component.
5. `AllVariants` matrix — `tags: ['!autodocs']`, `controls: { disable: true }`, `parameters.chromatic.modes: { light, dark }`. The Chromatic multi-theme baseline.

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

Changesets (public access) with automatic provenance and `@changesets/changelog-github` changelogs. `release.yml` runs on push to `main`: `changesets/action` opens a Version Packages PR, and merging it runs `pnpm release` (`pnpm build && changeset publish`). Publishing uses npm OIDC trusted publishing (no stored `NPM_TOKEN`), granted via the workflow's `id-token: write` permission.

### Quality gates

ESLint flat (typescript-eslint, react-hooks, jsx-a11y, `@eslint-react`, import-x), Prettier, knip (scoped via `project: src/`; CSS-only and peer deps in `ignoreDependencies`), cspell, and publint. `attw` is split into `verify:types` and not gating yet — `@arethetypeswrong/cli@0.18.2` is broken on this Node 24 / pnpm 11 environment regardless of project (reproduces against any npm package). See CLAUDE.md "Gotchas" entry for the diagnostic and re-enable trigger.

## File and module map

| Path                                                               | Responsibility                                                                                                                                                                                                                                           |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `package.json`                                                     | ESM manifest: exports, sideEffects, peers, scripts, publishConfig                                                                                                                                                                                        |
| `pnpm-workspace.yaml`                                              | pnpm catalog (react, react-dom, typescript, tailwindcss) and pnpm settings (`engineStrict`, `allowBuilds`)                                                                                                                                               |
| `.nvmrc`, `package.json` `packageManager`                          | runtime and package-manager pins (exact, no ranges)                                                                                                                                                                                                      |
| `tsconfig.build.json`                                              | strict publish contract: isolatedDeclarations, rootDir:src, src-only; tsdown emit and typecheck pass 1                                                                                                                                                   |
| `tsconfig.json`                                                    | broad and lenient: `src` and `.storybook/**/*`; editor and typecheck pass 2                                                                                                                                                                              |
| `tsdown.config.ts`                                                 | ESM, unbundle, externals, dts, React Compiler (infer; server components opt out)                                                                                                                                                                         |
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
- `engines.node` floor is `>=22.12.0` — Vite 6's floor; satisfies React 19, Next.js, and Active LTS Node 22. `.nvmrc` (24.16.0 exact) is the dev pin (tsdown config-load needs ≥24.11.1 at our build time; not a consumer concern).
- `peerDependencies` for `react` and `react-dom` are `>=19` while at `0.0.0`. Tighten to `^19.0.0` before the first `1.0.0` publish; expand to `^19.0.0 || ^20.0.0` after React 20 is verified. React Compiler `target: '19'` is baked into the emit, so accepting unverified majors silently is a real risk at v1.
- `--spacing-*` and `--radius-*` are part of the public override surface alongside `--color-*` — consumers can rebrand proportions without rebuild.
