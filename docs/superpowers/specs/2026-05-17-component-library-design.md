# Component Library — Design Spec

**Date:** 2026-05-17
**Status:** Approved (design); pending detailed implementation plan
**Owner:** William Phelps (+ small team)

**Revision history:**
- r1 — initial design from brainstorming.
- r2 — documented bundler alternatives considered (tsdown vs bunchee vs tsup).
- r3 — folded in spring-2026 DX/performance improvements (React Compiler
  shipped output, Tailwind cascade-layer override strategy, go-to-source
  maps, code-quality toolchain + `"use client"` guardrail, knip, API-surface
  snapshot, `pkg.pr.new` previews, Storybook 10 + CSF factories + theming
  toolbar, Vitest perf, pnpm 11 + catalogs); Storybook target moved 9.x → 10.x.

## 1. Purpose

A reusable, versioned React component library shared across the team's
projects, published as a **single public scoped npm package**
(`@scope/ui` — final scope name TBD by owner, not blocking design).

It must:

- Render correctly in **Next.js App Router (React Server Components)** and
  **Vite SPAs**.
- Ship **precompiled CSS** so consumers never install or configure Tailwind.
- Support **runtime theming**: consumers override a color palette
  (primary / neutral / success / error / …) and dark mode purely via CSS
  variables, with no rebuild.
- Stay coherent and low-maintenance for a small, dev-led team.

Initial scope is a **core primitives set (~12 components)**. Most already
exist in prior work (Tailwind Plus styling + Headless UI behavior) and will
be moved into this repo by the owner. The work is therefore primarily:
restructure → token migration → Headless UI→Radix port → accessibility/test
hardening → packaging/release.

## 2. Decisions (locked via brainstorming)

| Topic | Decision |
|---|---|
| Language / UI / docs | TypeScript, React 19, Storybook 10.x |
| Audience | Owner + small team |
| Distribution | Versioned **public scoped npm package** (not shadcn-style copy-in, not private registry) |
| Consumers | Next.js App Router (RSC) **and** Vite SPAs |
| Styling engine | **Tailwind v4 internally**, shipped as **precompiled CSS** |
| Theming | Consumer-supplied palette + dark mode via **CSS-variable token overrides**, no rebuild; zero-specificity override contract |
| Design tokens | **Code-first** W3C/DTCG JSON → Style Dictionary → CSS vars; Figma mirrors via Tokens Studio (code is source of truth) |
| Primitives | Standardize on **Radix** (consolidated `radix-ui` package); migrate existing Headless UI Modal/Tabs |
| Component scope | Core primitives set (~12) |
| Repo structure | **Single repo, single package**; tokens compiled internally (not separately published) |
| Bundler | **tsdown** (Rolldown/Oxc), ESM-only, per-module output |
| React optimization | **Ship React-Compiler-compiled output** (compiler `target: '19'`) |
| Package manager | **pnpm 11** + catalogs for framework-critical pins |
| Lint / format | **ESLint flat config + Prettier**, optional **oxlint** fast pre-pass |
| Preview releases | **pkg.pr.new** per-PR installable previews |
| Quality bar | Unit + interaction tests, automated a11y, visual regression, API-surface guard |
| Release | Changesets + GitHub Actions, npm OIDC trusted publishing |

## 3. Non-Goals (YAGNI)

Explicitly out of scope for this project:

- React Native / web-native cross-platform support.
- Monorepo or a separately published `@scope/tokens` package (extractable
  later without breaking consumers if a non-React need ever arises).
- shadcn-style copy-in distribution; private/paid registries.
- A bespoke standalone documentation site beyond Storybook (Storybook
  autodocs + MDX is the documentation surface).
- Full design-system surface (layout primitives, typography system, icon
  set, theming UI). May follow later in separate spec → plan cycles.
- `@microsoft/api-extractor` (release tags / curated `.api.md`) — deferred;
  a committed bundled-`.d.ts` snapshot covers accidental-breakage detection
  for now (see §4.5).
- Adopting the TypeScript native port (`tsgo`) as an authoritative gate —
  optional non-blocking pre-check only until declaration emit stabilizes
  (see §4.4).

## 4. Architecture

### 4.1 Package & module format

- **One repo, one published package.** Tokens compile internally into the
  shipped CSS; not a separate package.
