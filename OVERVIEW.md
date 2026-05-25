# The Component Library — A Plain-English Field Guide

*An engaging, in-depth tour of what we're building, every tool in the box, and why
each one earns its place. Written for someone strong in React and frontend, but new to
the world of build systems and publishing libraries.*

*All versions and facts here were verified against live docs and the npm registry in
**spring 2026**. Where a tool is moving fast, that's called out — this space changes
quickly.

---

## Table of Contents

- **Part I — The Big Picture**
  - What a component library actually is
  - The problem it solves (the "before")
  - Why this one will be worth it
  - The mental model (the pipeline in one breath)
- **Part II — How We're Building It**
  - The vertical slice: one component, all the way through
  - The bake-off
  - Teaching Mode (how you and I work)
- **Part III — The Toolbox (deep dives)**
  - Foundations: TypeScript, React + React Compiler
  - Package & build: pnpm, the Rust toolchain, tsdown, ESM & packaging, the inspectors
  - The server/client boundary: `"use client"`
  - Styling & theming: Tailwind v4, design tokens, Style Dictionary, runtime theming, Figma
  - Component behavior: Radix
  - Docs & testing: Storybook, Vitest, accessibility, Chromatic
  - Quality & release: linting, dead-code, Changesets, trusted publishing
- **Part IV — The Consumer Experience**
- **Part V — The Real Challenges (Small Team, Many Projects)**
- **Part VI — Putting It All Together**
- **Part VII — Glossary**
- **Part VIII — Where We Are & What's Next**

---
---

# Part I — The Big Picture

## What a component library actually is

A **component library** is a package you publish to npm so that *other people's apps* can
install it and use your components:

```bash
pnpm add @williamphelps13/ui
```
```tsx
import { Button } from '@williamphelps13/ui'
```

That single sentence — "*other people's apps install it*" — is the lens for this entire
document. It changes everything about how you build.

When you build an **app**, you bundle it once and ship it to a browser. You control the
whole pipeline. When you build a **library**, you ship raw-ish building blocks into builds
you *don't* control — different React setups, different bundlers (Next.js here, Vite
there), different TypeScript settings. So a library has to be:

- **Small** — don't drag your whole world into every consumer's app.
- **Precisely typed** — your `.d.ts` files are the contract everyone's editor reads.
- **Debuggable from the outside** — a stranger should be able to click into your code.
- **Forgiving** — work whether the consumer is on Next.js, Vite, server, or browser.

Almost every "weird" tool in Part III exists to satisfy one of those four constraints.

## The problem it solves (the "before")

Picture life *without* a shared library, which is probably how most teams start:

- Project A has a `Button`. Project B copy-pastes it and tweaks the padding. Project C
  rebuilds it from scratch because nobody remembered B had one.
- A brand color changes. Now it lives in 14 slightly-different places across 3 repos.
- One project's `Button` is accessible (keyboard, screen-reader friendly); the other two
  aren't, and nobody noticed.
- A junior dev ships a `Modal` that traps focus incorrectly. It happens again in the next
  project, because the lesson lived only in one person's head.

The cost isn't any single button — it's the **drift**. Every project re-solves the same
problems slightly differently, quality is uneven, and changes don't propagate. A component
library replaces "copy, paste, and pray" with "install, and get the good version
everywhere."

## Why this one will be worth it

Here's the payoff we're designing for, in plain terms:

1. **One source of truth.** Fix or improve a component once; every project that updates
   gets the fix. No more 14 copies of the brand color.

2. **Themeable per project, with no rebuild.** Each app can override the color palette
   (primary / neutral / success / error) and flip dark mode at *runtime*, just by setting a
   few CSS variables. The library ships one stylesheet; each consumer dresses it
   differently. (How that magic works is Part III's theming section — it's genuinely
   elegant.)

3. **Works in both worlds.** The same package renders correctly in **Next.js App Router**
   (with React Server Components) *and* in **Vite** single-page apps. You don't ship two
   builds.

4. **Quality is automatic, not heroic.** Accessibility checks, interaction tests, and
   visual screenshots run on every change. Correctness doesn't depend on someone
   remembering to test — the pipeline enforces it.

5. **Design and code stay in sync.** The design decisions (colors, spacing) live as data
   in the repo and mirror to Figma, so designers and developers read from the same truth
   instead of retyping hex codes at each other.

6. **Safe, boring releases.** Publishing is automated, versioned, and cryptographically
   signed — no secret tokens to leak, no manual `npm publish` at 2am.

## The mental model (the pipeline in one breath)

If you squint, the whole system is one pipeline. Hold this picture and every tool below
slots into it:

```
   Figma (design)
        │  (design tokens sync both ways)
        ▼
   Token files (JSON)  ──►  Style Dictionary  ──►  CSS variables
        │                                              │
        │                                              ▼
   Your component source (.tsx, TypeScript)      Tailwind v4
        │                                              │
        ▼                                              ▼
   tsdown (bundler) + React Compiler  ────────►  one precompiled .css
        │                                              │
        ▼                                              ▼
   dist/  (.mjs JavaScript + .d.mts types + styles.css)
        │
        ▼
   npm  ──►  a consumer's app (Next.js or Vite)
                 │
                 ▼
   they override a few CSS variables → their own theme, no rebuild
```

Everything else — Storybook, the tests, the linters, the release robot — is there to make
that pipeline **trustworthy**: prove each piece works before a stranger depends on it.

---
---

# Part II — How We're Building It

## The vertical slice: one component, all the way through

The tempting way to build a component library is "horizontally" — make all 12 components,
then set up publishing, then add tests. That's how you end up with 12 half-working
components and a publishing process that breaks the first time you try it.

We're going **vertical** instead. The first milestone builds *exactly one component (a
Button)* but takes it through **every single layer**:

1. Build the Button (styled with tokens, typed, documented).
2. Test it (interaction + accessibility + a visual snapshot).
3. **Publish it for real** to npm.
4. **Install it in a real Next.js app**, apply a theme, toggle dark mode.
5. Make a change → re-publish a new version → update the app → confirm the change flows.
6. Repeat the loop until it's *friction-free*.

Only after that whole loop is smooth do we add more components. Why this order?

- **You hit the hard, finicky problems early** — packaging, the server/client boundary,
  publishing, theming — while there's only *one* component making noise. Debugging a tricky
  build with 1 component is a hundred times easier than with 12.
- **The riskiest thing in a library isn't the components — it's the *workflow*.** "Change
  the library → consumers get the change" is the loop you'll run a thousand times. We
  harden it first.
- By the time we scale up, the foundation is proven and boring (the best kind of
  foundation).

This is why the early going feels heavy on configuration: we're laying rails, not stamping
out components. Once the rails are down, components come fast.

## The bake-off

There's one more twist in Milestone 0. After we build *our* Button, **you build your own
version**, your way. Then we put them side by side and compare: the prop names, how
variants work, how it handles refs and styling, how the tests read. We keep the best ideas
from each and write them down as the **canonical component pattern** — the recipe every
future component follows.

The point isn't to crown a winner. It's that a pattern you *argued your way to* is one
you'll actually remember and apply, versus one handed to you.

## Teaching Mode (how you and I work)

