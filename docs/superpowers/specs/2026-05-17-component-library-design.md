# Component Library — Design Spec

**Date:** 2026-05-17 · **Status:** Approved design; pending Milestone 0
implementation plan · **Owner:** William Phelps (+ small team)
_Evolution history is in this file's git log; this document reads as the
current, consolidated design._

---

## 1. Purpose & Constraints

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

The eventual surface is a core set of ~12 primitives; most already exist in
prior work (Tailwind Plus styling + Headless UI behavior) and will be moved
in, restructured, token-migrated, ported to Radix, and a11y/test-hardened.
**Delivery is staged** (§4): the first milestone deliberately ships a single
component to validate the whole stack and the consume/iterate workflow
before breadth.

## 2. Decisions at a Glance

| Topic                | Decision                                                                                                     |
| -------------------- | ------------------------------------------------------------------------------------------------------------ |
| Language / UI / docs | TypeScript · React 19 · Storybook 10.x                                                                       |
| Audience             | Owner + small team                                                                                           |
| Distribution         | Versioned public scoped npm package                                                                          |
| Consumers            | Next.js App Router (RSC) + Vite SPAs                                                                         |
| Repo structure       | Single repo, single package; tokens compiled internally                                                      |
| Bundler              | tsdown (Rolldown/Oxc), ESM-only, per-module output                                                           |
| React optimization   | Ship compiler-optimized output (`infer`); server components opt out with `"use no memo"` and stay uncompiled |
| Styling              | Tailwind v4 internally → precompiled CSS                                                                     |
| Theming              | CSS-variable token overrides; zero-specificity contract                                                      |
| Design tokens        | Code-first W3C/DTCG → Style Dictionary → CSS vars; Figma mirrors via Tokens Studio                           |
| Primitives           | Radix (consolidated `radix-ui` package)                                                                      |
| Package manager      | pnpm 11 (+ catalogs for framework pins)                                                                      |
| Lint / format        | ESLint flat config + Prettier (optional oxlint pre-pass)                                                     |
| Quality bar          | Unit + interaction + automated a11y + visual regression (Chromatic)                                          |
| Release              | Changesets + GitHub Actions + npm OIDC trusted publishing                                                    |
| Execution model      | Teaching Mode (§5)                                                                                           |
| First milestone      | Button-only vertical slice (§4.1)                                                                            |

Rationale for each lives in the relevant Architecture subsection; timing
(what ships when) lives in §4.

## 3. Architecture & Stack

This section describes the **target architecture** — what the library _is_,
independent of delivery order. What is built when is §4.

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
- `peerDependencies`: `react: ">=19"`, `react-dom: ">=19"`. The React 19
  floor is intentional — it lets React Compiler `target: '19'` emit
  `react/compiler-runtime` (built-in) with no extra runtime dependency.
- `radix-ui` (consolidated package) in **`dependencies`**, externalized at
  build — an implementation detail consumers should not install
  separately; caret-pinned on `1.4.x`.
- `"files": ["dist", "src"]` — `src` is published intentionally so
  `declarationMap`/source maps resolve and consumers cmd-click into real
  source. Public library, so no source-leak concern.
- `publishConfig: { access: "public", provenance: true }`.

### 3.2 Build

**Bundler: `tsdown`** (Rolldown/Oxc, directive-preserving).

- `format: ['esm']` only (add `cjs` only on demonstrated demand).
- `unbundle: true` — per-module output so `"use client"` boundaries stay
  granular and tree-shaking is maximal; a single bundled chunk would drag
  the whole library across the client boundary.