- **ESM-only**, `package.json` `"type": "module"`.
- `exports` map with conditions ordered `types → import → default`:
  - `"."` → `{ types: ./dist/index.d.ts, import: ./dist/index.js }`
  - Explicit CSS subpath: `"./styles.css": "./dist/styles.css"` (consumers
    `import "@scope/ui/styles.css"` once at app root).
  - Optional per-component subpaths for maximal granular tree-shaking.
- `"sideEffects": false` **except** the precompiled CSS, which must be
  listed explicitly (e.g. `["**/*.css", "./dist/styles.css"]`) — otherwise
  bundlers tree-shake away the consumer's stylesheet import and styles
  silently vanish.
- `peerDependencies`: `react: ">=19"`, `react-dom: ">=19"` (required). The
  React 19 floor is intentional — it lets React Compiler `target: '19'`
  emit `react/compiler-runtime` (built-in) with **no extra runtime
  dependency** (see §4.2).
- `radix-ui` in **`dependencies`** (implementation detail, externalized at
  build, consumers should not install it), caret-pinned on `1.4.x`.
- `"files": ["dist", "src"]` — **`src` is published intentionally** so
  `declarationMap` / source maps resolve and consumers can cmd-click into
  real source (see §4.4). Public library, so no source-leak concern.
- `publishConfig: { access: "public", provenance: true }`.

### 4.2 Build

- **Bundler: `tsdown`** (Rolldown/Oxc-based, directive-preserving).
  - `format: ['esm']` only (add `cjs` only if a consumer demands it).
  - `unbundle: true` — per-module output so `"use client"` boundaries stay
    granular and tree-shaking is maximal. A single bundled chunk would drag
    the entire library across the client boundary.
  - Externalize `react`, `react-dom`, `react/*`, `radix-ui`, `@radix-ui/*`.
  - `dts: true`; JSX automatic runtime; `sourcemap: true`.
  - **React Compiler:** run `babel-plugin-react-compiler` (v1.x, stable) via
    tsdown's documented recipe (`@rolldown/plugin-babel` +
    `reactCompilerPreset()`), compiler `target: '19'`. The library **ships
    compiler-optimized output** — consumers cannot compile already-built
    `dist`, so this is the only way components get auto-memoization in RSC
    and Vite consumers regardless of their setup. Compilation is idempotent
    (a consumer also running the compiler is a documented non-issue).
  - Run `publint` + `attw --pack` in CI (against the packed tarball, so it
    reflects what consumers actually receive after `src` is added to
    `files`) to catch dual-consumer packaging bugs.

**Alternatives considered (bundler):**

- **bunchee** — equally first-class for RSC (zero-config automatic
  client/server chunk split) and more proven on real-world RSC libraries.
  Viable fallback; chosen against only because tsdown additionally provides
  fast Oxc `isolatedDeclarations` DTS and built-in `publint`/`attw`, which
  directly de-risk the RSC+Vite dual-consumer packaging requirement.
- **tsup + `esbuild-plugin-preserve-directives` + `bundle:false`** — the
  most battle-tested engine (esbuild), but `"use client"` preservation is
  not zero-config and is historically fragile with code-splitting; tsup's
  popularity is largely in the non-RSC library space. Rejected as the
  default because correct per-module `"use client"` is a hard requirement
  here, and leading with a bundler that treats it as a first-class
  invariant is lower-risk. Remains a credible migration target if tsdown
  (the youngest option) proves problematic.
- **Vite library mode / unbuild / rslib** — all require manual,
  non-directive-aware wiring (`rollup-preserve-directives` etc.) for RSC;
  no advantage over tsdown/bunchee for this use case.

The bundler choice is reversible: `unbundle: true` per-module ESM output is
portable across tsdown/bunchee/tsup, so switching later is low-cost.

### 4.3 RSC strategy

- Per-module `"use client"` **only** on interactive components (those
  importing Radix or using hooks/state/effects/event handlers).
- Purely presentational components (no hooks, no Radix) stay
  server-renderable — no directive.
- **No blanket `"use client"` on the barrel/index** — that forces the whole
  library client-side and kills server rendering of static pieces.
- `radix-ui` already ships its own `"use client"`, but our wrapper modules
  each need their own directive — it does **not** propagate transitively.
- Enforced by guardrail (see §4.5): an author-time lint rule plus a
  build-time CI assertion that grepped `dist` client entrypoints carry the
  directive and the barrel chunk does **not**.

