# Component Library — Design Spec

**Date:** 2026-05-17 · **Status:** Approved design; pending Milestone 0
implementation plan · **Owner:** William Phelps (+ small team)
*Evolution history is in this file's git log; this document reads as the
current, consolidated design.*

**Revision history:**
- r1 — initial design from brainstorming.
- r2 — documented bundler alternatives considered (tsdown vs bunchee vs tsup).
- r3 — folded in spring-2026 DX/performance improvements (React Compiler
  shipped output, Tailwind cascade-layer override strategy, go-to-source
  maps, code-quality toolchain + `"use client"` guardrail, knip, API-surface
  snapshot, `pkg.pr.new` previews, Storybook 10 + CSF factories + theming
  toolbar, Vitest perf, pnpm 11 + catalogs); Storybook target moved 9.x → 10.x.
- r4 — reframed delivery around **Milestone 0**: a single-component (Button)
  vertical slice to iron out the full author→publish→consume→re-publish
  workflow and the canonical component-authoring pattern (via an owner
  bake-off) *before* breadth. Pilot consumer = an existing Next.js App
  Router app. Iteration loop = real npm publish authoritative (0.x + `canary`
  dist-tag during ironing-out; optional `pnpm pack` pre-check); `pkg.pr.new`
  deferred to post-Milestone-0. Cross-scale hardening deferred out of
  Milestone 0.

## 1. Purpose