- Externalize `react`, `react-dom`, `react/*`, `radix-ui`, `@radix-ui/*`.
- `dts: true`; JSX automatic runtime; `sourcemap: true`.
- **React Compiler** (`babel-plugin-react-compiler` v1.x) via tsdown's
  recipe (`@rolldown/plugin-babel` + `reactCompilerPreset()`), compiler
  `target: '19'`, default `infer` mode. Every component is auto-memoized and
  shipped compiled — consumers cannot compile already-built `dist`, so this
  is the only way components get auto-memoization in any consumer.
  Server-renderable components opt out with a file-level `"use no memo"`
  directive and stay uncompiled: the compiler's memoization is a hook
  (`useMemoCache`) that would break RSC rendering, and memoization is moot
  for a component that renders once on the server. Compilation is idempotent
  (a consumer also running the compiler is a documented non-issue). See
  ARCHITECTURE.md § "Server and client boundary".

Why tsdown over alternatives:

- **bunchee** — equally first-class for RSC (zero-config client/server
  split), more proven on real RSC libraries. Viable fallback; tsdown wins
  only on bundled fast Oxc `isolatedDeclarations` DTS plus built-in
  `publint`/`attw`, which de-risk the dual-consumer packaging requirement.
- **tsup + `esbuild-plugin-preserve-directives` + `bundle:false`** — most
  battle-tested engine, but `"use client"` preservation is not zero-config
  and is historically fragile with code-splitting; tsup's popularity is
  largely non-RSC. Credible migration target if tsdown (youngest option)
  disappoints.
- **Vite library mode / unbuild / rslib** — manual, non-directive-aware
  wiring for RSC; no advantage here.

The choice is reversible: `unbundle: true` per-module ESM is portable
across tsdown/bunchee/tsup.

### 3.3 RSC & `"use client"` strategy

- Per-module `"use client"` **only** on interactive components (Radix,
  hooks, state, effects, event handlers). Purely presentational components
  stay server-renderable with no directive.
- **No blanket `"use client"` on the barrel/index** — that forces the whole
  library client-side and kills server rendering of static pieces.
- `radix-ui` ships its own `"use client"`, but our wrapper modules each
  need their own — it does not propagate transitively.
- Enforced (see §3.10): an author-time lint rule plus a build-time CI
  assertion that `dist` client entrypoints carry the directive and the
  barrel chunk does not.

### 3.4 TypeScript

- `"module": "ESNext"`, `"moduleResolution": "bundler"`,
  `"target": "ES2022"+`, `"jsx": "react-jsx"`,
  `"verbatimModuleSyntax": true`, `"skipLibCheck": true`.
- **Go-to-source DX:** `"declaration"`, `"declarationMap"`, `"sourceMap"`
  all true; with `src` shipped (§3.1) consumers cmd-click from
  `node_modules` into real `.ts`. `.d.ts.map` paths must resolve to the
  shipped `src/` layout — keep `rootDir`/`src` consistent.
- Declarations via tsdown. **`isolatedDeclarations: true`** is the goal
  (fast parallel Oxc DTS, cleaner public types) — requires explicit
  return-type annotations on exports; fallback tsdown `resolver: 'tsc'`.
- **`tsc` (5.9.x/6.x) is the authoritative typecheck / CI gate.** `tsgo`
  (`@typescript/native-preview`) is preview in spring 2026 (declaration
  emit / public-API surface incomplete) — usable only as an optional,
  non-blocking fast pre-check; pin the preview build.

### 3.5 Design tokens & theming pipeline

**Three-tier taxonomy:**

1. **Primitive** — raw scales (`color.blue.500`, `space.4`); mode-agnostic,
   never consumed directly.
2. **Semantic / alias** — intent-based, reference primitives
   (`color.primary`, `color.bg.surface`, `color.text.error`). **The
   consumer override surface** and the layer that flips light/dark.
3. **Component** — sparse; only when a component needs a token decoupled
   from semantics.

**Pipeline:** tokens authored as W3C/DTCG JSON in `tokens/`; **Style
Dictionary v5** (ESM-only, Node 18+) compiles them:

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

**Runtime theming contract (zero-specificity by construction):**