### 4.4 TypeScript

- `"module": "ESNext"`, `"moduleResolution": "bundler"`, `"target": "ES2022"+`,
  `"jsx": "react-jsx"`, `"verbatimModuleSyntax": true`, `"skipLibCheck": true`.
- **Go-to-source DX:** `"declaration": true`, `"declarationMap": true`,
  `"sourceMap": true`. Combined with `src` shipped in `files` (§4.1),
  consumers cmd-click from `node_modules` into real `.ts` source across all
  projects. `.d.ts.map` paths must resolve to the shipped `src/` layout —
  keep `rootDir`/`src` consistent.
- Declarations generated by tsdown. **`isolatedDeclarations: true`** is the
  goal (fast, parallelized DTS via oxc; cleaner public types) — requires
  explicit return-type annotations on all exports. Fallback:
  tsdown `resolver: 'tsc'` if the annotation cost is too high initially.
- **`tsc` (5.9.x/6.x) is the authoritative typecheck and the CI gate.**
  The TypeScript native port (`tsgo` / `@typescript/native-preview`) is
  still preview in spring 2026 (declaration emit / public-API surface not
  done) — *optionally* add `tsgo --noEmit` as a fast **non-blocking**
  local/early-CI pre-check for the speed win; never the sole gate. Pin the
  preview build.

### 4.5 Code quality & hygiene tooling

- **Package manager: pnpm 11.** Use a pnpm **catalog** for
  framework-critical pins (`react`, `react-dom`, `tailwindcss`, `radix-ui`,
  `typescript`) so versions are defined once and reviewed in one place.
  (Catalogs are a nice-to-have for a single package; acceptable to drop to
  plain pnpm if the dependency set stays tiny.)
- **Lint/format: ESLint flat config (`eslint.config.ts`) + Prettier.**
  ESLint remains the only stack with authoritative, fully-maintained
  `eslint-plugin-react-hooks` (v6/7, React 19 + Compiler rules),
  `eslint-plugin-jsx-a11y` (strict — public UI library),
  `@eslint-react/eslint-plugin`, `typescript-eslint` (type-aware via
  `projectService`), and `eslint-plugin-import-x`. Prettier handles
  formatting only (no stylistic ESLint rules / config-prettier conflicts).
  **Optional speed layer:** `oxlint` as a fast first CI step / pre-commit
  ("oxlint gate, ESLint authority"). Biome 2.4 was considered but has a
  documented react-hooks-rule fidelity gap that matters for a shipped UI
  library.
- **`"use client"` guardrail (defense in depth):**
  1. `eslint-plugin-react-server-components` `use-client` rule (error) —
     flags interactive components missing the directive and unnecessary
     directives.
  2. `@eslint-react` directive-placement rule (warn) — must be top-of-file.
  3. **Build-time CI assertion** — grep built `dist` client entrypoints for
     the directive and assert the barrel chunk does **not** carry it
     (catches accidental hoisting that lint cannot).
- **Dead-code / dependency hygiene: `knip` v6** (oxc-based) in CI.
  Configure library entry points in `knip.json` pointing at the published
  `exports`/barrel (or `@public` JSDoc tags) so public API exports aren't
  false-flagged as unused. Run a second `--production --strict` pass to
  validate `dependencies` vs `peerDependencies` isolation. Register tsdown,
  Vitest, Changesets, ESLint as known tools.
- **Public API-surface guard:** publint + `attw --pack` (every CI run) plus
  a **committed bundled-`.d.ts` snapshot** that CI regenerates and diffs —
  any unintended public-type-surface change shows in the PR diff and fails
  CI, dovetailing with Changesets/semver intent. Normalize/sort the
  snapshot to limit formatting churn. Graduate to `@microsoft/api-extractor`
  only if release tags / a review artifact are later needed.

## 5. Design Tokens & Theming Pipeline

### 5.1 Taxonomy (three tiers)

1. **Primitive** — raw scales (`color.blue.500`, `space.4`). Mode-agnostic,
   never consumed directly by components.
2. **Semantic / alias** — intent-based, reference primitives
   (`color.primary`, `color.bg.surface`, `color.text.error`). **This is the
   consumer override surface** and the layer that flips light/dark.
3. **Component** — sparse; only when a component needs a token decoupled
   from semantics.

### 5.2 Pipeline

