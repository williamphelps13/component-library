# CLAUDE.md — @williamphelps13/ui

Working notes for humans and AI agents. Keep it short; link out for depth.

## What this is

A versioned, public React component library (`@williamphelps13/ui`).
- Design spec: `docs/superpowers/specs/2026-05-17-component-library-design.md`
- Milestone-0 plan: `docs/superpowers/plans/2026-05-17-component-library-milestone-0.md`

## How we work (Teaching Mode — spec §5)

- The **owner runs every CLI/setup command**. Agents provide the exact command + explain (Concept / Why / Tradeoffs) but do **not** execute it.
- Agents author code/config and walk through it. Each phase ends with a **quiz gate**; command failures are **guided debugging** (investigate root cause, no reflex fixes).

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

## Gotchas & hard-won lessons

> **Practice — log ruthlessly.** Add a line here ONLY if all three hold: (1) likely to recur, (2) it cost real time because the symptom was cryptic or *silent* (no error), and (3) the tooling won't clearly catch it next time. If the raw error already states the fix, don't log it. This file loads every session — keep it short.

- **Corepack pins must be EXACT.** A `^range` in `packageManager` breaks *every* pnpm/npx command in the repo — including `pnpm -v` itself (bootstrap trap). Use `"packageManager": "pnpm@11.1.2"`.
- **tsdown needs Node ≥ 24.11.1.** On older Node 24, loading `tsdown.config.ts` fails with the misleading `Unexpected module status 3` ("known Node.js bug"). Fix = upgrade Node (not the `--config-loader tsx` workaround); `engines.node` enforces the floor.
- **tsdown infers JS `target` from `engines.node`** — *silent*, no tool catches it. Set `target` explicitly (`'es2022'`) so a browser/React lib isn't built Node-targeted.
- **tsdown emits `.mjs` / `.d.mts`.** Point `package.json` `exports` (and path-reading scripts) at those, not `.js`/`.d.ts`.