```
Primitive   :root { --color-blue-500: oklch(…); … }            (shipped defaults)
Semantic    :root            { --color-primary: var(--color-blue-500); }   (light)
Semantic    [data-theme=dark]{ --color-primary: var(--color-blue-300); }   (dark)
Tailwind    @theme inline { --color-primary: var(--color-primary); }
            → utilities emit  color: var(--color-primary)
```

- Consumers redefine semantic vars in their own `:root` _after_ importing
  the library stylesheet (import order documented). Inherited custom
  properties → the override wins by source order, **no `!important`, no
  specificity fight**.
- Dark mode: consumer toggles `data-theme="dark"` on `<html>`; only the
  semantic tier flips. The toggle UI is a consumer-side Client Component;
  library CSS is server-safe.
- **The semantic tier is the only semver-stable public contract.**
  Renaming a semantic token is a breaking change; component/Tailwind
  internal vars are not part of the contract.

### 3.6 Styling

- **Tailwind v4 internally only**, compiled at publish time into one
  stylesheet shipped as `@scope/ui/styles.css`. Zero runtime; identical in
  RSC and Vite.
- CSS-first config. Utilities bind to token vars via **`@theme inline`** —
  plain `@theme` adds a value-to-Tailwind-var indirection that breaks
  consumer overrides in portals/nested DOM. Highest-risk config detail.
- **Prefixed** (`@import "tailwindcss" prefix(tw);`) — namespaces utilities
  and `--tw-*` vars against consumers who also run Tailwind.
  - **As-built supersession** — `prefix(tw)` was rejected during Phase 3:
    it renames theme variables (`--color-*` → `--tw-color-*`), which
    breaks the §3.5 consumer override contract. Collision-safety lands
    instead via `source(none) + @source "../components"`, our own
    `ui-*` `@utility` names, and Preflight omission. See
    ARCHITECTURE.md §"Styling and theming" and the plan deviation log
    entry "Tailwind `prefix(tw)` REJECTED".
- **Zero-specificity override strategy** (hardens the §3.5 contract):
  - Dark/palette variant as
    `@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));`
    — `:where()` keeps specificity zero.
  - Component classes via Tailwind v4's **`@utility` API** (predictable
    declaration-count-sorted order), not `@layer components` (reserve that
    only for styles deliberately resistant to casual override).
  - All library CSS lives **inside Tailwind's cascade layers** so a
    consumer's unlayered CSS deterministically wins; shipping unlayered
    rules would beat consumer overrides — avoid.
  - **Never `!important`** in shipped CSS.
- Dark mode via the explicit `data-theme` variant above, not
  `prefers-color-scheme`.

### 3.7 Primitives & component model

- **Consolidated `radix-ui` package** — single dependency, namespace
  imports (`import { Dialog, Tabs } from "radix-ui"`), dot-notation. Avoid
  legacy individual `@radix-ui/react-*` (version-drift, duplicate-instance
  risk).
- Cross-component API conventions: `className` merge, forwarded refs,
  controlled/uncontrolled props, `asChild` passthrough where Radix
  supports it, consistent naming. These conventions are the working
  baseline; the §4.1 bake-off validates and may refine them.
- Components migrated from existing Headless UI work (Modal → Radix
  Dialog, Tabs → Radix Tabs) follow the mechanical mapping in **Appendix
  A**.

### 3.8 Testing & quality stack

**Stories are the single source of truth.** Storybook 10.x with
`@storybook/react-vite` is dev + docs + test harness (greenfield on the
current major; CSF factories and `addon-vitest` are materially better than
on 9.x).

- **Story authoring: CSF factory API ("CSF Next")** — `preview.meta({…})` →
  `meta.story({…})` importing `.storybook/preview`, end-to-end inferred
  (no `Meta`/`StoryObj` generics). Experimental → pin Storybook minors.
- **Theming toolbar:** `@storybook/addon-themes`
  `withThemeByDataAttribute({ attributeName: 'data-theme', … })` + a second
  "palette" toolbar global whose decorator sets override vars on the
  preview root — the token override + dark-mode system is interactively
  testable with zero rebuilds. Token selectors must match the injected
  attribute (`[data-theme=dark]`, no `:root` prefix).
