# CLAUDE.md — @williamphelps13/ui

Working notes for humans and AI agents. Keep it short; link out for depth.

## What this is

A versioned, public React component library (`@williamphelps13/ui`).
- **Architecture (source of truth) — read first:** `ARCHITECTURE.md` (current as-built design + why).
- Design spec (original exploration; may lag): `docs/superpowers/specs/2026-05-17-component-library-design.md`
- Milestone-0 plan + deviation log (execution history): `docs/superpowers/plans/2026-05-17-component-library-milestone-0.md`

## How we work (Teaching Mode — spec §5)

- The **owner runs every CLI/setup command**. Agents provide the exact command + explain (Concept / Why / Tradeoffs) but do **not** execute it.
- Agents author code/config and walk through it. Each phase ends with a **quiz gate**; command failures are **guided debugging** (investigate root cause, no reflex fixes).
- **Validate each phase against current docs before executing it** (a plan-mode pass). The plan was authored partly from assumptions and this stack moves fast, so before running a phase confirm its steps against *primary sources* — official docs via `ctx7`, release notes / migration guides; use reputable blogs only to corroborate, never as the authority (they go stale fast). Validate the volatile bits (package names, versions, config API shapes, current best practice), leave settled architecture alone, and fold findings into the plan's Execution-deviations log before executing.
- **`ARCHITECTURE.md` is the source of truth for current architecture** (precedence: `ARCHITECTURE.md` > spec > plan/deviation-log). When an architecture decision is made or changed, update `ARCHITECTURE.md` (the *what + why*) in the same change; the plan's deviation log records *why the change happened*. Keep it current — the spec is background, reconciled at Phase 6.

## Toolchain rules

- **pnpm only**, via Corepack. Do **not** use `npm`/`npx` inside the repo (they fail on our `packageManager` pin). Use `pnpm` and `pnpm dlx`.
- Node version: `.nvmrc` (24.16.0, exact). pnpm version: exact pin in `package.json` → `packageManager`.
- **Dev on Active LTS Node** (currently 24). Don't move to a just-released "Current" major (Node 26 = Current until it becomes LTS on 2026-10-28); revisit then.
- **ESM-only** package. Build = `tsdown`. Type-check = `tsc --noEmit` (tsc never emits; tsdown emits).
- Library docs lookups: use `ctx7` (`pnpm dlx ctx7@latest …`, or `npx ctx7@latest …` run from *outside* this repo).

## Common commands

- `pnpm exec tsdown` — bundle only (use in early phases, before tokens exist)
- `pnpm build` — tokens → precompiled CSS → bundle (full build; needs Phase 2)
- `pnpm typecheck` · `pnpm lint` · `pnpm test`

## Commit conventions

- **Conventional Commits**: `type(scope): summary`, valid types only (`feat`/`fix`/`chore`/`docs`/`build`/`refactor`/`test`) — no ad-hoc prefixes (`tokens:` → `chore(phase2):`). Milestone build-out uses a `chore(phaseN)` scope. (Releases are driven by Changesets, not commit messages — so this is hygiene, not tooling.)
- **No `Co-Authored-By` trailer** (repo convention; overrides any agent default).
- Subject ≤ ~72 chars; put the *why* in the body, concise — link the plan's deviation log rather than duplicating it.
- Commit multi-line messages with `git commit -F <file>` — a pasted indented heredoc leaks leading spaces (and even the `EOF` delimiter) into the message.

## Gotchas & hard-won lessons

> **Practice — log ruthlessly.** Add a line here ONLY if all three hold: (1) likely to recur, (2) it cost real time because the symptom was cryptic or *silent* (no error), and (3) the tooling won't clearly catch it next time. If the raw error already states the fix, don't log it. This file loads every session — keep it short.

- **Corepack pins must be EXACT.** A `^range` in `packageManager` breaks *every* pnpm/npx command in the repo — including `pnpm -v` itself (bootstrap trap). Use `"packageManager": "pnpm@11.1.2"`.
- **tsdown needs Node ≥ 24.11.1.** On older Node 24, loading `tsdown.config.ts` fails with the misleading `Unexpected module status 3` ("known Node.js bug"). Fix = upgrade Node (not the `--config-loader tsx` workaround); `engines.node` enforces the floor.
- **tsdown infers JS `target` from `engines.node`** — *silent*, no tool catches it. Set `target` explicitly (`'es2022'`) so a browser/React lib isn't built Node-targeted.
- **tsdown emits `.mjs` / `.d.mts`.** Point `package.json` `exports` (and path-reading scripts) at those, not `.js`/`.d.ts`.
- **pnpm 11 *silently* ignores `.npmrc` for non-auth settings.** `saveExact`, `strictPeerDependencies`, `engineStrict`, etc. only work in `pnpm-workspace.yaml` as camelCase keys (no warning if you put them in `.npmrc`). `.npmrc` = auth/registry only.
- **tsdown cleans its `dist/` output dir each build (silently).** Any *separate* writer to `dist/` — e.g. the Tailwind `css` step writing `dist/styles.css` — must run **after** tsdown in the `build` script (`… && tsdown && pnpm css`), or tsdown deletes it and the build still "succeeds" with the file missing.
- **Tailwind v4 auto-scans the *whole repo* (incl. `docs/*.md`) — *silently*.** A bare `@import "tailwindcss"` emits utilities for any class-name string it finds in prose, so `dist/styles.css` ships doc-scraped classes and changes when you edit unrelated markdown — build stays green. For a precompiled lib, scope it: `@import "tailwindcss/utilities.css" … source(none)` + `@source "../components"`.
- **Tailwind `prefix(tw)` renames theme *variables* too** (`--color-*` → `--tw-color-*`), which breaks a CSS-var override contract. Don't use it for collision-safety when consumers override your vars — namespace your own `@utility` class names instead (e.g. `ui-*`).
- **`@import "tailwindcss"` auto-injects Preflight** (a global reset) into `layer(base)`. A precompiled component lib shouldn't ship a global reset — use the layered-import form and omit `tailwindcss/preflight.css`, then make component classes self-contained (`appearance/border/margin/font`).