This project is also deliberately a learning exercise, because a library you understand is
a library you can fix at 2am, and one you don't is a liability.

So the working rules are:

- **You run every command.** I give you the exact command and explain it *first* — what it
  does, why this choice, the trade-offs — but your hands are on the keyboard. Running it
  yourself is how the knowledge sticks.
- **I write the code and config, then walk you through it.** The goal is for you to
  understand the *decisions*, not to transcribe boilerplate.
- **Every phase ends with a short quiz.** We don't move on until the concepts are solid in
  your own words. A shaky answer just means we revisit that piece.
- **When something breaks, we debug it together** — you drive, I coach (hypothesis → check
  → fix). We've already turned three "errors" into permanent lessons this way.

The whole bet: a little slower now, dramatically faster (and less mysterious) later.

---
---

# Part III — The Toolbox (deep dives)

Each tool below follows the same shape: **what it is** (plain), **an analogy**, **why it
matters for *this* library**, **the key ideas**, **the current version**, and **a gotcha**.

## Foundations

### TypeScript 6.0 — the contract layer

**In plain terms.** TypeScript is JavaScript with a *type layer* on top. You annotate what
shapes your data and functions expect; a compiler checks you got it right; then the types
are *erased* and plain JavaScript ships. Types cost nothing at runtime — they're a
build-time safety net and an autocomplete engine.

**Analogy.** Types are the labeled ports on the back of a stereo. The music (your runtime
JS) plays the same either way, but the labels mean you plug the right cable into the right
hole the first time — and your editor can *show* you the labels as you go.

**Why it matters for a library.** For a library, the **types ARE a shipped product.** When
someone installs your package, their editor reads your `.d.ts` (type declaration) files to
power autocomplete and catch their mistakes. If your types are wrong or missing, every
consumer feels it. So a few TypeScript settings are really "library quality" settings:

- **`isolatedDeclarations`** — forces every *exported* function to declare its return type.
  Mildly annoying to write; secretly a superpower. Because all the public type info is
  spelled out at the boundaries, a tool can generate your `.d.ts` files *per-file, in
  parallel, without running the full slow type-checker*. This is what makes the fast
  Rust-based type generation (see tsdown) possible.
- **`declarationMap` + `sourceMap`** — emit little "map" files so that when a teammate in
  another project does *Go to Definition* on your `Button`, they land on your **real `.tsx`
  source**, not a cryptic generated file. We ship the `src/` folder for exactly this. It's
  a small package-size cost for a big "I can actually see how this works" win.
- **`noEmit: true`** — TypeScript here only *checks* types; it never writes files. A
  separate bundler does the actual building. Two tools, two clearly-separated jobs — easier
  to reason about, and you can swap either independently.

**Current version & what's notable.** **TypeScript 6.0.3.** The 6.0 line is unusual — it's
mostly a *"clean out the attic"* release. It turns long-dead options (ancient module
formats, `ES5` target, etc.) into loud deprecation warnings. Why? Because **TypeScript 7**
is a complete rewrite of the compiler in **Go** (codenamed *tsgo*, available today as a
preview, aiming for roughly **10× faster** type-checking). 6.0 is the bridge that removes
the baggage 7 won't carry. We're on 6.0 deliberately, with a clean modern config, so none
of those deprecations apply to us.

> **Engaging fact.** The TypeScript team chose **Go, not Rust**, for the new compiler — a
> mildly heretical pick in a JS world obsessed with Rust — because Go mapped more cleanly
> onto the existing compiler's design. And `isolatedDeclarations` was co-designed *with*
> the tooling community so that *other* tools could generate types quickly: TypeScript
> shipped a feature mainly for its "competitors" to consume.

**Gotcha.** `isolatedDeclarations` will light your code up red until you've annotated every
exported return type. That's a one-time tax, and it leaves you with cleaner public types.

### React 19 + the React Compiler — performance, automated

**In plain terms.** React 19 is the current React. The **React Compiler** is a build-time
tool that reads your normal component code and *automatically* inserts the performance
optimizations you used to hand-write with `useMemo`, `useCallback`, and `React.memo`.

**Analogy.** It's an optimizing compiler, the way a modern C compiler is. You write the
clear, obvious version of your code; the compiler quietly rewrites it into the fast version.
React developers are starting to stop hand-rolling `useMemo` the way C programmers stopped
hand-writing assembly.

**Why a *library* should ship compiler-optimized output.** This is subtle and important. If
you publish raw, un-optimized components, a consumer only benefits from the compiler if
*they* turn it on. By running the compiler during *our library's* build, the optimizations
are **baked into what we publish** — so **every consumer gets faster components for free**,
even ones who've never heard of the compiler. We get this by setting the compiler's
`target` to `'19'` (our minimum supported React), which uses a runtime that's *built into
React 19* — no extra dependency needed.

