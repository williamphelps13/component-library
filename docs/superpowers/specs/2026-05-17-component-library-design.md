# Component Library — Design Spec

**Date:** 2026-05-17
**Status:** Approved (design); pending detailed implementation plan
**Owner:** William Phelps (+ small team)

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
| Language / UI / docs | TypeScript, React 19, Storybook |
| Audience | Owner + small team |
| Distribution | Versioned **public scoped npm package** (not shadcn-style copy-in, not private registry) |
| Consumers | Next.js App Router (RSC) **and** Vite SPAs |
| Styling engine | **Tailwind v4 internally**, shipped as **precompiled CSS** |
| Theming | Consumer-supplied palette + dark mode via **CSS-variable token overrides**, no rebuild |
| Design tokens | **Code-first** W3C/DTCG JSON → Style Dictionary → CSS vars; Figma mirrors via Tokens Studio (code is source of truth) |
| Primitives | Standardize on **Radix** (consolidated `radix-ui` package); migrate existing Headless UI Modal/Tabs |
| Component scope | Core primitives set (~12) |
| Repo structure | **Single repo, single package**; tokens compiled internally (not separately published) |
| Quality bar | Unit + interaction tests, automated a11y, visual regression |
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
- `peerDependencies`: `react: "^19.0.0"`, `react-dom: "^19.0.0"` (required).
- `radix-ui` in **`dependencies`** (implementation detail, externalized at
  build, consumers should not install it), caret-pinned on `1.4.x`.
- `"files": ["dist"]`; `main`/`module`/`types` fallbacks point at `dist`.
- `publishConfig: { access: "public", provenance: true }`.

### 4.2 Build

- **Bundler: `tsdown`** (Rolldown/Oxc-based, directive-preserving).
  - `format: ['esm']` only (add `cjs` only if a consumer demands it).
  - `unbundle: true` — per-module output so `"use client"` boundaries stay
    granular and tree-shaking is maximal. A single bundled chunk would drag
    the entire library across the client boundary.
  - Externalize `react`, `react-dom`, `react/*`, `radix-ui`, `@radix-ui/*`.
  - `dts: true`; JSX automatic runtime.
  - Run `publint` + `attw` in CI to catch dual-consumer packaging bugs.

### 4.3 RSC strategy

- Per-module `"use client"` **only** on interactive components (those
  importing Radix or using hooks/state/effects/event handlers).
- Purely presentational components (no hooks, no Radix) stay
  server-renderable — no directive.
- **No blanket `"use client"` on the barrel/index** — that forces the whole
  library client-side and kills server rendering of static pieces.
- `radix-ui` already ships its own `"use client"`, but our wrapper modules
  each need their own directive — it does **not** propagate transitively.
- CI must verify the directive survives into `dist` (if stripped, every
  Next App Router consumer breaks).

### 4.4 TypeScript

- `"module": "ESNext"`, `"moduleResolution": "bundler"`, `"target": "ES2022"+`,
  `"jsx": "react-jsx"`, `"verbatimModuleSyntax": true`, `"skipLibCheck": true`.
- Declarations generated by tsdown. **`isolatedDeclarations: true`** is the
  goal (fast, parallelized DTS via oxc; cleaner public types) — requires
  explicit return-type annotations on all exports. Fallback:
  tsdown `resolver: 'tsc'` if the annotation cost is too high initially.
- Validate types with `attw` + `publint` in CI.

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

### 5.4 Runtime theming contract

```
Primitive   :root { --color-blue-500: oklch(…); … }            (shipped defaults)
Semantic    :root            { --color-primary: var(--color-blue-500); }   (light)
Semantic    [data-theme=dark]{ --color-primary: var(--color-blue-300); }   (dark)
Tailwind    @theme inline { --color-primary: var(--color-primary); }
            → utilities emit  color: var(--color-primary)
```

- **Consumer palette override:** redefine semantic vars in their own `:root`
  *after* importing the library stylesheet (import order documented).
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
  consumer overrides in portals/nested DOM. This is the single
  highest-risk configuration detail.
- **Prefixed**: `@import "tailwindcss" prefix(tw);` to namespace utilities
  and `--tw-*` vars, preventing collisions when consumers also run Tailwind.
- Dark mode via an explicit attribute/class variant
  (`@custom-variant dark (&:where([data-theme=dark], …))`), **not**
  `prefers-color-scheme`, matched to the token pipeline's `data-theme`
  selector.
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
- Token-driven styling (Tailwind v4 → CSS vars).
- Storybook stories (CSF) covering variants/args.
- Interaction tests (`play` functions) and automated a11y assertions.

Modal and Tabs additionally carry the Headless UI → Radix migration.

## 9. Testing & Quality

**Stories are the single source of truth.** Storybook 9.x with
`@storybook/react-vite` serves as dev, docs (autodocs/MDX), and test
harness. Precompiled CSS imported once in `.storybook/preview.ts` (no
Tailwind Vite plugin needed — preview matches what consumers receive,
preserving fidelity); the same import flows into Vitest and Chromatic.

One Vitest run (browser mode, headless Chromium via
`@vitest/browser-playwright`) covers, with no redundancy:

- **Render + interaction** — every story executed; stories with `play()`
  become interaction tests, stories without become smoke/render tests.
  Replaces the old `@storybook/test-runner`.
- **Accessibility** — `@storybook/addon-a11y` (axe) annotations registered
  via `setProjectAnnotations` in `.storybook/vitest.setup.ts`; a11y `test`
  parameter set to `'error'` to fail CI.