- **Props docs:** `react-docgen-typescript` (not the default
  `react-docgen`) with a Radix-aware `propFilter` (exclude `node_modules`
  except `@radix-ui`) so inherited public-API props render accurately.
- Precompiled CSS imported once in `.storybook/preview` (no Tailwind Vite
  plugin — preview matches what consumers receive); the same import flows
  into Vitest and Chromatic.

One Vitest run (browser mode, headless Chromium via
`@vitest/browser-playwright`) covers, with no redundancy:

- **Render + interaction** — every story; `play()` stories are interaction
  tests, others are smoke/render. (Replaces the old `test-runner`.)
- **Accessibility** — `@storybook/addon-a11y` (axe) annotations via
  `setProjectAnnotations` in `.storybook/vitest.setup.ts`; a11y `test`
  parameter `'error'` to fail CI.
- **Unit** — pure logic/hooks as a second Vitest project (jsdom/node) in
  the same `projects` array (Vitest `projects`, not deprecated
  `workspace`); one command runs both.
- **Visual regression** — **Chromatic + TurboSnap** (`onlyChanged: true`)
  against the built Storybook; explicit baseline acceptance on PRs;
  `exitZeroOnChanges` off `main`. A required release gate.

Browser mode (real Chromium) is used because Radix needs real focus traps,
portals, and pointer events, and Tailwind needs real CSS layout — jsdom
silently mishandles all three. React 19 → RTL 16 / `vitest-browser-react`.

**Scale-only test performance levers** (meaningful only with many
components, applied when scaling — §4.2): headless single Chromium
instance, `test.isolate: false` for the stateless Storybook project, 2–3
CI shards, smoke-vs-interaction story tag-split.

### 3.9 Release & versioning

- **Changesets** (`@changesets/cli` 2.x + `changesets/action@v1`).
  `.changeset/config.json`: `"access": "public"`,
  `"changelog": "@changesets/changelog-github"`. `package.json` not
  `"private"`, `publishConfig.access: "public"`.
- GitHub Actions on push to `main`: opens/updates a "Version Packages" PR;
  merging publishes to npm and tags. Gate: build (incl. React Compiler) +
  Vitest suite + `publint`/`attw --pack` + Chromatic (accepted baselines).
- **npm OIDC trusted publishing**: repo+workflow registered as Trusted
  Publisher; workflow needs `id-token: write`, **no `NPM_TOKEN`**;
  provenance automatic. First publish of a new scoped package must be
  `--access public` (covered by config).
- The day-to-day iteration loop (real publish, pre-1.0, `canary` dist-tag,
  optional `pnpm pack` pre-check) is defined once in §4.1.

### 3.10 Code quality & hygiene tooling

- **pnpm 11**, with a **catalog** for framework-critical pins (`react`,
  `react-dom`, `tailwindcss`, `radix-ui`, `typescript`) — versions defined
  and reviewed once. (Catalog is a nice-to-have at single-package scale;
  plain pnpm acceptable if deps stay tiny.)