**Key idea — "memoization," plainly.** Memoization means "remember a computed value so you
don't redo the work, and don't re-render children when nothing relevant changed." Done by
hand it's fiddly and error-prone (wrong dependency arrays everywhere). The compiler does it
automatically and more granularly than a human would — *but only for code that follows the
Rules of React* (render functions stay pure; you don't mutate props/state mid-render). An
ESLint rule keeps you honest.

**Current version.** **React 19.2.6**, and — the big 2026 milestone — **React Compiler
reached `1.0`** (`babel-plugin-react-compiler@1.0.0`). It graduated from experimental to a
real, stable release.

> **Engaging fact.** React's own guidance has flipped: `useMemo`/`useCallback` are sliding
> from "essential everyday skills" toward "manual overrides for rare edge cases," because
> the compiler now handles the common case better than most people do by hand.

**Gotcha.** The optimization only exists in the *published* output — your source still
looks un-memoized, which is correct. And if you ever lower `target` to support React 17/18,
you must add the `react-compiler-runtime` polyfill as a real dependency, or older-React
consumers crash.

## Package & build

### pnpm 11 — the package manager that won't let you lie

**In plain terms.** pnpm installs your dependencies, but instead of giving every project
its own copy of every package, it stores each package **once** on your whole machine and
*links* to it. Huge disk savings, and — more importantly for us — a *strict* `node_modules`
that keeps you honest.

**Analogy.** npm is a library where every patron photocopies every book (wasteful, and they
can grab books off each other's shelves by accident). pnpm keeps **one master copy** in a
central vault and hands each project a catalog card pointing to it — and you can only read
the books you actually checked out.

**Why it matters for a library — "phantom dependencies."** This is the killer feature for
*library authors*. With npm's flat `node_modules`, you can accidentally `import` a package
you never declared in `package.json` — it happens to be there because some *other*
dependency pulled it in. It works on your machine... then **explodes for your consumers**
who don't have it. That's a *phantom dependency*. pnpm's strict, symlinked layout makes
those imports fail *immediately, on your machine*, so you catch the broken package before
you publish it.

**Two more things we use:**
- **Catalogs** let you define a version *once* (in `pnpm-workspace.yaml`) and reference it
  as `"react": "catalog:"` everywhere. The handful of packages that *must* agree (React,
  TypeScript, Tailwind) can never drift apart, and there's one place to bump them.
- **Corepack + the `packageManager` field** pins the *exact* pnpm version for the repo, so
  every machine and CI runner uses an identical package manager. (We learned the hard way
  that this pin must be an *exact* version — a range breaks it. It's in our `CLAUDE.md`.)

**Current version.** **pnpm 11.3.0.** Recent versions also added supply-chain defenses:
it now refuses to run a dependency's install scripts unless you explicitly allow them, and
can refuse packages published less than N minutes ago (malicious versions are usually
pulled within hours).

> **Engaging fact.** Because identical files are stored exactly once globally and
> hard-linked in, a machine with twenty React projects stores React's bytes *one time*. The
> pnpm project itself refuses to install any package less than 24 hours old, as a
> supply-chain stance.

**Gotcha.** pnpm's strictness will *break* code that secretly relied on phantom deps when
you migrate from npm — that's pnpm doing its job, but it surprises people.

### The Rust toolchain (Rolldown & Oxc) — why everything got fast

**In plain terms.** For a decade, JavaScript's build tools were themselves written *in
JavaScript*. A coordinated effort (led by **VoidZero**, the company Evan You — creator of
Vue and Vite — founded) is rewriting them in **Rust**: **Oxc** (a parser, linter, and
transformer) and **Rolldown** (a bundler). Our build tool, **tsdown**, sits on top of both.

**Analogy.** It's like replacing a translator who only speaks the language they're
translating — and works one page at a time — with one who's natively fluent in a much
faster language and can run many pages in parallel. Same job, an order of magnitude quicker.

**Why Rust is fast here.** JavaScript is single-threaded and pauses for garbage collection.
Rust compiles to native machine code, manages memory without those pauses, and can use *all
your CPU cores at once*. The real trick, though, is architectural: Oxc provides **one shared
parser** that the bundler, the linter, and the type-stripper all reuse — your file gets
parsed *once* and fed to every tool, instead of five tools re-parsing it five times.

**Current versions.** **Rolldown 1.0.2** (a Rust port of Rollup's API, slated to become
Vite's engine), **Oxc** components like `oxlint` (50–100× faster than ESLint). These are
young and moving fast — which is exactly why pinning versions matters.

> **Engaging fact.** Rolldown deliberately *copies Rollup's plugin API* so the huge existing
> plugin ecosystem comes along for free — speed without throwing away a decade of community
> work.

### tsdown — the library bundler

**In plain terms.** A **bundler** reads your entry file, follows every `import` to map out
your code, translates TypeScript/JSX into plain JavaScript, and writes the distributable
files. tsdown is a bundler built specifically for *libraries*, powered by the Rust toolchain
above.

**Analogy.** A book publisher. You hand in a manuscript full of shorthand, margin notes, and
cross-references to other chapters (your TypeScript and JSX). The publisher typesets it into
clean, readable printed copies — and can produce different editions (output formats) from the
one manuscript.

**Why it matters, and the settings that count.** A library bundler's job is different from an
app bundler's. Ours is configured to:

- **Output ESM** (modern modules — see next section), as `.mjs` files.
- **`unbundle: true` — one output file per source file.** Instead of mashing everything into
  one big blob, it mirrors your `src/` structure in `dist/`. This lets a consumer import just
  `Button` without dragging in the whole library, and — crucially — it keeps each component's
  `"use client"` label welded to its own file (more on that two sections down).
- **Externalize React** (`deps.neverBundle`) — "don't copy React into us; the consumer
  already has it." This prevents the infamous "two copies of React" bug that breaks hooks.
- **Generate type files** (`.d.mts`) — fast, via the Rust path, *because* we enabled
  `isolatedDeclarations`. Plus declaration maps for the go-to-source experience.

**Current version.** **tsdown 0.22.0** (still pre-1.0 — pin it). It's positioned as the
modern replacement for `tsup`, and is meant to power Vite's future library mode.

> **Engaging fact.** tsdown can *auto-generate* the `exports` map in your `package.json` —
> historically the single most error-prone part of publishing a package by hand — and run
> the publish-quality inspectors (next section) for you.

**Gotcha.** These tools are young; option names move between versions (we already hit
`external` → `deps.neverBundle`). Trust current docs over old blog posts. Also: the fast
type-generation only kicks in *if* `isolatedDeclarations` is on — otherwise it silently
falls back to the slower path and you wonder where the speed went.

### ESM, the `exports` map, and packaging

**In plain terms.** A *module system* is how code files import each other. There are two:
the old **CommonJS** (`require`) and the modern, standard **ESM** (`import`/`export`). ESM
is statically analyzable, which is what makes tree-shaking and modern tooling work. We go
**ESM-only** — simplest, and both Next.js and Vite are ESM-native.

The **`exports` map** in `package.json` is the part that tells any tool *which file to load*
for a given import, and *under what condition* (types? ESM import? a CSS subpath?).

**Analogy.** The `exports` map is your package's **front-desk receptionist**. A visitor says
"I'm here for the TypeScript types" or "I'm importing the stylesheet," and the receptionist
routes them to the right room (file). Get the directory wrong and visitors end up at a locked
door — the classic "it won't import" bug.

**The details that bite (and why):**
- **Order matters.** Conditions are matched top to bottom; `types` must come before
  `import`; `default` must be last.
- **`.mjs` / `.d.mts` extensions** make the module format *unambiguous* — Node treats `.mjs`
  as ESM with zero guesswork. (We learned to point `exports` at `.mjs`/`.d.mts`, because
  that's what tsdown emits — it's in our `CLAUDE.md`.)
- **`sideEffects` and the CSS exception.** Setting `"sideEffects": false` tells consumers'
  bundlers "nothing here runs just by being imported, so feel free to drop unused parts" —
  that's what unlocks tree-shaking. *But a CSS import is a side effect* — it exists purely to
  register styles. So we list the CSS explicitly (`"sideEffects": ["**/*.css"]`), meaning
  "tree-shake everything *except* the stylesheet." Forget this, and a consumer's bundler can
  silently delete your styles. It's the most common silent-breakage trap for styled
  libraries.
- **`files: ["dist", "src"]`** controls exactly what gets published. We include `src` for
  the go-to-source experience.

> **Engaging fact.** The `exports` map is also an *access-control boundary*: once you define
> it, files you *didn't* list become genuinely unimportable from outside. So it doubles as
> the wall around your public API — `import "your-lib/dist/internal/secret.js"` hard-fails.

### The two inspectors: publint + "Are the Types Wrong?"

**In plain terms.** Two tools that check your *published package* before a stranger does:
- **publint** — "is the package assembled correctly?" Valid `exports`, files that actually
  exist, formats that line up.
- **attw** (*Are the Types Wrong?*) — "do the types resolve correctly and accurately describe
  the runtime JS, under every way a consumer might import it?"

**Analogy.** Two pre-flight inspectors. publint checks the airframe and wiring — does the
plane physically work. attw checks the instruments — do the gauges (types) tell the truth
about the engine (runtime). A plane that flies fine but has a lying altimeter is exactly the
"types don't match reality" bug attw exists to catch.

**Why they matter.** Locally, you import your library through your *own* forgiving setup,
which hides packaging bugs. A *consumer* imports it through *their* setup. These tools
simulate all those outside perspectives, so a misordered `exports` or a drifted type file
gets caught *before* publish instead of in a bug report.

**Current versions.** publint **0.3.21**, attw **0.18.2**. attw was built by a member of the
**TypeScript team** after they found how shockingly many popular packages had subtly-wrong
type setups during the ESM transition — proof that *the experts* consider this hard.

> **A gotcha we hit live.** attw can **choke on a near-empty package** (one that doesn't
> export anything real yet) — it reported an internal error for us on the empty `export {}`
> starter. There was even a recent attw bug (issue #262) where a dependency made packages
> *look* empty. The takeaway: attw becomes meaningful once we actually export the Button; an
> error against an empty stub is "nothing to check," not a real failure. publint already
> passed — our packaging is sound.

## The server/client boundary: `"use client"`

This is the concept most likely to confuse, so we'll go slow.

**In plain terms.** In modern Next.js (the "App Router"), components are **server components
by default**: they render on the server, can talk to a database, and ship *zero JavaScript*
to the browser. They *cannot* use `useState`, effects, or event handlers — there's no
interactivity on a server. To make a component interactive, you put the string
**`"use client"`** at the very top of its file. That marks it (and everything it imports) as
browser code.

**Analogy.** A restaurant kitchen vs. the dining room. The kitchen (server) preps everything
ahead — fast, powerful, hidden, nothing "live." The dining room (client) is where live
interaction happens. `"use client"` is the swinging door with the "beyond this point you're
in the dining room" sign. You hang that sign only on the doors that actually lead to
interactive space — *not* on the front entrance of the whole building.

**Why a component library must care.** If your `<Dropdown>` uses `useState` but its file lacks
`"use client"`, then when a consumer's *server* component imports it, React tries to render it
on the server, hits the hook, and throws. So **every interactive component we ship must carry
`"use client"`** — so consumers can drop it anywhere without thinking. Purely visual
components (no state) stay un-marked and render on the server, a free performance win we hand
our users.

**Two load-bearing rules:**
1. **The label must survive bundling.** `"use client"` is just a string; a careless bundler
   can strip it. If it's missing from what we publish, every Next.js consumer breaks. This is
   the deep reason we use `unbundle: true` (per-file output): each component stays its own
   file, so its `"use client"` stays attached.
2. **It must NOT go on the barrel.** Our `index.ts` re-exports everything. If we put
   `"use client"` there, we'd mark the *entire library* as client code — forcing even
   server-safe components to the browser and killing the performance benefit. So the directive
   lives in the individual interactive files, and the barrel stays clean. (Our CI has a script
   that literally checks this.)

> **Engaging fact.** `"use client"` doesn't mean "render only on the client." The code still
> runs on the server for the initial HTML. It really means "this code also gets *sent to the
> browser* and made interactive there." The name fools almost everyone at first.

For our Vite consumers, by the way, `"use client"` is just a harmless ignored string. We ship
it once; Next.js users need it, Vite users don't care. Everyone's happy.

## Styling & theming

This cluster is the most elegant part of the whole system. The goal: ship **one stylesheet**,
yet let each consumer **repaint it at runtime** (palette + dark mode) with no rebuild and no
copy of Tailwind. Here's how the pieces conspire.

### Tailwind CSS v4 — styling, compiled away

**In plain terms.** Tailwind is a utility-CSS framework: tiny classes like `flex`, `p-4`,
`bg-primary`. Version 4 is a ground-up rewrite where you configure it *in CSS itself* instead
of a JavaScript config file, powered by a Rust engine (Lightning CSS).

**Analogy.** v3 was IKEA furniture with a separate instruction booklet (the JS config) you had
to keep in sync. v4 prints the instructions directly on the wood — config and styles live in
the same place, the same language.

**Why it matters for us.** The key word is **zero-runtime**. Tailwind produces plain CSS at
build time; *nothing* ships to the browser, and **consumers don't need Tailwind installed** —
we hand them one finished `.css` file. The trick that makes it *themeable* is a feature called
`@theme inline`: instead of baking color values directly into the utility classes, it makes
classes point at a *live CSS variable*. So `bg-primary` resolves through a variable a consumer
can reassign at runtime. For collision-safety we scope the compile to our own component source
(`source(none)` + `@source`), ship our classes under a `ui-` namespace, and omit Tailwind's
global Preflight reset — but we deliberately **do not** use Tailwind's `prefix()`, because it
also renames the theme *variables* (`--color-*` → `--tw-color-*`), which would break the very
consumer override contract the theming system depends on.

**Current version.** **Tailwind CSS 4.3.0**, on the Lightning CSS engine — builds up to ~10×
faster than v3.

> **Engaging fact.** v4 registers its CSS variables with real *types* (via the CSS `@property`
> rule), which unlocks things like *animating* a gradient or a custom color — the browser now
> knows a variable is a color and can smoothly interpolate it.

**Gotcha.** Plain `@theme` (without `inline`) bakes values in and *can't* be overridden at
runtime — the opposite of what a themeable library wants. Getting `@theme inline` right is the
single most important styling detail; it's at the top of our risk list.

### Design tokens — the design decisions, as data

**In plain terms.** A *design token* is a named design decision stored as data:
`color.primary = #0066cc`, `space.4 = 16px`. Instead of hard-coding `#0066cc` in 200 places,
everything references the token; change it once, everything updates. There's now a *standard
file format* for tokens (called **DTCG**, from a W3C community group) so they're portable
across tools.

**Analogy.** Tokens are *environment variables for design* — a `.env` file for your visual
language.

**The 3-tier idea (this is the clever bit):**
1. **Primitive** tokens — raw values with no meaning: `blue.500 = #0066cc`.
2. **Semantic** tokens — *purpose*, pointing at primitives: `color.primary → blue.500`,
   `color.surface → gray.50`. **This is the layer consumers override and the layer dark mode
   swaps.**
3. **Component** tokens — narrowest: `button.bg → color.primary`. Optional; for when one
   component needs to vary independently.

> **Engaging fact.** This structure is *why dark mode is almost free*. You don't redefine 50
> component colors — you just re-point the ~10 *semantic* tokens (`surface → gray.900` instead
> of `gray.50`), and every component downstream flips automatically through the reference
> chain.

**Current state.** The DTCG format reached its **first stable release (2025.10)** in late
2025 — a milestone after years of draft status.

### Style Dictionary v5 — the token compiler

**In plain terms.** Style Dictionary reads your token JSON and compiles it into real outputs —
for us, CSS variables (it can also emit iOS/Android/JS, but we only need CSS).

**Analogy.** A printing press, or a transpiler for design: set the type once (tokens), run off
many editions (CSS, and later whatever else).

**Why it matters — one setting is everything: `outputReferences`.** By default, Style
Dictionary *resolves* every reference, so `color.primary` would compile straight to `#0066cc`
— flattening the alias chain and **destroying the override magic**. With
`outputReferences: true`, it keeps the chain as nested CSS variables:

```css
:root {
  --color-blue-500: #0066cc;
  --color-primary:  var(--color-blue-500);
}
```

Now a consumer who overrides `--color-blue-500` (or `--color-primary`) sees it cascade
everywhere, live. **Resolved values are dead; references are themeable.**

**Current version.** **Style Dictionary 5.4.x** — ESM-first, async, and understands the DTCG
format.

**Gotcha.** Forgetting `outputReferences: true` is the classic mistake: your variables quietly
become hard-coded values and runtime overrides mysteriously do nothing.

### Runtime theming — CSS variables, cascade layers, and `:where()`

**In plain terms.** This is the browser-native trio that lets a consumer recolor the library
with no build step: **custom properties** (`--x`, the live values), **cascade layers**
(`@layer`, priority buckets), and **`:where()`** (a zero-specificity selector).

**Analogy.** Custom properties are a building's light switches wired to a central dimmer — flip
the dimmer and every fixture changes. Cascade layers are floors with a fixed priority order.
`:where()` is writing your rules *in pencil* so the consumer's ink always wins.

**Specificity, plainly (the source of "why won't my override work?!").** When two CSS rules
target the same element, the browser picks a winner by *specificity* — roughly, more-specific
selectors (more IDs/classes) beat less-specific ones. Two features defuse the fights:
- **`:where(...)` always counts as zero specificity.** So if our library writes
  `:where(.btn) {…}`, a consumer's plain `.btn {…}` automatically wins — no `!important` needed.
- **Cascade layers sit *below* specificity.** Anything in a layer loses to *unlayered* styles.
  So our whole library can live in a layer, and a consumer's ordinary CSS beats it by default.

> **Engaging fact.** Put together, a consumer's *single untouched line of CSS* can override a
> fully-styled component — the holy grail of "opinionated but not bossy" library CSS, achieved
> with zero `!important`. Dark mode is just re-pointing variables under a `[data-theme="dark"]`
> selector; no second stylesheet.

These features are all mature and broadly supported in every modern browser as of 2026.

### Tokens Studio — the bridge to Figma

**In plain terms.** A Figma plugin that lets designers manage the *same* tokens as data inside
Figma, and **two-way syncs** that JSON with the Git repo. Design and code share one source.

**Analogy.** It's a *Git remote for designers* — Figma becomes a working copy of the same token
files your code compiles from, with push/pull just like a developer's editor.

**Why it matters.** Code stays the source of truth; designers see *exactly* the live token
values components use; and design changes arrive as reviewable Git commits, not screenshots in
Slack. The decades-old "designer picks a color, dev retypes the hex, they drift" problem
becomes a Git diff.

## Component behavior: Radix Primitives

**In plain terms.** Radix is a set of *unstyled, accessible* React building blocks — Dialog,
Dropdown, Tabs, Tooltip, and so on. "Unstyled/headless" means each ships the *behavior and
accessibility* but **zero visual design**. You bring the CSS; Radix brings the brains.

**Analogy.** A car chassis with the engine, steering, and airbags fully engineered and
crash-tested — but no body panels or paint. You bolt on the look; the safety-critical
mechanics are already solved.

**Why you don't reinvent this.** A "simple" dropdown, done correctly, must implement the full
accessibility pattern: arrow-key navigation, type-ahead, Home/End, Escape to close, **focus
trapping** (Tab can't escape an open modal), **focus restoration** (focus returns to the
trigger on close), correct ARIA roles, and screen-reader announcements — across browsers and
assistive technologies. Each is a spec with edge cases. Reinventing it means re-litigating
decades of accessibility standards; Radix encodes the accumulated answers, and we just add
styling.

**Current state.** The ecosystem consolidated into a single `radix-ui` package:
`import { Dialog, Tabs } from 'radix-ui'`. Each piece already carries `"use client"` for us.
(We don't touch Radix until the *second* component, the Dialog — the Button doesn't need it.)

> **Engaging fact.** Radix actively nags you toward correctness: a Dialog will warn if you
> omit its `Title`, because screen-reader users need a name for the dialog.

**Gotcha.** It is *genuinely* unstyled — a fresh Radix Dialog looks like raw HTML until you
write CSS. That surprises people expecting a finished component.

## Docs & testing

### Storybook 10 — the component workshop

**In plain terms.** Storybook is a standalone environment where each component renders in
isolation, in every state ("story"), with live controls to poke its props — plus
auto-generated docs. A workbench, a showroom, and a doc site in one.

**Analogy.** A test kitchen. Instead of firing up the whole restaurant (app) to taste one
sauce, the chef plates each dish alone, under good lighting, and tweaks it live.

**Why it matters for a library.** Your stories *are* your living documentation and your visual
catalog — exactly what an outside consumer needs to evaluate and adopt your components. And —
the modern superpower — that *same* story also becomes your interaction test, your
accessibility test, and your visual-regression snapshot. **Write the example once; five
systems consume it.**

**Current version.** **Storybook 10.** It introduces the **CSF "factory" format** — a more
type-safe way to write stories where TypeScript infers your prop types through the chain — plus
addons we lean on: `addon-a11y` (accessibility audits in the toolbar) and `addon-themes` (a
toolbar toggle to flip light/dark and palettes live, so we can *see* the theming system work).

**Gotcha.** The theme toggle only works if the global CSS is imported in Storybook's preview —
and autodocs are only as good as your TypeScript prop types.

### Vitest + browser mode + Testing Library — testing like a real user

**In plain terms.** Vitest runs the tests. **Browser mode** runs them inside a *real* browser
(via Playwright) instead of a simulated one. Testing Library provides user-centric queries
("find the button labeled Submit"). Together: you test components the way a user actually
experiences them.

**Analogy.** The old simulated DOM (jsdom) is a flight simulator — fast, cheap, approximate.
Browser mode is flying the real plane. Some bugs — real focus, layout, scrolling, pointer
events — only show up in the air.

**Why it matters for us.** Our components run in real browsers, and Radix relies on real focus
traps, portals, and pointer events that a simulated DOM mishandles. For a public library, a
regression that slips through hits *every* consumer — so real-browser confidence is worth it.

**The neat part — stories *are* the tests.** A story can include a `play` function that scripts
a user interaction (click, type) and asserts the result. The Storybook-Vitest integration then
runs *every story as a test* in a headless browser, and the accessibility addon runs an axe
audit on each one as part of the same pass. You don't maintain a separate test suite — the
demos you wrote for docs are the tests.

**Current version.** **Vitest 4.x**, with a dedicated Playwright provider for browser mode.

**Gotcha.** Browser-mode assertions are asynchronous (they auto-retry) — forget an `await` and
you get flaky or falsely-passing tests. And automated a11y catches maybe a third of issues —
it's a floor, not a guarantee; keyboard testing still matters.

### Chromatic + TurboSnap — catching visual changes

**In plain terms.** Chromatic (by the Storybook team) screenshots every story, stores the
approved versions as **baselines**, and on each change re-screenshots and **diffs them
pixel-by-pixel**. Any visual change is flagged for a human to approve (new baseline) or reject
(a regression). **TurboSnap** only re-shoots the stories your change actually affected.

**Analogy.** Automated "spot the difference." Two images of your UI side by side; Chromatic
circles every pixel that moved. TurboSnap is the smart move of only re-photographing the rooms
you renovated.

**Why it's valuable for a UI library.** Visual bugs are invisible to unit tests — a one-line
CSS tweak can shift padding across 40 components and `expect(true).toBe(true)` won't notice.
For a *public* library, an accidental visual change ships to every downstream app. Chromatic
makes each pixel diff an explicit, reviewable decision — visual code review. We're wiring it up
in Milestone 0 *on purpose*, because it's historically a fiddly integration and we'd rather
debug it with one component than forty.

> **Engaging fact.** Unchanged snapshots are billed at a fraction of the cost of new ones, and
> a story that runs both a visual and an a11y check on an unchanged commit is charged once — so
> on a typical "I touched two components" commit, the bill stays tiny.

**Gotcha.** TurboSnap needs full Git history (a one-line CI setting), and non-deterministic UI
(animations, live dates) causes false diffs — you freeze those.

## Quality & release

### Linting, formatting, dead-code: ESLint + Prettier + oxlint + knip

- **ESLint** (current major: **10**, flat-config only) finds *bugs and bad patterns* — misuse
  of React hooks, unsafe types, accessibility issues in JSX. For a library, it's the authority
  on the React-hooks and a11y rules that keep components correct.
- **Prettier** (3.8.x) enforces *formatting* — indentation, quotes, line width — automatically
  and non-negotiably, so the codebase looks uniform and is approachable to contributors.
- **oxlint** (the Rust linter, 50–100× faster) runs as a fast first pass for instant feedback;
  ESLint runs the deeper rules it doesn't cover yet.
- **knip** finds *dead code* — unused files, exports, and dependencies. Especially valuable for
  a library: shipping unused dependencies bloats every consumer's install, and unused exports
  clutter your public API. Lean surface area = a more trustworthy package.

**Analogy.** ESLint is a grammar-and-logic proofreader; Prettier is the typesetter making every
page identical; oxlint is the proofreader on espresso; knip is the editor who deletes
paragraphs nobody reads.

### Changesets + GitHub Actions + npm trusted publishing + provenance

**In plain terms.** The pipeline that turns "merge to main" into "correctly versioned,
changelogged, securely published release" with nobody manually running `npm publish`.

- **Changesets** — each change comes with a tiny markdown note saying what it does and how it
  bumps the version (patch / minor / major).
- **GitHub Actions** — on merge, a robot reads those notes, computes the new version, writes the
  changelog, and publishes.
- **npm trusted publishing (OIDC)** — CI proves its identity to npm with a *short-lived* token
  minted per run. **No long-lived secret token stored anywhere.**
- **Provenance** — a cryptographic attestation recording *which repo, commit, and workflow*
  built this exact package.

**Analogy.** Changesets are sticky notes each contributor leaves ("this is a minor, here's
why"); at release time a robot collects them, decides the version, writes the notes, and ships.
Trusted publishing replaces a permanent house key hidden under the mat (a stored token) with a
one-time keycard issued for a single visit and auto-expired. Provenance is the tamper-evident
shipping seal proving the box came from your factory, untouched.

**Why it matters for consumers.** Provenance lets *anyone* verify a package on npm was built
from a specific public commit by a specific workflow — a real defense against the supply-chain
attacks where a hijacked account publishes malware under a trusted name. And because the token
lives for one run, there's no durable credential to steal — directly answering the wave of npm
token-theft incidents in recent years.

**Current state (2026).** npm trusted publishing is generally available and is the recommended
modern setup: **with it, provenance is automatic and you store no `NPM_TOKEN` at all.** Our
`package.json` already opts into provenance.

> **Engaging fact.** With trusted publishing, the release workflow contains **zero secrets** —
> nothing to rotate, nothing to leak. Security goes *up* while maintenance goes *down*, which
> almost never happens at the same time.

---
---

# Part IV — The Consumer Experience

Step back and look at what all this buys the person who *uses* our library. From their seat,
the entire machine above collapses into four steps:

```bash
# 1. Install
pnpm add @williamphelps13/ui
```
```tsx
// 2. Import the stylesheet once, at the app's root
import '@williamphelps13/ui/styles.css'

// 3. Use components
import { Button } from '@williamphelps13/ui'

export default function Page() {
  return <Button intent="primary">Save</Button>
}
```
```css
/* 4. (Optional) Make it theirs — override a few variables. No rebuild. */
:root {
  --color-primary: oklch(0.55 0.2 280); /* their brand purple */
}
[data-theme="dark"] {
  --color-primary: oklch(0.7 0.18 280);
}
```

That's it. They didn't install Tailwind. They didn't configure a build. They get
autocomplete (our types), correct accessibility (Radix, later), components optimized by the
React Compiler, and — if they're on Next.js — correct server/client behavior automatically.
Everything hard happened *in our pipeline* so it didn't have to happen in theirs. **That
asymmetry — hard for us, effortless for them — is the entire job of a good library.**

---
---

# Part V — The Real Challenges of Living With This (Small Team, Many Projects)

Part I sold you the upside, and it's real. But a shared library is a **commitment**, and
living with one across several projects has genuine friction. Naming these honestly up front
means we *design for them* rather than getting ambushed later. Our stack softens most of
them a lot; a couple are inherent trade-offs of the model — and we'll be straight about
which is which.

The single tension underneath almost all of it: **a library trades local flexibility for
global consistency.** Every challenge below is some version of "App A wants something
slightly different, but the whole point was that everyone shares the same thing."

## 1. The round-trip tax — publishing just to change one prop

**The pain.** You're deep in App A and realize the `Button` needs a `loading` prop. In a
single app that's a two-minute edit. With a library it becomes a *ritual*: switch to the
library repo → make the change → version it → publish → switch back to App A → bump the
dependency → re-test. A trivial change sprawls across two repos and a publish boundary. Do
this ten times a day and it grates.

**How we soften it — a tiered inner loop.** You don't pay the full ritual every time:
- **Fast (local dev):** `pnpm pack` builds the real tarball and you install *that* in the
  app — byte-identical to what npm would serve, but with no registry round-trip. Or, for
  truly live editing, a `pnpm link`/workspace so library changes appear in the app
  instantly (the catch: link bypasses the real packaging, so it's for *coding*, not for
  *validating the published shape*).
- **Integration:** publish a **canary** version (a `0.x` under a `canary` dist-tag, later
  per-PR previews) so the app can try the change against a *real* install before it's
  blessed as stable.
- **Release:** the full Changesets publish — the authoritative loop, the one we hand to the
  team.

Hardening exactly this loop — and writing it down in `docs/workflow.md` — is the entire
point of Milestone 0.

**The honest residual.** There's always *some* tax; the separation that gives you "one
source of truth" is the same separation that adds a publish boundary. The skill is matching
the loop tier to the moment, not eliminating the boundary.

## 2. Generic vs. tailored — the Swiss-army-knife trap

**The pain.** App A wants an icon in the Button. App B wants a count badge. App C wants a
one-off "ghost danger" style. Say yes to everything and the Button grows 40 props and an
unreadable implementation; say no and apps quietly fork their own — and the drift you built
the library to kill comes right back.

**How we soften it — composition over configuration, plus escape hatches.**
- **Slots / `children` / `asChild`** (a Radix pattern) let consumers *compose* what they
  need — drop an icon in as a child — instead of you adding a prop for every wish.
- **A small, deliberate variant system** (`intent`, `size`) covers the common axes; the
  long tail gets **escape hatches**: a `className` passthrough (safe because of our
  zero-specificity theming), `style`, or a slot.
- **The "library vs. app" line.** App-specific flourishes belong *in the app* — wrap our
  generic `Button` in the app's own `AppButton`. The library stays general; the app keeps
  its quirks. Knowing where that line goes is a judgment call we'll codify in the
  conventions doc from the bake-off.

**The honest residual.** "Does this belong in the library or the app?" is a recurring
decision with no universal answer. The guardrail is a bias toward *generic core + cheap
escape hatches*, and resisting one-off props that serve a single app.

## 3. One component, many look-and-feels

**The pain.** App A is a playful marketing site (rounded, colorful); App B is a dense
internal dashboard (compact, neutral). Same `Button`, two genuinely different desired
appearances — and you don't want two Buttons.

**How we soften it — this is exactly what the token system is for.** Each app overrides the
**semantic tokens** (palette, radius, spacing) via CSS variables; dark mode comes free; no
rebuild, no fork. For larger brand differences, multiple theme/token sets. The look lives in
*data the consumer controls*, not in the component's code.

**The honest residual.** The theming system only flexes along the axes you *designed it to*.
Expose too few semantic tokens and apps can't customize enough; expose too many and your
"public contract" (the tokens you can never rename without a breaking change) balloons.
Choosing that surface is real design work — it's why the semantic tier is treated as
carefully as a code API. And when an app needs a *structurally* different component (not just
a different skin), theming won't save you — that's a composition or app-level job.

## 4. Keeping N apps in versioned sync

**The pain.** You ship `Button` v2 with a breaking change. App A updates that afternoon, App
B stays on v1 for three months, App C pinned an old version and forgot. Now multiple versions
live in the wild, and a bugfix might need backporting to a line you'd rather forget.

**How we soften it.** **Semver discipline** (breaking changes = a major bump, and rare),
**Changesets** for clear, automatic changelogs so consumers know exactly what changed, and a
strong bias toward **additive, non-breaking evolution** — a new *optional* prop never breaks
anyone. Being a *small* team is an advantage here: you control all the consumers, so you can
actually coordinate an upgrade rather than negotiate with strangers.

**The honest residual.** Every breaking change costs migration effort *times the number of
consuming apps*. That math is a permanent incentive to evolve additively and to think hard
before changing a public API (prop names, token names) you've already shipped.

## 5. "Whose bug is it?" — debugging across a boundary

**The pain.** A glitch shows up in App A. Is it the app's *usage* of the Button, or the
Button itself? Now you're bisecting across two codebases with a published package in between
— harder than chasing a bug in one repo.

**How we soften it.** **Go-to-source** (declaration maps + the shipped `src/`) lets you
cmd-click from the app straight into the library's *real* source, not a black-box `.d.ts`.
And **Storybook** reproduces the component in isolation: if it's broken in Storybook, it's
the library; if it only breaks in the app, it's the integration. That isolation usually
answers "whose bug?" in seconds.

**The honest residual.** Cross-repo debugging is inherently more friction than single-repo;
the tools shrink it, they don't erase it.

## 6. The maintenance tax on a small team

**The pain.** The library is infrastructure *everyone* leans on but *nobody* is full-time
on. Dependency bumps, breaking changes upstream (React, Radix, the fast-moving Rust tools),
security patches, CI upkeep — steady work that competes with shipping features.

**How we soften it.** Heavy **automation** (Changesets, CI gates, and later
Renovate/Dependabot for dependency PRs), **ruthless scope** (the spec's YAGNI discipline —
we add only what we need), a **lean toolchain**, and **good docs** (this file, `CLAUDE.md`,
the conventions doc) so *anyone* can pick it up cold instead of it being one person's secret.

**The honest residual.** A shared library is a long-term commitment. Budget for upkeep; a
library nobody maintains slowly becomes a liability everyone routes around.

## 7. Adoption — a library only helps if people actually reach for it

**The pain.** All this effort is wasted if a teammate, not knowing the `Button` exists or
unsure how to theme it, just builds their own. Then you have the library *and* the drift.

**How we soften it.** **Storybook is the living catalog** — a browsable showroom of every
component and state, with auto-generated prop docs — plus this overview and clear naming, so
"is there already one of these?" is easy to answer.

**The honest residual.** Adoption is partly cultural; tooling lowers the barrier but
can't force the habit. The best lever is making the shared version genuinely *nicer to use*
than rolling your own.

## The throughline

Notice the pattern: nearly every fix is a **cheap, safe escape hatch** bolted onto a
**generic, stable core** — tokens for looks, composition for structure, a fast preview loop
for iteration, app-level wrappers for one-offs. Get those escape hatches right and "reach
for the shared component" becomes the path of least resistance. Get them wrong and people
route around the library — which is the one failure mode that undoes the entire point.

---
---

# Part VI — Putting It All Together

Here's the whole thing as one story, start to finish:

1. A **design token** changes — say, the brand's primary blue — in Figma (via **Tokens
   Studio**) or directly in the repo's JSON. It lands as a reviewable Git commit.
2. **Style Dictionary** compiles the tokens into **CSS variables**, keeping the alias chain
   intact (`outputReferences`), so overrides will cascade.
3. **Tailwind v4** turns our utility classes into one **precompiled stylesheet**, with
   classes pointing at those live variables (`@theme inline`), source-scoped to our components
   and `ui-`namespaced (not Tailwind's `prefix()`, which would rename the theme vars), and
   layered so consumers can override without `!important`.
4. We write a component in **TypeScript** + React. The **React Compiler** auto-optimizes it.
   If it's interactive, it gets a `"use client"` label.
5. **tsdown** (on the Rust toolchain) bundles it to per-file ESM, externalizes React, and
   generates fast, accurate type files with go-to-source maps.
6. A single **Storybook story** documents the component — and *that same story* runs as an
   **interaction test** and **accessibility audit** in a real browser via **Vitest**, and as
   a **visual snapshot** in **Chromatic**.
7. **publint** and **attw** inspect the assembled package; **knip** confirms nothing's dead;
   **ESLint/Prettier/oxlint** keep it clean.
8. **Changesets + GitHub Actions** version it, write the changelog, and **publish it to npm
   with provenance and zero stored secrets**.
9. A consumer runs `pnpm add`, imports one stylesheet, and overrides a few variables to make
   it their own — in Next.js or Vite, light or dark, no rebuild.

The recurring theme worth remembering: **a single story feeds five quality systems**, and
**a single token feeds the entire visual system**. The modern stack is less a pile of tools
than a set of *convergences* — write a thing once, and many systems benefit.

---
---

# Part VII — Glossary

Quick, plain definitions for the jargon. Skim, or come back when a term trips you.

- **Accessibility (a11y)** — making UI usable by everyone, including keyboard-only and
  screen-reader users. Often abbreviated "a11y" (a, 11 letters, y).
- **Alias / reference (tokens)** — a token that points at another token (`primary → blue.500`)
  instead of holding a raw value.
- **AST (Abstract Syntax Tree)** — a structured, tree representation of your code that tools
  parse it into so they can analyze or transform it.
- **attw** — "Are the Types Wrong?", a checker that verifies your published type files resolve
  correctly for consumers.
- **Barrel file** — an `index` file that re-exports many modules so consumers import from one
  place.
- **Baseline (visual testing)** — the approved "correct" screenshot a new screenshot is
  compared against.
- **Bundler** — a tool that follows your imports, translates your code, and writes the
  distributable output files (ours is tsdown).
- **Cascade layer (`@layer`)** — a CSS priority bucket; styles in a layer lose to unlayered
  styles regardless of specificity.
- **CommonJS (CJS)** — the old Node module system (`require`/`module.exports`).
- **Corepack** — a tool bundled with Node that runs the exact package-manager version your repo
  declares.
- **CSF (Component Story Format)** — Storybook's format for writing stories as module exports.
- **Custom property / CSS variable** — a live, runtime value in CSS (`--color-primary`) that
  cascades and can be overridden.
- **Declaration file (`.d.ts` / `.d.mts`)** — the type-only "header" file consumers' editors
  read; describes your API without the implementation.
- **Declaration map (`.d.ts.map`)** — a breadcrumb file that lets "Go to Definition" jump to
  your real source.
- **Design token** — a named design decision stored as data (`color.primary = #0066cc`).
- **DTCG** — the W3C community-group standard JSON format for design tokens.
- **ESM (ECMAScript Modules)** — the modern, standard module system (`import`/`export`).
- **Externalize** — deliberately *not* bundling a dependency, expecting the consumer to provide
  it (e.g., React).
- **Flat config** — ESLint's modern array-based config format (`eslint.config.js`).
- **Headless / unstyled component** — ships behavior and accessibility but no visual styling
  (e.g., Radix).
- **Hydration** — the browser "waking up" server-rendered HTML by attaching the JavaScript that
  makes it interactive.
- **`isolatedDeclarations`** — a TypeScript setting requiring explicit export types, enabling
  fast parallel type-file generation.
- **jsdom** — a simulated DOM that runs in Node; fast but approximate compared to a real
  browser.
- **knip** — a tool that finds unused files, exports, and dependencies (dead code).
- **Lockfile** — the file (`pnpm-lock.yaml`) recording the exact resolved dependency versions,
  for reproducible installs.
- **Memoization** — caching a computed value so it isn't recomputed and doesn't trigger needless
  re-renders.
- **Module resolution** — the algorithm a tool uses to figure out which file an `import` points
  to.
- **OIDC (OpenID Connect)** — the standard behind "trusted publishing"; lets CI prove its
  identity with short-lived tokens.
- **Peer dependency** — a dependency the *consumer* must provide and share (so there's one copy),
  rather than one you bundle (e.g., React).
- **Phantom dependency** — a package you use but never declared; works locally with npm, breaks
  for consumers. pnpm prevents it.
- **Portal** — rendering UI elsewhere in the DOM (e.g., at `<body>`) so overlays escape clipping
  and stacking traps.
- **Primitive (tokens)** — a raw token value with no semantic meaning (`blue.500`).
- **Provenance** — a signed record proving which repo/commit/workflow built a published package.
- **publint** — a checker for package *packaging* correctness (exports, files, formats).
- **React Server Components (RSC)** — React components that render on the server and ship no JS
  by default; the Next.js App Router model.
- **Rolldown** — a Rust bundler (Rollup-compatible) underneath tsdown.
- **Semantic token** — an intent-based token (`color.primary`) that points at a primitive; the
  override/dark-mode layer.
- **Semver (semantic versioning)** — the `MAJOR.MINOR.PATCH` versioning scheme: patch = fix,
  minor = compatible feature, major = breaking change.
- **`sideEffects`** — a `package.json` flag telling bundlers what's safe to tree-shake (with a
  CSS exception).
- **Specificity** — how CSS decides which competing rule wins; more-specific selectors beat
  less-specific ones.
- **Story** — a single rendered example of a component in a particular state, in Storybook.
- **Tree-shaking** — dead-code elimination; dropping exports a consumer doesn't use.
- **TurboSnap** — Chromatic's optimization that only re-screenshots stories affected by a change.
- **`"use client"`** — the directive marking a file as interactive/browser code in the RSC model.
- **`@theme inline`** — the Tailwind v4 feature that makes utilities point at live CSS variables
  (so they're overridable at runtime).
- **`:where()`** — a CSS selector wrapper with zero specificity, used so consumer styles win
  easily.

---
---

# Part VII — Where We Are & What's Next

## Right now: Phase 3 — Styling + Storybook + visual-regression harness (in progress)

On the `milestone-0` branch:

- ✅ **Phase 1 — Foundation:** packaged ESM build (TypeScript 6.0.3 + the React Compiler →
  `.mjs`/`.d.mts` + source maps, React externalized, `es2022`); ESLint/Prettier/knip/cspell;
  CI skeleton; `publint` valid.
- ✅ **Phase 2 — Token slice:** code-first DTCG tokens → Style Dictionary v5 → `:root` /
  `[data-theme="dark"]` CSS variables + a Tailwind `@theme inline` artifact (single-file
  Tokens Studio layout, chosen for *free* Figma sync).
- ⏳ **Phase 3 (here):** Tailwind v4 compiled to a *controlled* precompiled `dist/styles.css`
  — source-scoped to our components (no doc-scraped classes), global Preflight omitted, our
  classes `ui-`namespaced, the consumer override contract intact. Next: Storybook 10, Vitest
  browser tests, Chromatic — then the **Button itself** (Phase 4).

## The road through Milestone 0

1. **Foundation** — repo, package, build, lint, CI *(here)*.
2. **Token slice** — the Button's tokens through Style Dictionary into CSS variables.
3. **Styling + Storybook + visual-regression harness** — Tailwind output, Storybook 10,
   Vitest browser tests, Chromatic.
4. **Button** — the real component, with stories + interaction + a11y tests.
5. **Workflow loop** — first real publish, consume it in a Next.js app, run the
   change→publish→update loop until smooth.
6. **Bake-off** — your Button vs. ours; lock the canonical pattern.
7. *(Gated)* **Scale** — the rest of the components, plus the heavier "many components" tooling.

## Lessons already banked (in `CLAUDE.md`)

We've been turning every wrong turn into a permanent, curated lesson — only the ones that are
likely to recur, cost real time, and *aren't* obvious from the error message:

- **Corepack version pins must be exact** — a `^range` breaks every pnpm command, including
  the one you'd use to check the version (a real bootstrap trap).
- **The build needs Node ≥ 24.11.1** — older Node 24 fails to load the config with a
  *misleading* "Node bug / Unexpected module status 3" error.
- **A couple of bundler-output details** — tsdown emits `.mjs`/`.d.mts` (so `exports` must
  match), and it infers its build target from `engines.node` unless you set it explicitly.

And the freshest one, which closes out a real head-scratcher: **`attw` can error on a
near-empty package** — what looked like a failure was just "nothing to check yet." It'll
become a meaningful gate once the Button exports real types.

---

*That's the whole tour. The short version: we're building one well-made Button through every
layer of a modern, mostly-Rust-powered, design-token-driven, RSC-aware publishing pipeline —
so that by the time we make the other eleven components, the hard parts are already solved and
boring. Onward.*