- Tokens authored as **W3C/DTCG JSON** in `tokens/`.
- **Style Dictionary v5** (ESM-only, Node 18+) compiles them:
  - `outputReferences: true` so semantic/component tokens emit
    `var(--primitive-…)` rather than resolved values — this preserves the
    alias chain so a single consumer override cascades everywhere.
    (Caveat: every referenced token must exist in the same emitted scope or
    the `var()` dead-ends.)
  - Outputs (1) `tokens.css` — `:root` primitives + light semantic vars and
    a `[data-theme="dark"]` block re-binding **semantic** vars only; and
    (2) a Tailwind `@theme inline` artifact via a **custom SD format**
    (Style Dictionary has no built-in Tailwind v4 format).
  - `@tokens-studio/sd-transforms` registered with explicit
    `preprocessors: ['tokens-studio']` (required since sd-transforms
    0.16.0 — silent failure if omitted) + `transformGroup: 'tokens-studio'`.
    Use `permutateThemes($themes)` for light/dark (and any future brand)
    permutations.

### 5.3 Figma sync

- **Tokens Studio for Figma** (v2.11+, DTCG by default) using the GitHub
  storage provider in **multi-file mode** pointed at the `tokens/` directory.
- **Code is the source of truth.** Designer changes land via branch + PR;
  uncontrolled designer pushes are not permitted.

### 5.4 Runtime theming contract (zero-specificity by construction)

```
Primitive   :root { --color-blue-500: oklch(…); … }            (shipped defaults)
Semantic    :root            { --color-primary: var(--color-blue-500); }   (light)
Semantic    [data-theme=dark]{ --color-primary: var(--color-blue-300); }   (dark)
Tailwind    @theme inline { --color-primary: var(--color-primary); }
            → utilities emit  color: var(--color-primary)
```

- **Consumer palette override:** redefine semantic vars in their own `:root`
  *after* importing the library stylesheet (import order documented). These
  are inherited custom properties, so a consumer `:root { --color-primary }`
  wins by source order with **no `!important` and no specificity fight**.
- **Dark mode:** consumer toggles `data-theme="dark"` on `<html>`; only the
  semantic tier flips; primitives stay constant. The theme-toggle UI is a
  consumer-side Client Component; the library CSS is server-safe.
- **Public, semver-stable contract = the semantic tier only.** Renaming a
  semantic token is a breaking change. Component/Tailwind-internal vars are
  not part of the contract.

## 6. Styling

- **Tailwind v4** used **internally only**, compiled at publish time into a
  single stylesheet shipped as `@scope/ui/styles.css`. Zero runtime;
  identical behavior in RSC and Vite.
- CSS-first config (`@import "tailwindcss"` + `@theme`). Utilities bind to
  token CSS variables via **`@theme inline`** — **critical**: plain
  `@theme` introduces a value-to-Tailwind-var indirection that breaks
  consumer overrides in portals/nested DOM. Highest-risk config detail.
- **Prefixed**: `@import "tailwindcss" prefix(tw);` to namespace utilities
  and `--tw-*` vars, preventing collisions when consumers also run Tailwind.
- **Cascade-layer / zero-specificity override strategy** (hardens the §5.4
  contract):
  - Dark/palette variant defined as
    `@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));`
    — `:where()` keeps specificity **zero** so consumers override trivially.
  - Author component-level classes via Tailwind v4's **`@utility` API**
    (predictable, declaration-count-sorted override order), **not**
    `@layer components`. Reserve `@layer components` only for styles that
    should *not* be casually overridable.
  - Emit all library CSS **inside Tailwind's standard cascade layers** so a
    consumer's *unlayered* CSS deterministically wins. Shipping unlayered
    rules would beat consumer overrides — avoid.
  - **Never `!important`** in shipped CSS — it breaks the override contract
    and the Storybook theming demo.
- Dark mode via the explicit `data-theme` attribute variant above (**not**
  `prefers-color-scheme`), matched to the token pipeline's selector and the
  Storybook theming toolbar (§9).
- Consumers import the stylesheet once at app root (Next.js App Router:
  root `layout.tsx`).

## 7. Primitives & Component Model

- **Consolidated `radix-ui` package** (single dependency, namespace
  imports: `import { Dialog, Tabs } from "radix-ui"`, dot-notation usage).
  Avoid legacy individual `@radix-ui/react-*` packages (version-drift,
  duplicate-instance risk).
