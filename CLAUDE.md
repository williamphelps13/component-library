# CLAUDE.md — @williamphelps13/ui

Working notes for humans and AI agents. Keep it short; link out for depth.

## What this is

A versioned, public React component library (`@williamphelps13/ui`). See [`ARCHITECTURE.md`](./ARCHITECTURE.md) § "See Also" for the doc landscape.

## How we work (Teaching Mode)

Teaching Mode is the default but per-feature switchable. The owner can explicitly drop it when speed matters more than pedagogy. When off, the agent runs commands directly. When the owner hasn't said either way, assume Teaching Mode is on.

- The owner runs every CLI and setup command. Agents provide the exact command and explain (concept, why, tradeoffs) but do not execute it.
- Agents author code and config and walk through it. Each phase ends with a quiz gate; command failures are guided debugging (investigate root cause, no reflex fixes).
- Validate each phase against current docs before executing it (a plan-mode pass). The plan was authored partly from assumptions and this stack moves fast, so before running a phase confirm its steps against primary sources — official docs via `ctx7`, release notes, migration guides; use reputable blogs only to corroborate, never as the authority (they go stale fast). Validate the volatile bits (package names, versions, config API shapes, current best practice), leave settled architecture alone, and fold findings into the plan's Execution deviations log before executing.
- `ARCHITECTURE.md` is the source of truth for current architecture (precedence: `ARCHITECTURE.md` > spec > plan and deviation log). When an architecture decision is made or changed, update `ARCHITECTURE.md` (the what and why) in the same change; the plan's deviation log records why the change happened. Keep it current — the spec is background.
- Don't defer foundational decisions — "addable later" is not a reason to skip. Across agent handoffs there is no guaranteed trigger: "we'll add it later" almost always evaporates with the next agent (who lacks this context). So decide and lay foundations now, or capture them as a concrete task with a named trigger in the plan or `ARCHITECTURE.md` — never a vibe. Reversibility lowers the cost of a wrong call; it is not license to defer. (Defer only when genuinely uncertain or blocked — and write it down.) Foundational infra has value when laid, not when the walls arrive.
- Verify component props via the Storybook MCP — never hallucinate. Full operational details in §"Storybook MCP" below.
- Review checkpoint before each phase or major-task commit: dispatch an independent code-review subagent (`superpowers:requesting-code-review`) on the diff vs `ARCHITECTURE.md` and the plan; fix Critical and Important findings before committing. Self-review misses things — reviewer subagents have caught a red `pnpm lint` the author missed, and an a11y gate that was silently a no-op because the analogous fix for one Storybook addon hadn't been applied to a sibling.
- One source for current state; reconcile docs before each commit. The deviation log is the canonical record of what's actually happened; `ARCHITECTURE.md`'s status line is the one-glance summary. Don't duplicate "where we are" content elsewhere (parallel status text in a separate doc has historically lagged real status by multiple phases). Before committing, do a 2-minute pass on every long-lived doc (`ARCHITECTURE`, `CLAUDE`, `AGENTS`, deviation log) and confirm nothing in it now contradicts the diff's outcome. The reviewer subagent above catches code drift; this pass catches doc drift.

## Documentation

Three docs persist long-term: README.md, CLAUDE.md, ARCHITECTURE.md.

### Core principles