- **Unit** — pure logic/hooks as a second Vitest project (jsdom/node) in the
  same `projects` array; one `vitest` command runs both.
- **Visual regression** — **Chromatic + TurboSnap** (`onlyChanged: true`)
  against the built Storybook; explicit baseline acceptance required on PRs;
  `exitZeroOnChanges` on non-main branches. Same stories, lowest
  maintenance, stays within free snapshot tier for a small library. Do not
  duplicate pixel assertions in `play` functions.
- React 19: RTL 16 / `vitest-browser-react`.

Browser mode (real Chromium) is used for component/interaction/a11y tests
because Radix relies on real focus traps, portals, and pointer events, and
Tailwind layout needs real CSS — all of which jsdom silently mishandles.

## 10. Release & Versioning

- **Changesets** (`@changesets/cli` 2.x + `changesets/action@v1`).
  `.changeset/config.json`: `"access": "public"`,
  `"changelog": "@changesets/changelog-github"`. `package.json` must not be
  `"private": true` and must set `publishConfig.access: "public"`.
- GitHub Actions on push to `main`: opens/updates a "Version Packages" PR;
  merging it publishes to npm and tags the release. The build + full Vitest
  suite gate the release.
- **npm OIDC trusted publishing**: register the repo+workflow as a Trusted
  Publisher on npm; workflow needs `id-token: write` and **no `NPM_TOKEN`**;
  provenance attestation is automatic. First publish of a new scoped
  package must be `--access public` (covered by config).

## 11. Recommended Versions (spring 2026)

| Tool | Version | Notes |
|---|---|---|
| React / React DOM | 19.2.x | peer `^19.0.0` |
| `radix-ui` (consolidated) | 1.4.x | not individual `@radix-ui/*`; in `dependencies`, externalized |
| Tailwind CSS | 4.3.x | internal only; CSS-first `@theme inline`; `prefix(tw)` |
| Style Dictionary | 5.x | ESM-only, DTCG; `@tokens-studio/sd-transforms` peer |
| Tokens Studio (Figma) | 2.11+ | DTCG default; GitHub multi-file sync |
| `tsdown` | 0.22.x | bundler; directive-preserving; `unbundle: true` |
| TypeScript | 6.0.x | `moduleResolution: bundler`; `isolatedDeclarations` goal |
| Storybook | 9.x | `@storybook/react-vite` (10.x exists; 9.x is the addon-stable line — verify addon peer ranges at implementation) |
| Vitest | 3.x | browser mode; verify `@storybook/addon-vitest` peer range before any 4.x jump |
| Testing addon | `@storybook/addon-vitest` | successor to `experimental-addon-test` |
| a11y addon | `@storybook/addon-a11y` | axe-core based |
| React Testing Library | 16.x | React 19 compatible; `vitest-browser-react` in browser mode |
| Changesets | `@changesets/cli` 2.x | `changesets/action@v1`; OIDC publishing |
| Chromatic | latest | `@chromatic-com/storybook` + TurboSnap |

> Most version-fragile spot: the Storybook ↔ Vitest ↔ `@storybook/addon-vitest`
> peer-range triad. Pin deliberately and verify ranges at implementation
> time; this changes faster than documentation snapshots.

## 12. Key Risks / Caveats

1. **`@theme inline` vs `@theme`** — plain `@theme` silently breaks runtime
   palette overrides in portals/nested DOM. Highest-risk detail.
2. **`"use client"` stripped in `dist`** → all Next App Router consumers
   break. CI must assert the directive survives the build.
3. **`sideEffects: false` without the CSS exception** → consumer styles
   silently disappear.
4. **`radix-ui` not externalized** → duplicate Radix context instances,
   broken portals/focus.
5. **`outputReferences: true` required** for the override cascade; every
   referenced token must exist in the same emitted scope.
6. **sd-transforms `preprocessors: ['tokens-studio']` must be explicit**
   (since 0.16.0) — silent failure otherwise.
7. **Storybook/Vitest/addon peer-range mismatch** — the most version-fragile
   integration; pin deliberately.
8. **Blanket `"use client"` on the barrel** → kills server rendering of
   static components.

## 13. Phasing (high-level)

Detailed, step-wise implementation plan is produced separately
(writing-plans). High-level phases:

1. **Foundation** — repo + git, `package.json`/`exports`, tsdown config,
   tsconfig, CI skeleton (lint, typecheck, `publint`/`attw`).
2. **Token pipeline** — DTCG tokens in `tokens/`, Style Dictionary v5 build
   (CSS vars + custom Tailwind `@theme inline` format), Tokens Studio
   GitHub sync.
3. **Styling + Storybook harness** — Tailwind v4 internal build →
   precompiled CSS; Storybook 9 + `@storybook/react-vite`; Vitest browser
   mode + `@storybook/addon-vitest` + `@storybook/addon-a11y` wiring.
4. **Components** — migrate Modal→Radix Dialog and Tabs→Radix Tabs; port +
   token-restyle + a11y/test-harden the remaining core set; stories +
   interaction + a11y tests per component.
5. **Visual regression + release** — Chromatic + TurboSnap; Changesets +
   GitHub Actions + npm OIDC trusted publishing; first published release.

## 14. Open Items (non-blocking)

- Final npm scope/package name (owner decides; does not affect design).
- Exact semantic token names — defined during the token-pipeline phase;
  once published they become the semver-stable public contract.