- **ESLint flat config + Prettier.** ESLint is the only stack with
  authoritative `eslint-plugin-react-hooks` (v6/7, React 19 + Compiler),
  strict `eslint-plugin-jsx-a11y`, `@eslint-react`, `typescript-eslint`
  (type-aware via `projectService`), `eslint-plugin-import-x`. Prettier =
  formatting only. Optional `oxlint` fast pre-pass ("oxlint gate, ESLint
  authority"). Biome 2.4 rejected: documented react-hooks-rule fidelity
  gap for a shipped UI library.
- **`"use client"` guardrail (defense in depth):**
  `eslint-plugin-react-server-components` `use-client` rule (error);
  `@eslint-react` directive-placement rule (warn); a build-time CI
  assertion that `dist` client entrypoints carry the directive and the
  barrel does not.
- **`knip` v6** (oxc-based) in CI for dead-code/dep hygiene; library entry
  points configured in `knip.json` (or `@public` JSDoc) so public exports
  aren't false-flagged; known tools registered. The
  `--production --strict` dependency-isolation pass is a scale-time
  addition (§4.2).
- **Public API-surface guard:** `publint` + `attw --pack` every CI run. A
  committed bundled-`.d.ts` snapshot diff is a scale-time addition (§4.2);
  graduate to `@microsoft/api-extractor` only if release tags / a review
  artifact are later needed.

### 3.11 Recommended versions (spring 2026)

| Tool                                        | Version                          | Notes                                                                                                    |
| ------------------------------------------- | -------------------------------- | -------------------------------------------------------------------------------------------------------- |
| React / React DOM                           | 19.2.x                           | peer `>=19` (enables RC `target:'19'` w/o runtime dep)                                                   |
| `babel-plugin-react-compiler`               | 1.x                              | via tsdown `@rolldown/plugin-babel` + `reactCompilerPreset()`                                            |
| `radix-ui` (consolidated)                   | 1.4.x                            | not individual `@radix-ui/*`; in `dependencies`, externalized                                            |
| Tailwind CSS                                | 4.x                              | internal only; `@theme inline`; `@utility` and `:where()` (`prefix(tw)` superseded — see §3.6)           |
| Style Dictionary                            | 5.x                              | ESM-only, DTCG; `@tokens-studio/sd-transforms` peer                                                      |
| Tokens Studio (Figma)                       | 2.11+                            | DTCG default; GitHub multi-file sync                                                                     |
| `tsdown`                                    | 0.22.x+                          | directive-preserving; `unbundle`; `sourcemap`                                                            |
| TypeScript                                  | 5.9.x / 6.x                      | `moduleResolution: bundler`; `isolatedDeclarations` goal; `tsc` is the gate                              |
| `tsgo` (`@typescript/native-preview`)       | preview                          | optional non-blocking fast pre-check only; pin                                                           |
| pnpm                                        | 11.x                             | catalogs for framework pins                                                                              |
| ESLint (flat) + Prettier                    | latest                           | + react-hooks v6/7, jsx-a11y, @eslint-react, typescript-eslint, import-x, react-server-components        |
| oxlint                                      | 1.x                              | optional fast pre-pass                                                                                   |
| knip                                        | 6.x                              | oxc-based; library entry-point config                                                                    |
| Storybook                                   | 10.x                             | `@storybook/react-vite`; CSF factory API; `addon-themes`                                                 |
| Vitest                                      | per `@storybook/addon-vitest`@10 | browser mode; `projects` not `workspace`; verify the SB↔Vitest↔addon-vitest peer triad at implementation |
| `@vitest/browser-playwright`                | latest                           | split provider package                                                                                   |
| `@storybook/addon-vitest`/`-a11y`/`-themes` | SB 10.x line                     | successor to `experimental-addon-test`                                                                   |
| `react-docgen-typescript`                   | latest                           | autodocs (Radix-aware `propFilter`)                                                                      |
| React Testing Library                       | 16.x                             | React 19; `vitest-browser-react` in browser mode                                                         |
| Changesets                                  | `@changesets/cli` 2.x            | `changesets/action@v1`; OIDC                                                                             |
| `pkg-pr-new`                                | latest                           | per-PR preview releases                                                                                  |
| Chromatic                                   | latest                           | `@chromatic-com/storybook` + TurboSnap                                                                   |

> Most version-fragile spot: the Storybook ↔ Vitest ↔
> `@storybook/addon-vitest` peer triad. Pin deliberately, verify at
> implementation, and pin Storybook minors while CSF factories are
> experimental — this moves faster than doc snapshots.

## 4. Scope & Phasing

This section owns **all delivery timing**. §3 says what the library is;
this says what is built when.

### 4.1 Milestone 0 — Button vertical slice

Milestone 0 is a **thin vertical slice through every layer of §3 using
exactly one component (Button)**. Purpose: iron out (a) the full
author → build → publish → consume → re-publish → re-consume workflow, and
(b) the canonical component-authoring pattern — before any second
component.

**Why Button:** touches the entire pipeline (token theming, variants,
focus-visible a11y, autodocs, build, publish, consume) with the least
behavioral complexity, and is server-renderable so it also proves the
no-`"use client"` path. Fastest route to a working end-to-end loop.

**Milestone 0 delivers, for Button:**

- Typed props + intent/size variants that meaningfully exercise the
  semantic palette tokens and dark mode.
- Token-driven styling via the `@utility`/zero-specificity strategy (§3.6).
- A minimal token slice: primary + neutral palette, the semantic tokens
  Button consumes (bg/text/border/ring + a destructive intent), and their
  dark re-binding. (Full token set follows when scaling.)
- Storybook CSF-factory stories; autodocs via `react-docgen-typescript`.
- Vitest interaction (`play`) + automated a11y for Button.
- **Chromatic + TurboSnap** baselines with PR acceptance, wired as a
  **required release gate**. Standing the
  Chromatic↔Storybook↔CI↔TurboSnap↔gate integration up in isolation on one
  stable component is deliberate — it's the historically painful piece,
  de-risked while noise is near-zero. (Regression-_coverage_ value grows
  with breadth later; the _workflow_ is validated now.)
- Build with React Compiler; `publint`/`attw --pack` green.
- Published to npm for real.

**Workflow validation loop** (pilot consumer = an existing **Next.js App
Router** app — RSC is the riskiest path, de-risked first):

1. Publish `0.1.0` via Changesets + Actions + OIDC.
2. In the pilot app: install `@scope/ui`, import `@scope/ui/styles.css`
   once in the root `layout.tsx`, render `<Button>` in a route (Server
   Component context).
3. **Apply a theme:** override semantic palette vars in the consumer
   `:root` and toggle `data-theme="dark"` from a small client component;
   verify zero-rebuild theming and correct RSC behavior.
4. **Consumer-driven change:** consumer needs a Button change → make it
   here → Chromatic flags the diff on the PR → review & accept the new
   baseline → Changeset → version bump → publish next `0.x` (Chromatic
   green is a required gate) → consumer `pnpm update` → verify it lands.
   _(Frequent baseline approvals during this iteration are expected — that
   is the workflow being exercised, not a failure.)_
5. Repeat 3–4 until friction-free; write & commit the ironed-out consumer +
   maintainer workflow (`docs/workflow.md`), including the Chromatic
   baseline-review step.

**Loop mechanics (single source of truth):** real `npm publish` is the
authoritative, documented contract (it matches how the team consumes other
libraries). During ironing-out, stay **pre-1.0 (`0.x`)** and publish
experimental iterations under a **`canary` dist-tag**, promoting to
`latest` only once validated, so `latest` stays clean. `pnpm pack` +
install-the-tarball is an optional fast pre-publish packaging sanity check
(byte-identical to the registry artifact; catches
`exports`/directive/CSS-path bugs without a version burn).

**Component-pattern bake-off:** in parallel the **owner independently
builds their own Button** (or brings an existing component) with their own
conventions, Storybook + tests. Head-to-head comparison across public API
shape, prop/variant ergonomics, ref/`asChild` handling, token usage, the
`"use client"` decision, story/test ergonomics, type DX — explicitly
capturing what each does better and worse. Deliverable: a committed
**component authoring conventions** doc (`docs/component-conventions.md`).
The §3.6/§3.7/§3.8 conventions are the working baseline until this
concludes; the bake-off may amend them.

**Gate.** All subsequent scope is blocked until both: the workflow loop is
friction-free and documented, _and_ the canonical component pattern is
agreed and written. Pulling breadth or scale-time hardening forward
dilutes the slice's purpose — hold the gate.

### 4.2 Post-Milestone-0 (after the gate)

- **Component #2 — recommended Dialog**: Radix primitive + mandatory
  `"use client"` + portal theming through `@theme inline` + focus trap;
  proves the architectural risks and is a second bake-off vs the owner's
  existing Headless UI Modal (Appendix A). Confirmed after the gate.
- **Breadth toward ~12:** Input, Select, Checkbox, Radio, Tabs, Tooltip,
  Popover, Toast, Card, Badge — applying the canonical pattern; Modal/Tabs
  carry the Appendix A migration.
- **Scale-time hardening introduced here** (low signal at one component):
  committed `.d.ts` API-surface snapshot diff; knip
  `--production --strict` dependency isolation; the §3.8 test-performance
  levers (single Chromium, `isolate:false`, sharding, tag-split).
  _(Chromatic is already gating from Milestone 0 — scaling only adds
  baselines.)_
- **`pkg.pr.new`** per-PR preview releases may be enabled here if useful.
  Deliberately kept out of the first ironed loop to keep §4.1 focused.

### 4.3 Phases

The detailed step-wise plan is produced separately (`writing-plans`).
Every phase runs in **Teaching Mode (§5)**: the user runs all commands,
each step carries a Concept/Why/Tradeoffs preamble, and a hard quiz gate
ends each phase before the next starts. Milestone 0 is phases 1–6; the
§4.1 gate precedes phase 7.

1. **Foundation** — repo + git, pnpm 11 (+ catalogs), `package.json`/
   `exports`, tsdown config (incl. React Compiler), tsconfig
   (declarationMap/sourceMap), code-quality toolchain (ESLint flat +
   Prettier + optional oxlint + `react-server-components` rule), CI
   skeleton (lint, typecheck, publint/attw, `"use client"` build
   assertion). Scoped to one component's needs.
2. **Token slice** — Button-relevant DTCG palette/semantic tokens + dark
   re-binding; Style Dictionary v5 build (CSS vars + custom Tailwind
   `@theme inline` format); Tokens Studio GitHub sync.
3. **Styling + Storybook + visual-regression harness** — Tailwind v4
   internal build → precompiled CSS (cascade-layer/`@utility`/`:where()`);
   Storybook 10 + CSF factories + `addon-themes` + `react-docgen-typescript`;
   Vitest browser mode + `addon-vitest` + `addon-a11y`; Chromatic +
   TurboSnap wired.
4. **Button** — fresh Button: typed props/variants, token styling,
   stories, interaction + a11y tests; React Compiler verified on the built
   artifact; publint/attw green.
5. **Workflow loop** — first real publish (`0.1.0`); integrate into the
   pilot App Router app; apply theme; run the
   change→Chromatic-accept→republish(`0.x`/`canary`)→`pnpm update` loop
   until friction-free; write & commit `docs/workflow.md`.
6. **Bake-off** — owner builds their Button; head-to-head; write & commit
   `docs/component-conventions.md`; amend §3.6/§3.7/§3.8 if indicated.
7. **(GATED) Scale** — component #2 (Dialog) then breadth per the
   canonical pattern; introduce scale-time hardening (§4.2); optionally
   enable `pkg.pr.new`.

## 5. Execution Methodology (Teaching Mode)

This project is executed as a **teaching process**, not a hands-off build —
an explicit goal, not overhead. Rationale (owner): in a prior project the
agent scaffolded everything and the choices had to be reverse-engineered
afterward, making troubleshooting costly. Building understanding as we go
is faster overall.

- **Division of labor:** the user runs **every** CLI/setup command
  personally (package-manager init, installs, tool scaffolds, builds,
  `npm publish`, consumer install/`pnpm update`). The agent provides the
  exact command but does not execute it. The agent authors code & config
  and walks the user through it; the learning target is the
  toolchain/architecture decisions, not boilerplate transcription.
- **Per-step format:** before each step — **Concept** (what it
  introduces), **Why this choice** (and alternatives rejected),
  **Tradeoffs** (cost / what it precludes), **What you'll run** (exact
  commands + expected output).