- API conventions across components: `className` merge, forwarded refs,
  controlled/uncontrolled props, `asChild` passthrough where Radix supports
  it, consistent naming.

### 7.1 Headless UI → Radix migration

**Modal → Radix Dialog:**
- Explicit `Dialog.Portal` required (Headless UI's was implicit).
- `open` + `onClose` → `open` + `onOpenChange(boolean)` (rewire handler).
- `DialogPanel` → `Dialog.Content`; backdrop → `Dialog.Overlay` (inside
  `Dialog.Portal`).
- Add `Dialog.Title` (Radix emits an a11y warning without it; visually hide
  if needed) and `Dialog.Description` where applicable.
- Initial focus: `onOpenAutoFocus` event + `preventDefault()` then focus
  manually (no `initialFocus` prop).
- Close affordance via `Dialog.Close`.

**Tabs → Radix Tabs:**
- Index-based (`selectedIndex: number`) → **value-based**
  (`value: string`, `onValueChange(string)`); every tab needs a stable
  string `value`.
- `TabGroup > TabList > Tab` + `TabPanels > TabPanel` →
  `Tabs.Root > Tabs.List > Tabs.Trigger` + `Tabs.Content` (no `Panels`
  wrapper; trigger↔content linked by matching `value`, order-independent).
- `vertical` boolean → `orientation` enum; `manual` boolean →
  `activationMode` enum.
- Restyle off `data-state="active"` (data attributes, not render props).

## 8. Component Scope (first milestone)

Core set (~12): **Button, Input, Select, Checkbox, Radio, Dialog (Modal),
Tabs, Tooltip, Popover, Toast, Card, Badge.**

Each component delivers:
- Typed props; `"use client"` only if interactive.
- Token-driven styling (Tailwind v4 → CSS vars), `@utility`-based classes.
- Storybook stories (CSF factory API) covering variants/args.
- Interaction tests (`play` functions) and automated a11y assertions.

Modal and Tabs additionally carry the Headless UI → Radix migration.

## 9. Testing & Quality

**Stories are the single source of truth.** **Storybook 10.x** with
`@storybook/react-vite` serves as dev, docs, and test harness. The library
starts greenfield on the current Storybook major (CSF factories and
`addon-vitest` are materially better there than on 9.x).

- **Story authoring: CSF factory API ("CSF Next").** `preview.meta({…})` →
  `meta.story({…})`, importing `.storybook/preview` so types/decorators/args
  are inferred end-to-end (removes `Meta`/`StoryObj` generics). Experimental
  but strategic — **pin Storybook minor versions** and track migration notes.
- **Theming toolbar:** `@storybook/addon-themes`
  `withThemeByDataAttribute({ attributeName: 'data-theme', themes: {light,
  dark} })` plus a second toolbar `globalType` ("palette") whose decorator
  sets override CSS variables / a palette attribute on the preview root —
  makes the token override + dark-mode system **interactively testable**
  with zero rebuilds. Token selectors must match the injected attribute
  (`[data-theme=dark]` without a `:root` prefix).
- **Props docs:** `react-docgen-typescript` (not the default
  `react-docgen`) with a Radix-aware `propFilter` (exclude `node_modules`
  **except** `@radix-ui`) so inherited Radix props in the public API render
  accurately. Build-speed hit is bounded at ~12 components; scope to
  docs/CI build if local dev startup degrades.
- Precompiled CSS imported once in `.storybook/preview` (no Tailwind Vite
  plugin needed — preview matches what consumers receive); the same import
  flows into Vitest and Chromatic.

One Vitest run (browser mode, headless Chromium via
`@vitest/browser-playwright`) covers, with no redundancy:

- **Render + interaction** — every story executed; stories with `play()`
  become interaction tests, stories without become smoke/render tests.
  Replaces the old `@storybook/test-runner`.
- **Accessibility** — `@storybook/addon-a11y` (axe) annotations registered
  via `setProjectAnnotations` in `.storybook/vitest.setup.ts`; a11y `test`
  parameter set to `'error'` to fail CI.
- **Unit** — pure logic/hooks as a second Vitest project (jsdom/node) in the
  same `projects` array (Vitest `projects`, not the deprecated `workspace`
  field); one `vitest` command runs both.
- **Visual regression** — **Chromatic + TurboSnap** (`onlyChanged: true`)
  against the built Storybook; explicit baseline acceptance required on PRs;
  `exitZeroOnChanges` on non-main branches. Same stories, lowest
  maintenance, stays within free snapshot tier for a small library. Do not
  duplicate pixel assertions in `play` functions.
- React 19: RTL 16 / `vitest-browser-react`.

**Test performance:** headless single Chromium instance;
`test.isolate: false` for the stateless Storybook project (big wall-clock
win — keep stories pure or it bleeds); 2–3 CI shards (`--shard`); story
**tag split** — cheap render/a11y smoke on every push, heavy
`play`/full-a11y sweep on merge/release.

Browser mode (real Chromium) is used for component/interaction/a11y tests
because Radix relies on real focus traps, portals, and pointer events, and
Tailwind layout needs real CSS — all of which jsdom silently mishandles.

## 10. Release & Versioning

- **Stable releases — Changesets** (`@changesets/cli` 2.x +
  `changesets/action@v1`). `.changeset/config.json`: `"access": "public"`,
  `"changelog": "@changesets/changelog-github"`. `package.json` must not be
  `"private": true` and must set `publishConfig.access: "public"`.
  GitHub Actions on push to `main`: opens/updates a "Version Packages" PR;
  merging it publishes to npm and tags the release. The build (incl. React
  Compiler), full Vitest suite, publint/attw, and the API-surface snapshot
  diff gate the release.
- **npm OIDC trusted publishing**: register the repo+workflow as a Trusted
  Publisher on npm; workflow needs `id-token: write` and **no `NPM_TOKEN`**;
  provenance attestation is automatic. First publish of a new scoped
  package must be `--access public` (covered by config).
- **Preview releases — `pkg.pr.new`** on every PR/commit: a single
  `npx pkg-pr-new publish` step produces an npm-installable URL
  (`npm i https://pkg.pr.new/<owner>/<repo>@<sha>`). **Nothing hits npm**,
  no dist-tag pollution, no cleanup — consuming projects pin a PR build to
  validate before the change merges. Orthogonal to the Changesets flow.
  Changesets *prerelease mode* reserved only for genuine multi-step beta
  lines (e.g. a v2 alpha), not routine PR previews.

## 11. Recommended Versions (spring 2026)

| Tool | Version | Notes |
|---|---|---|
| React / React DOM | 19.2.x | peer `>=19` (floor enables React Compiler `target:'19'` with no runtime dep) |
| `babel-plugin-react-compiler` | 1.x (stable) | via tsdown `@rolldown/plugin-babel` + `reactCompilerPreset()`; ship compiled output |
| `radix-ui` (consolidated) | 1.4.x | not individual `@radix-ui/*`; in `dependencies`, externalized |
| Tailwind CSS | 4.x | internal only; CSS-first `@theme inline`; `prefix(tw)`; `@utility` + `:where()` variants |
| Style Dictionary | 5.x | ESM-only, DTCG; `@tokens-studio/sd-transforms` peer |
| Tokens Studio (Figma) | 2.11+ | DTCG default; GitHub multi-file sync |
| `tsdown` | 0.22.x+ | bundler; directive-preserving; `unbundle: true`; `sourcemap` |
| TypeScript | 5.9.x / 6.x | `moduleResolution: bundler`; `declarationMap`; `isolatedDeclarations` goal; `tsc` is the gate |
| `tsgo` (`@typescript/native-preview`) | preview | optional non-blocking fast pre-check only; pin |
| pnpm | 11.x | + catalogs for framework pins |
| ESLint | flat config | + `eslint-plugin-react-hooks` v6/7, `jsx-a11y`, `@eslint-react`, `typescript-eslint`, `import-x`, `eslint-plugin-react-server-components` |
| Prettier | latest | formatting only |
| oxlint | 1.x | optional fast CI/pre-commit pre-pass |
| knip | 6.x | oxc-based; library entry-point config; `--production --strict` pass |
| Storybook | 10.x | `@storybook/react-vite`; CSF factory API; `@storybook/addon-themes` |
| Vitest | follows `@storybook/addon-vitest`@10 | browser mode; `projects` (not `workspace`); verify SB↔Vitest↔addon-vitest peer triad at implementation |
| `@vitest/browser-playwright` | latest | split provider package |
| `@storybook/addon-vitest` / `addon-a11y` / `addon-themes` | SB 10.x line | successor to `experimental-addon-test` |
| `react-docgen-typescript` | latest | autodocs prop extraction (Radix-aware `propFilter`) |
| React Testing Library | 16.x | React 19 compatible; `vitest-browser-react` in browser mode |
| Changesets | `@changesets/cli` 2.x | `changesets/action@v1`; OIDC publishing |
| `pkg-pr-new` | latest | per-PR preview releases |
| Chromatic | latest | `@chromatic-com/storybook` + TurboSnap |

> Most version-fragile spot: the Storybook ↔ Vitest ↔
> `@storybook/addon-vitest` peer-range triad. Pin deliberately and verify
> ranges at implementation time; this changes faster than documentation
> snapshots. Pin Storybook **minor** versions while CSF factories remain
> experimental.

## 12. Key Risks / Caveats

1. **`@theme inline` vs `@theme`** — plain `@theme` silently breaks runtime
   palette overrides in portals/nested DOM. Highest-risk detail.
2. **`"use client"` stripped in `dist`** → all Next App Router consumers
   break. CI must assert the directive survives the build and the barrel
   does not carry it (§4.5 guardrail).
3. **`sideEffects: false` without the CSS exception** → consumer styles
   silently disappear.
4. **`radix-ui` not externalized** → duplicate Radix context instances,
   broken portals/focus.
5. **`outputReferences: true` required** for the override cascade; every
   referenced token must exist in the same emitted scope.
6. **sd-transforms `preprocessors: ['tokens-studio']` must be explicit**
   (since 0.16.0) — silent failure otherwise.
7. **Storybook/Vitest/addon-vitest peer-range mismatch** — the most
   version-fragile integration; pin deliberately. CSF factory API is
   experimental — pin SB minors.
8. **Blanket `"use client"` on the barrel** → kills server rendering of
   static components.
9. **React Compiler target/runtime mismatch** — `target:'19'` requires a
   real React 19 peer floor; lowering support without adding
   `react-compiler-runtime` as a dependency crashes consumers.
10. **Unlayered shipped CSS** beats consumer overrides — all library CSS
    must sit inside Tailwind's cascade layers; any `!important` breaks the
    override contract.
11. **`test.isolate: false` + stateful stories** → cross-test bleed; keep
    stories pure. Over-sharding a tiny suite is net-negative.
12. **knip library misconfig** — public exports false-flagged as unused if
    entry points / `@public` tags aren't set.

## 13. Phasing (high-level)

Detailed, step-wise implementation plan is produced separately
(writing-plans). High-level phases:

1. **Foundation** — repo + git, pnpm 11 (+ catalogs), `package.json` /
   `exports`, tsdown config (incl. React Compiler), tsconfig
   (declarationMap/sourceMap), code-quality toolchain (ESLint flat +
   Prettier + optional oxlint, `react-server-components` rule), knip, CI
   skeleton (lint, typecheck, publint/attw, `"use client"` build assertion).
2. **Token pipeline** — DTCG tokens in `tokens/`, Style Dictionary v5 build
   (CSS vars + custom Tailwind `@theme inline` format), Tokens Studio
   GitHub sync.
3. **Styling + Storybook harness** — Tailwind v4 internal build →
   precompiled CSS with cascade-layer/`@utility`/`:where()` strategy;
   Storybook 10 + `@storybook/react-vite` + CSF factories +
   `addon-themes` (theme + palette toolbar) + `react-docgen-typescript`;
   Vitest browser mode + `addon-vitest` + `addon-a11y` wiring with perf
   settings (isolate:false, sharding, tag split).
4. **Components** — migrate Modal→Radix Dialog and Tabs→Radix Tabs; port +
   token-restyle + a11y/test-harden the remaining core set; stories +
   interaction + a11y tests per component; React Compiler verified on
   built artifacts.
5. **Release** — committed `.d.ts` API-surface snapshot; `pkg.pr.new`
   per-PR previews; Changesets + GitHub Actions + npm OIDC trusted
   publishing; first published release.

## 14. Open Items (non-blocking)

- Final npm scope/package name (owner decides; does not affect design).
- Exact semantic token names — defined during the token-pipeline phase;
  once published they become the semver-stable public contract.
- Exact Storybook 10.x ↔ Vitest ↔ `@storybook/addon-vitest` version pins —
  resolved at implementation against then-current peer ranges.
- Whether to graduate from the `.d.ts` snapshot to `@microsoft/api-extractor`
  (only if release tags / review docs become necessary).