- Documentation is easy to maintain, easy to visually parse, easy to update
- Don't repeat concepts within a document or across documents
- Act like content is user-facing — apply [Material Design 3 writing guidelines](https://m3.material.io/foundations/content-design/style) (sentence case, no periods on fragmentary list items, plain language, active voice)

### Rules

1. Use bolding sparingly
2. Use italics sparingly
3. Use semantic headings
4. Don't number top-level sections
5. Don't include details that will become outdated (plan phases, current PR numbers, specific commit SHAs) in persistent docs
6. Bulleted lists over packed inline sentences — use judgement; don't bullet narrative prose
7. No blockquote
8. Don't restate diagrams in prose
9. Prefer plain English — no awkward shorthand (`+` for `and`) and no casual jargon (`baking`, `load-bearing`, `dogfood`, `first-class`)
10. Trim phrases that don't carry weight

### Per-file ownership

- ARCHITECTURE.md — what the architecture is, why each decision was made, status line, file and module map
- CLAUDE.md — how we work, operational rules, gotchas, commit discipline, documentation principles (this section)
- README.md — consumer-facing view (install, usage, override contract); pointers to the other two

### Update protocol

When touching any of the three persisting docs, re-read the other two end-to-end before committing. Drift hides in lines you don't think to look at — the reviewer subagent catches code drift; this re-read catches doc drift.

## Toolchain rules

- pnpm only, via Corepack. Do not use `npm` or `npx` inside the repo (they fail on our `packageManager` pin). Use `pnpm` and `pnpm dlx`.
- Node version: `.nvmrc` (24.16.0, exact). pnpm version: exact pin in `package.json` → `packageManager`.
- Dev on Active LTS Node (currently 24). Don't move to a just-released "Current" major (Node 26 = Current until it becomes LTS on 2026-10-28); revisit then.
- ESM-only package. Build via `tsdown`. Type-check via `tsc --noEmit` (tsc never emits; tsdown emits).
- Library docs lookups: use `ctx7` (`pnpm dlx ctx7@latest …`, or `npx ctx7@latest …` run from outside this repo).
- Storybook and Vitest deps ride `^` ranges pinned by `pnpm-lock.yaml` (not exact-pinned — the lockfile is the reproducibility mechanism). CSF Next (the story format) is experimental, so after any `pnpm update` that bumps Storybook, re-run `pnpm storybook` and `pnpm test` to catch API drift before trusting it.

## Common commands

- `pnpm build` — full pipeline: tokens, bundle, precompiled CSS
- `pnpm exec tsdown` — bundle only (skips tokens and CSS)
- `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm chromatic` — gates

## Storybook MCP (verify component APIs — never hallucinate)

The repo runs `@storybook/addon-mcp` — a live HTTP MCP server at `http://localhost:6006/mcp` while `pnpm storybook` is running (wired for Claude Code in `.mcp.json`; other agents add an HTTP MCP server pointing at that URL).

Before using any prop on a component — even common-sounding ones (`variant`, `size`, `shadow`, …) — confirm it is documented. Do not infer props from naming conventions or other libraries. A story's export name may not match a prop name; verify through the documentation tools, not the labels. If a prop isn't documented, ask the user instead of inventing it.

Tools the server provides:

- `list-all-documentation` — every component
- `get-documentation` and `get-documentation-for-story` — a component's real props and examples
- `get-storybook-story-instructions` — current conventions, before writing or updating a `.stories.*`
- `run-story-tests` — verify your changes
- `preview-stories` — preview URLs (include them in your reply so the user can open them)

Fresh-checkout note: `pnpm storybook` imports the precompiled `dist/styles.css` — on a fresh clone, run `pnpm build` first or the preview fails to resolve the import.

When adding a Storybook addon: if its default export is a `definePreviewAddon(...)` factory, register `addonX()` in `.storybook/preview.tsx`'s `definePreview({ addons: [...] })` array in addition to listing it in `.storybook/main.ts addons`. Without the preview-side registration, the addon's wiring (globalTypes registration, URL or channel global propagation, parameter handlers, axe runner) silently no-ops — tests, typecheck, and lint stay green because none assert the addon did its job. Exception: `@storybook/addon-vitest` is intentionally not in `definePreview.addons` — its module imports `vitest` at load time (only resolvable inside the vitest run context); the integration is wired through `storybookTest()` in `vitest.config.ts` instead.

## Commit conventions

- **Ask before committing.** Don't run `git commit` (or `--amend`, or a history-rewriting `rebase`) without explicit in-conversation approval. Surface the staged diff or status and proposed commit message; wait for a clear "yes" (or edits) before the commit. An approved commit also covers the immediate `git push origin <feature-branch>` that follows — no second ask. Force-pushes and any push to `main` need their own confirmation.
- Conventional Commits: `type(scope): summary`. Valid types: `feat`, `fix`, `chore`, `docs`, `build`, `refactor`, `test`. No ad-hoc prefixes (`tokens:` → `chore(phase2):`). Milestone build-out uses a `chore(phaseN)` scope. (Releases are driven by Changesets, not commit messages — so this is hygiene, not tooling.)
- No `Co-Authored-By` trailer (repo convention; overrides any agent default).
- Subject ≤ ~72 chars; put the why in the body, concise — link the plan's deviation log rather than duplicating it.
- Commit multi-line messages with `git commit -F <file>` — a pasted indented heredoc leaks leading spaces (and even the `EOF` delimiter) into the message.
- A `chore(phaseN)` commit that completes phase work must bump `ARCHITECTURE.md`'s status line and update the deviation log's pending list in the same commit. Skipping this is exactly how status went stale across agent handoffs in early phases. If the phase moved, the status moves with it.

## Gotchas and hard-won lessons

Log ruthlessly. Add a line here only if all three hold: (1) likely to recur, (2) it cost real time because the symptom was cryptic or silent (no error), and (3) the tooling won't clearly catch it next time. If the raw error already states the fix, don't log it. This file loads every session — keep it short.

- Corepack pins must be exact. A `^range` in `packageManager` breaks every pnpm or npx command in the repo — including `pnpm -v` itself (bootstrap trap). Use `"packageManager": "pnpm@11.1.2"`.
- tsdown needs Node ≥ 24.11.1. On older Node 24, loading `tsdown.config.ts` fails with the misleading `Unexpected module status 3` ("known Node.js bug"). Fix: upgrade Node (not the `--config-loader tsx` workaround); `engines.node` enforces the floor.
- tsdown infers JS `target` from `engines.node` silently, no tool catches it. Set `target` explicitly (`'es2022'`) so a browser or React lib isn't built Node-targeted.
- tsdown emits `.mjs` and `.d.mts`. Point `package.json` `exports` (and path-reading scripts) at those, not `.js` or `.d.ts`.
- pnpm 11 silently ignores `.npmrc` for non-auth settings. `saveExact`, `strictPeerDependencies`, `engineStrict`, etc. only work in `pnpm-workspace.yaml` as camelCase keys (no warning if you put them in `.npmrc`). `.npmrc` is for auth and registry only.
- tsdown cleans its `dist/` output dir each build silently. Any separate writer to `dist/` — for example the Tailwind `css` step writing `dist/styles.css` — must run after tsdown in the `build` script (`… && tsdown && pnpm css`), or tsdown deletes it and the build still "succeeds" with the file missing.
- Tailwind v4 auto-scans the whole repo (including `docs/*.md`) silently. A bare `@import "tailwindcss"` emits utilities for any class-name string it finds in prose, so `dist/styles.css` ships doc-scraped classes and changes when you edit unrelated markdown — build stays green. For a precompiled lib, scope it: `@import "tailwindcss/utilities.css" … source(none)` and `@source "../components"`.
- Tailwind `prefix(tw)` renames theme variables too (`--color-*` → `--tw-color-*`), which breaks the CSS-var override contract. Don't use it for collision-safety when consumers override your vars — namespace your own `@utility` class names instead (for example `ui-*`).
- `@import "tailwindcss"` auto-injects Preflight (a global reset) into `layer(base)`. A precompiled component lib shouldn't ship a global reset — use the layered-import form and omit `tailwindcss/preflight.css`, then make component classes self-contained (`appearance`, `border`, `margin`, `font`).
- pnpm 11 approves dep build scripts via `allowBuilds`, not `onlyBuiltDependencies`. pnpm 11 removed `onlyBuiltDependencies`, `neverBuiltDependencies`, and `ignoredBuiltDependencies`; the replacement is `allowBuilds: { pkg: true|false }` in `pnpm-workspace.yaml`. The old keys are silently ignored (no warning), so a blocked build (for example `esbuild`) keeps throwing `ERR_PNPM_IGNORED_BUILDS` — which is fatal to `pnpm install` and cascades into anything wrapping it (Storybook init, `playwright install`). Fix: `allowBuilds: { esbuild: true }`, then `pnpm install` or `pnpm rebuild`. (Recurred across agents — when a pnpm setting silently does nothing, check the current pnpm-version docs for a renamed key.)
- Precompiled Tailwind lib: never build class names dynamically (`ui-btn-${intent}`). Tailwind's scanner can't resolve them, so `dist/styles.css` silently omits any variant whose class isn't present as a literal in scanned source — build stays green, but the consumer gets an unstyled variant. Use literal class names (a typed `Record<Variant, string>` map) so every variant is statically emitted and TS enforces completeness.
- TS `include` silently skips dot-directories. A bare `.storybook` (or any `.dir`) entry in tsconfig `include` matches zero files — no error, build green — so `.d.ts` ambient declarations and config files inside never load. Symptom: `.storybook/globals.d.ts`'s `declare module '*.css'` didn't register, causing `TS2882` on the precompiled-CSS side-effect import (a check that only became default-on in TS 6.0 via `noUncheckedSideEffectImports`). Files imported from elsewhere still resolve, which masks the gap. Fix: glob into the dot-dir explicitly — `'.storybook/**/*'`. Diagnose include scope with `tsc --showConfig` (read the resolved `files` array), not by guessing.
- CSF Next: every addon you use must be in `definePreview.addons: [factory()]`. Listing an addon in `.storybook/main.ts addons` registers it on the manager side, but the preview-side wiring (globalTypes registration, URL `?globals=…` parsing, channel `updateGlobals` propagation) only connects when the addon's factory is also in `definePreview({ addons: [addonThemes(), addonDocs(), …] })`. Omitting it leaves named-import decorators (`withThemeByDataAttribute`) silently calling into nothing — they run on every render but fall back to `defaultTheme` because `context.globals.theme` is undefined. Tests, typecheck, lint, and MCP `get-documentation` all pass; only a real visual or runtime check catches it. Symptom: the dark-theme toolbar (and the equivalent URL `?globals=theme:dark`) has zero effect on the rendered component.