- **Phase-boundary quiz gate (hard):** at each phase end the agent quizzes
  the user (Socratic, specific to choices just made — e.g. "why precompiled
  CSS instead of requiring consumer Tailwind?", "what breaks if
  `"use client"` is stripped from `dist`?", "why is the semantic tier the
  only semver-stable contract?"). Progression is blocked until the user can
  articulate it; shaky answers → re-teach, re-quiz.
- **Failures are lessons:** a user-run command that errors becomes a
  guided debugging exercise (user drives diagnosis, agent coaches
  hypothesis → check → fix) — this builds the troubleshooting fluency the
  methodology exists to create.
- **Implication for `writing-plans`:** every task carries the
  Concept/Why/Tradeoffs/What-you'll-run preamble; every command is marked
  user-executed; every phase ends with a blocking quiz checkpoint. The
  plan is a teaching curriculum, not just a build sequence.

## 6. Non-Goals (permanent)

Things this project will **not** do (distinct from §4.2, which is "later,
not never"):

- React Native / cross-platform web-native support.
- A monorepo, or a separately published `@scope/tokens` package
  (extractable later without breaking consumers if a non-React need arises).
- shadcn-style copy-in distribution; private/paid registries.
- A bespoke documentation site beyond Storybook (Storybook autodocs + MDX
  is the documentation surface).
- A full design-system surface (layout primitives, typography system, icon
  set, theming UI) — may follow as separate spec→plan cycles.
- `tsgo` as an authoritative typecheck/CI gate (optional pre-check only
  until its declaration emit stabilizes).

## 7. Risks & Caveats

1. **`@theme inline` vs `@theme`** — plain `@theme` silently breaks runtime
   palette overrides in portals/nested DOM. Highest-risk detail.
2. **`"use client"` stripped in `dist`** → all App Router consumers break;
   the §3.10 build assertion must catch it.
3. **`sideEffects:false` without the CSS exception** → consumer styles
   silently disappear.
4. **`radix-ui` not externalized** → duplicate Radix context instances,
   broken portals/focus.
5. **`outputReferences:true` required** for the override cascade; every
   referenced token must exist in the same emitted scope.
6. **sd-transforms `preprocessors:['tokens-studio']` must be explicit**
   (since 0.16.0) — silent failure otherwise.
7. **Storybook ↔ Vitest ↔ addon-vitest peer mismatch** — the most
   version-fragile integration; pin deliberately; pin SB minors (CSF
   factories experimental).
8. **Blanket `"use client"` on the barrel** → kills server rendering of
   static components.
9. **React Compiler target/runtime mismatch** — `target:'19'` requires the
   React 19 peer floor; lowering support without adding
   `react-compiler-runtime` as a dependency crashes consumers.
10. **Unlayered shipped CSS or any `!important`** beats consumer
    overrides — all library CSS must sit inside Tailwind's cascade layers.
11. **`test.isolate:false` + stateful stories** → cross-test bleed (keep
    stories pure); over-sharding a tiny suite is net-negative.
12. **knip library misconfig** — public exports false-flagged as unused if
    entry points / `@public` tags aren't set.

## 8. Open Items (non-blocking)

- Final npm scope/package name (owner; does not affect design).
- Exact semantic token names — fixed during the token-slice phase; once
  published they become the semver-stable contract.
- The owner's bake-off component/implementation (owner provides in §4.1).
- Component #2 confirmation (recommended Dialog) — after the §4.1 gate.
- Exact Storybook 10.x ↔ Vitest ↔ `@storybook/addon-vitest` pins —
  resolved at implementation against then-current peer ranges.
- Whether to graduate the `.d.ts` snapshot to `@microsoft/api-extractor`
  (only if release tags / review docs become necessary).

## Appendix A — Headless UI → Radix migration reference

Mechanical mapping for the existing Headless UI components, applied when
they are ported (component #2 onward, §4.2 — not Milestone 0). Reference
only; not part of the near-term deliverable.

**Modal → Radix Dialog**

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