A reusable, versioned React component library shared across the team's
projects, published as a **single public scoped npm package** (`@scope/ui`;
final scope name is the owner's call and does not affect design).

Hard requirements:

- Renders correctly in **Next.js App Router (React Server Components)** and
  **Vite SPAs** from the same package.
- Ships **precompiled CSS** — consumers never install or configure Tailwind.
- **Runtime theming**: consumers override a color palette
  (primary / neutral / success / error / …) and dark mode purely via CSS
  variables, with no rebuild.
- Coherent and low-maintenance for a small, dev-led team.

**Near-term goal (this spec's primary focus):** prove the *stack and the
consume/iterate workflow* through a deliberately thin vertical slice — one
component (**Button**), fully wired (tokens/theming, Storybook, tests,
build, real npm publish) and consumed by a real **Next.js App Router** app —
plus a component-authoring **bake-off** with the owner. Breadth (the rest of
the core set) is explicitly gated behind that validation. The eventual core
set is ~12 primitives; most already exist in prior work (Tailwind Plus
styling + Headless UI behavior) and will be moved in, restructured, token-
migrated, Headless UI→Radix ported, and a11y/test-hardened — but only after
Milestone 0.

## 2. Decisions at a Glance

| Topic | Decision |
|---|---|
| Language / UI / docs | TypeScript, React 19, Storybook 10.x |
| Audience | Owner + small team |
| Distribution | Versioned **public scoped npm package** (not shadcn-style copy-in, not private registry) |
| Consumers | Next.js App Router (RSC) **and** Vite SPAs |
| **First milestone** | **Milestone 0: Button only** — vertical slice to iron out workflow + component pattern; further components gated (see §8) |
| **Pilot consumer** | An existing **Next.js App Router** app (RSC — riskiest path, de-risked first) |
| **Iteration loop** | **Real npm publish authoritative** (Changesets/OIDC); `0.x` + `canary` dist-tag during ironing-out; optional `pnpm pack` pre-check |
| Preview releases | `pkg.pr.new` available but **deferred** to post-Milestone-0 (not in the first ironed loop) |
| Styling engine | **Tailwind v4 internally**, shipped as **precompiled CSS** |
| Theming | Consumer-supplied palette + dark mode via **CSS-variable token overrides**, no rebuild; zero-specificity override contract |
| Design tokens | **Code-first** W3C/DTCG JSON → Style Dictionary → CSS vars; Figma mirrors via Tokens Studio (code is source of truth) |
| Primitives | Standardize on **Radix** (consolidated `radix-ui` package); migrate existing Headless UI Modal/Tabs (post-Milestone-0) |
| Repo structure | **Single repo, single package**; tokens compiled internally (not separately published) |
| Bundler | **tsdown** (Rolldown/Oxc), ESM-only, per-module output |
| React optimization | **Ship React-Compiler-compiled output** (compiler `target: '19'`) |
| Package manager | **pnpm 11** + catalogs for framework-critical pins |
| Lint / format | **ESLint flat config + Prettier**, optional **oxlint** fast pre-pass |
| Quality bar | Unit + interaction tests, automated a11y (Milestone 0); visual regression + API-surface guard (post-Milestone-0 hardening) |
| Release | Changesets + GitHub Actions, npm OIDC trusted publishing |

Rationale for each lives in the relevant Architecture subsection; timing
(what ships when) lives in §4.

## 3. Architecture & Stack

- **Any component beyond Button before the Milestone 0 gate** (workflow
  loop friction-free + canonical component pattern agreed — see §8.5).
- `pkg.pr.new` in the initial ironed loop (deferred; §10).
- Cross-scale hardening (Chromatic visual-regression baselines, knip
  `--production --strict` dep isolation, committed `.d.ts` API snapshot,
  CI sharding / tag split) during Milestone 0 — low value at one component
  and would slow the slice; introduced when scaling (§8.6).
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
  when introduced (§4.5).
- Adopting the TypeScript native port (`tsgo`) as an authoritative gate —
  optional non-blocking pre-check only until declaration emit stabilizes
  (§4.4).

### 3.1 Package & module format

- One repo, one published package; tokens compiled internally into the
  shipped CSS (not a separate package).
- **ESM-only**, `package.json` `"type": "module"`.
- `exports` map, conditions ordered `types → import → default`:
  - `"."` → `{ types: ./dist/index.d.ts, import: ./dist/index.js }`
  - Explicit CSS subpath `"./styles.css": "./dist/styles.css"` — consumers
    `import "@scope/ui/styles.css"` once at app root (Next.js App Router:
    root `layout.tsx`).
  - Optional per-component subpaths for granular tree-shaking.
- `"sideEffects": false` **except** the precompiled CSS, listed explicitly
  (e.g. `["**/*.css", "./dist/styles.css"]`). Without the exception
  bundlers tree-shake away the consumer's stylesheet import and styles
  silently vanish.
- `peerDependencies`: `react: ">=19"`, `react-dom: ">=19"` (required). The
  React 19 floor is intentional — it lets React Compiler `target: '19'`
  emit `react/compiler-runtime` (built-in) with **no extra runtime
  dependency** (see §4.2).
- `radix-ui` in **`dependencies`** (implementation detail, externalized at
  build, consumers should not install it), caret-pinned on `1.4.x`. (Not
  exercised until component #2 / Dialog, post-Milestone-0.)
- `"files": ["dist", "src"]` — **`src` is published intentionally** so
  `declarationMap` / source maps resolve and consumers can cmd-click into
  real source (see §4.4). Public library, so no source-leak concern.
- `publishConfig: { access: "public", provenance: true }`.

### 3.2 Build

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
  server-renderable — no directive. **Button is the server-renderable path
  proof in Milestone 0** (validates the no-directive case end-to-end);
  Dialog (post-Milestone-0) proves the `"use client"` case.
- **No blanket `"use client"` on the barrel/index** — that forces the whole
  library client-side and kills server rendering of static pieces.
- `radix-ui` already ships its own `"use client"`, but our wrapper modules
  each need their own directive — it does **not** propagate transitively.
- Enforced by guardrail (see §4.5): an author-time lint rule plus a
  build-time CI assertion that grepped `dist` client entrypoints carry the
  directive and the barrel chunk does **not**.

### 3.4 TypeScript

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
     (catches accidental hoisting that lint cannot). In Milestone 0 the
     assertion mainly verifies Button's barrel stays directive-free.
- **Dead-code / dependency hygiene: `knip` v6** (oxc-based) in CI.
  Configure library entry points in `knip.json` pointing at the published
  `exports`/barrel (or `@public` JSDoc tags) so public API exports aren't
  false-flagged as unused. The `--production --strict` dependency-isolation
  pass is introduced when scaling (§8.6), not required for Milestone 0.
  Register tsdown, Vitest, Changesets, ESLint as known tools.
- **Public API-surface guard:** publint + `attw --pack` run every CI run
  from the start. The **committed bundled-`.d.ts` snapshot** diff is
  introduced when scaling (§8.6) — at one component it has little signal.
  Graduate to `@microsoft/api-extractor` only if release tags / a review
  artifact are later needed.

### 3.5 Design tokens & theming pipeline

**Three-tier taxonomy:**

1. **Primitive** — raw scales (`color.blue.500`, `space.4`); mode-agnostic,
   never consumed directly.
2. **Semantic / alias** — intent-based, reference primitives
   (`color.primary`, `color.bg.surface`, `color.text.error`). **The
   consumer override surface** and the layer that flips light/dark.
3. **Component** — sparse; only when a component needs a token decoupled
   from semantics.

For Milestone 0, only the token slice Button needs is required: a primary +
neutral palette, the semantic tokens Button consumes (bg/text/border/ring,
plus a destructive/intent variant), and the dark-mode re-binding for those.
The full token set follows when scaling.

### 5.2 Pipeline

- `outputReferences: true` so semantic/component tokens emit
  `var(--primitive-…)` not resolved values — preserves the alias chain so
  one consumer override cascades everywhere. (Every referenced token must
  exist in the same emitted scope or the `var()` dead-ends.)
- Emits (1) `tokens.css` — `:root` primitives + light semantic vars and a
  `[data-theme="dark"]` block re-binding **semantic** vars only; (2) a
  Tailwind `@theme inline` artifact via a **custom SD format** (no built-in
  Tailwind v4 format exists).
- `@tokens-studio/sd-transforms` registered with **explicit**
  `preprocessors: ['tokens-studio']` (required since 0.16.0 — silent
  failure otherwise) + `transformGroup: 'tokens-studio'`;
  `permutateThemes($themes)` for light/dark (and future brand)
  permutations.

**Figma sync:** Tokens Studio for Figma (v2.11+, DTCG default), GitHub
multi-file storage pointed at `tokens/`. **Code is the source of truth**;
designer changes land via branch + PR.

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
  not part of the contract. (Milestone 0 exercises this contract live: the
  pilot app overrides the palette and toggles dark mode — §8.3.)

### 3.6 Styling

> Conventions here are validated/refined by the Milestone 0 bake-off
> (§8.4) and should be treated as provisional until then.

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

### 3.7 Primitives & component model

> Conventions here are validated/refined by the Milestone 0 bake-off
> (§8.4) and should be treated as provisional until then. Radix is not
> exercised until component #2 (Dialog), post-Milestone-0.

- **Consolidated `radix-ui` package** (single dependency, namespace
  imports: `import { Dialog, Tabs } from "radix-ui"`, dot-notation usage).
  Avoid legacy individual `@radix-ui/react-*` packages (version-drift,
  duplicate-instance risk).
- API conventions across components: `className` merge, forwarded refs,
  controlled/uncontrolled props, `asChild` passthrough where Radix supports
  it, consistent naming.

### 7.1 Headless UI → Radix migration (post-Milestone-0)

- Explicit `Dialog.Portal` required (Headless UI's was implicit).
- `open` + `onClose` → `open` + `onOpenChange(boolean)` (rewire handler).
- `DialogPanel` → `Dialog.Content`; backdrop → `Dialog.Overlay` (inside
  `Dialog.Portal`).
- Add `Dialog.Title` (Radix a11y-warns without it; visually hide if
  needed) and `Dialog.Description` where applicable.
- Initial focus via `onOpenAutoFocus` + `preventDefault()` then focus
  manually (no `initialFocus` prop).
- Close via `Dialog.Close`.

**Tabs → Radix Tabs**

- Index-based (`selectedIndex: number`) → value-based (`value: string`,
  `onValueChange(string)`); every tab needs a stable string `value`.
- `TabGroup > TabList > Tab` + `TabPanels > TabPanel` →
  `Tabs.Root > Tabs.List > Tabs.Trigger` + `Tabs.Content` (no `Panels`
  wrapper; trigger↔content linked by matching `value`, order-independent).
- `vertical` boolean → `orientation` enum; `manual` boolean →
  `activationMode` enum.
- Restyle off `data-state="active"` (data attributes, not render props).

## 8. Milestone 0 — Button Vertical Slice, Workflow Loop & Bake-off

Milestone 0 is a **thin vertical slice through every layer of the stack
using exactly one component (Button)**. Its purpose is to iron out (a) the
full author → build → publish → consume → re-publish → re-consume workflow,
and (b) the canonical component-authoring pattern via an owner bake-off —
*before any second component is added*.

### 8.1 Why Button

Button touches the entire pipeline — token theming (palette + dark),
variants, focus-visible a11y, autodocs, build, publish, consume — with the
**least behavioral complexity**, and is server-renderable, so it also
validates the no-`"use client"` path. Fastest route to a working end-to-end
loop.

### 8.2 Milestone 0 scope for Button

- Typed props + variants (intent/size) that meaningfully exercise the
  semantic palette tokens and dark mode.
- Token-driven styling via the `@utility` / zero-specificity strategy (§6).
- Storybook 10 story(ies) using the CSF factory API; autodocs via
  `react-docgen-typescript`.
- Vitest browser-mode interaction (`play`) tests + automated a11y
  (`@storybook/addon-a11y`) for Button.
- Build with React Compiler + `publint`/`attw --pack` green.
- Published to npm for real (see §8.3).

### 8.3 Workflow validation loop (pilot consumer = existing Next.js App Router app)

1. Publish library `0.1.0` to npm via Changesets + GitHub Actions + OIDC
   trusted publishing (provenance automatic).
2. In the pilot App Router app: install `@scope/ui`, import
   `@scope/ui/styles.css` once in the **root `layout.tsx`**, render
   `<Button>` in a route (Server Component context).
3. **Apply a theme:** consumer overrides semantic palette CSS vars in their
   own `:root` and toggles `data-theme="dark"` from a small client
   component. Verify zero-rebuild theming and correct RSC behavior.
4. **Simulate a real consumer-driven change:** the consumer needs a Button
   change → make it in this library → add a Changeset → version bump →
   publish the next `0.x` → consumer `pnpm update @scope/ui` → verify the
   change lands.
5. Repeat 3–4 until the loop is friction-free; **write the ironed-out
   CONSUMER + MAINTAINER workflow doc** and commit it to the repo
   (`docs/workflow.md`).

**Loop mechanics.** Real `npm publish` is the **authoritative, documented
contract** (matches how the team consumes other libraries). During
ironing-out: keep versions **pre-1.0 (`0.x`)** (semver expects pre-1.0
churn) and publish experimental iterations under a **`canary` dist-tag**
(`@scope/ui@canary`), promoting to `latest` only once an iteration is
validated, so `latest` stays clean. `pnpm pack` + install-the-tarball is an
**optional fast pre-publish packaging sanity check** (byte-identical to the
registry artifact — catches `exports`/directive/CSS-path bugs without a
version burn). `pkg.pr.new` is **not** part of the Milestone 0 loop
(deferred to post-validation).

### 8.4 Component-pattern bake-off

In parallel, the **owner independently builds their own Button** (or brings
an existing component) using their own conventions, with Storybook + tests.
Compare head-to-head against the fresh Button across: public API shape,
prop/variant ergonomics, ref / `asChild` handling, token usage, the
`"use client"` decision, story/test ergonomics, and type DX — explicitly
capturing what each does **better and worse**.

**Deliverable:** a committed **component authoring conventions** doc
(`docs/component-conventions.md`) recording the agreed canonical pattern.
This bake-off **may amend §6 / §7 / §9** of this spec — those conventions
are provisional until 8.4 concludes.

### 8.5 Gate

All subsequent scope is **blocked** until both: (a) §8.3 — the workflow
loop is friction-free and documented; and (b) §8.4 — the canonical
component pattern is agreed and written.

### 8.6 Subsequent scope (gated; not in Milestone 0)

- **Component #2 (recommended: Dialog)** — Radix primitive + mandatory
  `"use client"` + portal theming through `@theme inline` + focus trap;
  proves the architectural risks and serves as a second bake-off vs the
  owner's existing Headless UI Modal. Confirmed/chosen after Milestone 0.
- Then the remaining core set toward the eventual ~12: **Input, Select,
  Checkbox, Radio, Tabs, Tooltip, Popover, Toast, Card, Badge**, applying
  the canonical pattern; Modal/Tabs carry the §7.1 migration.
- **Cross-scale hardening introduced here:** Chromatic + TurboSnap visual
  regression baselines, the committed `.d.ts` API-surface snapshot diff,
  knip `--production --strict` dependency isolation, and CI sharding +
  smoke/interaction story tag-split (all per §9/§4.5). These have little
  value at one component and are deliberately deferred out of Milestone 0.
- `pkg.pr.new` per-PR previews may be enabled here if useful.

## 9. Testing & Quality

> Story/test ergonomics are part of the §8.4 bake-off and may be refined.

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
  (`[data-theme=dark]` without a `:root` prefix). (Exercised by Button in
  Milestone 0.)
- **Props docs:** `react-docgen-typescript` (not the default
  `react-docgen`) with a Radix-aware `propFilter` (exclude `node_modules`
  **except** `@radix-ui`) so inherited Radix props in the public API render
  accurately. Build-speed hit is bounded; scope to docs/CI build if local
  dev startup degrades.
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
  parameter set to `'error'` to fail CI. **In Milestone 0 scope** (Button).
- **Unit** — pure logic/hooks as a second Vitest project (jsdom/node) in the
  same `projects` array (Vitest `projects`, not the deprecated `workspace`
  field); one `vitest` command runs both.
- **Visual regression** — **Chromatic + TurboSnap** (`onlyChanged: true`)
  against the built Storybook; explicit baseline acceptance on PRs;
  `exitZeroOnChanges` on non-main branches. **Introduced post-Milestone-0**
  (§8.6) — low value at one component.
- React 19: RTL 16 / `vitest-browser-react`.

**Test performance (relevant when scaling, §8.6):** headless single
Chromium instance; `test.isolate: false` for the stateless Storybook
project (keep stories pure or it bleeds); 2–3 CI shards (`--shard`); story
**tag split** — cheap render/a11y smoke on every push, heavy
`play`/full-a11y sweep on merge/release. Not needed at one component.

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
  Compiler), Vitest suite, and publint/attw gate the release. (The
  committed `.d.ts` API-surface snapshot joins the gate at §8.6.)
- **npm OIDC trusted publishing**: register the repo+workflow as a Trusted
  Publisher on npm; workflow needs `id-token: write` and **no `NPM_TOKEN`**;
  provenance attestation is automatic. First publish of a new scoped
  package must be `--access public` (covered by config).
- **Milestone 0 iteration loop (authoritative):** real `npm publish` per
  iteration. Stay **pre-1.0 (`0.x`)**; publish experimental iterations under
  a **`canary` dist-tag** (consumer opts in via `@scope/ui@canary`),
  promoting to `latest` once validated, so `latest` stays clean. `pnpm pack`
  + tarball install is the optional fast pre-publish packaging check.
- **`pkg.pr.new`** is documented and available but **deferred** until after
  Milestone 0 (kept out of the first ironed loop to keep it focused);
  Changesets *prerelease mode* reserved for genuine multi-step beta lines.

## 11. Recommended Versions (spring 2026)

| Tool | Version | Notes |
|---|---|---|
| React / React DOM | 19.2.x | peer `>=19` (floor enables React Compiler `target:'19'` with no runtime dep) |
| `babel-plugin-react-compiler` | 1.x (stable) | via tsdown `@rolldown/plugin-babel` + `reactCompilerPreset()`; ship compiled output |
| `radix-ui` (consolidated) | 1.4.x | not individual `@radix-ui/*`; in `dependencies`, externalized (used from component #2) |
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
| knip | 6.x | oxc-based; library entry-point config; `--production --strict` pass at §8.6 |
| Storybook | 10.x | `@storybook/react-vite`; CSF factory API; `@storybook/addon-themes` |
| Vitest | follows `@storybook/addon-vitest`@10 | browser mode; `projects` (not `workspace`); verify SB↔Vitest↔addon-vitest peer triad at implementation |
| `@vitest/browser-playwright` | latest | split provider package |
| `@storybook/addon-vitest` / `addon-a11y` / `addon-themes` | SB 10.x line | successor to `experimental-addon-test` |
| `react-docgen-typescript` | latest | autodocs prop extraction (Radix-aware `propFilter`) |
| React Testing Library | 16.x | React 19 compatible; `vitest-browser-react` in browser mode |
| Changesets | `@changesets/cli` 2.x | `changesets/action@v1`; OIDC publishing |
| `pkg-pr-new` | latest | per-PR preview releases (post-Milestone-0) |
| Chromatic | latest | `@chromatic-com/storybook` + TurboSnap (post-Milestone-0) |

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
   broken portals/focus (relevant from component #2).
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
13. **Over-scoping Milestone 0** — pulling breadth or cross-scale hardening
    forward dilutes the slice's purpose (iron the workflow + pattern).
    Honor the §8.5 gate.
14. **Provisional conventions** — §6/§7/§9 authoring conventions are not
    final until the §8.4 bake-off; avoid hard-coding patterns into many
    components before then (mitigated structurally by the §8.5 gate).

## 13. Phasing (high-level)

Detailed, step-wise implementation plan is produced separately
(writing-plans). High-level phases — **Milestone 0 is phases 1–6; the §8.5
gate precedes phase 7**:

1. **Foundation** — repo + git, pnpm 11 (+ catalogs), `package.json` /
   `exports`, tsdown config (incl. React Compiler), tsconfig
   (declarationMap/sourceMap), code-quality toolchain (ESLint flat +
   Prettier + optional oxlint, `react-server-components` rule), CI skeleton
   (lint, typecheck, publint/attw, `"use client"` build assertion).
   Scoped to what one component needs.
2. **Token slice** — DTCG tokens for the Button-relevant palette + semantic
   tokens + dark re-binding; Style Dictionary v5 build (CSS vars + custom
   Tailwind `@theme inline` format); Tokens Studio GitHub sync wiring.
3. **Styling + Storybook harness** — Tailwind v4 internal build →
   precompiled CSS with cascade-layer/`@utility`/`:where()` strategy;
   Storybook 10 + CSF factories + `addon-themes` (theme + palette toolbar)
   + `react-docgen-typescript`; Vitest browser mode + `addon-vitest` +
   `addon-a11y` wiring.
4. **Button** — fresh Button: typed props/variants, token styling, stories,
   interaction + a11y tests; React Compiler verified on built artifact;
   `publint`/`attw` green.
5. **Workflow loop** — first real npm publish (`0.1.0`); integrate into the
   pilot Next.js App Router app; apply theme (palette override + dark);
   run the change→republish(`0.x`/`canary`)→`pnpm update` loop until
   friction-free; write & commit `docs/workflow.md`.
6. **Bake-off** — owner builds their Button; head-to-head comparison; write
   & commit `docs/component-conventions.md`; amend spec §6/§7/§9 if needed.
7. **(GATED) Scale** — component #2 (Dialog) then the remaining core set
   per the canonical pattern; introduce cross-scale hardening (Chromatic +
   TurboSnap, `.d.ts` API snapshot, knip `--production --strict`, CI
   sharding + tag split); optionally enable `pkg.pr.new`.

## 14. Open Items (non-blocking)

- Final npm scope/package name (owner decides; does not affect design).
- Exact semantic token names — defined during the token-slice phase;
  once published they become the semver-stable public contract.
- The owner's bake-off component/implementation (owner provides during §8.4).
- Component #2 confirmation (recommended Dialog) — decided after the §8.5
  gate.
- Exact Storybook 10.x ↔ Vitest ↔ `@storybook/addon-vitest` version pins —
  resolved at implementation against then-current peer ranges.
- Whether to graduate from the `.d.ts` snapshot to `@microsoft/api-extractor`
  (only if release tags / review docs become necessary).
