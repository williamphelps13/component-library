# CLAUDE.md — @williamphelps13/ui

Working notes for humans and AI agents. Keep it short; link out for depth.

## What this is

A versioned, public React component library (`@williamphelps13/ui`).

- **Architecture (source of truth) — read first:** `ARCHITECTURE.md` (current as-built design + why).
- **Agent guidance (cross-tool):** `AGENTS.md` — verify component props via the Storybook MCP; never hallucinate.
- Design spec (original exploration; may lag): `docs/superpowers/specs/2026-05-17-component-library-design.md`
- Milestone-0 plan + deviation log (execution history): `docs/superpowers/plans/2026-05-17-component-library-milestone-0.md`

## How we work (Teaching Mode — spec §5)

> **Teaching Mode is the DEFAULT, but it is per-feature switchable.** The owner can explicitly
> drop it for a specific feature when speed > pedagogy (B3 / Chromatic was the first such case
> — owner direction: "without Teaching Mode"). When off, the agent runs commands directly. When
> the owner hasn't said either way, assume Teaching Mode is on.

- The **owner runs every CLI/setup command**. Agents provide the exact command + explain (Concept / Why / Tradeoffs) but do **not** execute it.
- Agents author code/config and walk through it. Each phase ends with a **quiz gate**; command failures are **guided debugging** (investigate root cause, no reflex fixes).
- **Validate each phase against current docs before executing it** (a plan-mode pass). The plan was authored partly from assumptions and this stack moves fast, so before running a phase confirm its steps against _primary sources_ — official docs via `ctx7`, release notes / migration guides; use reputable blogs only to corroborate, never as the authority (they go stale fast). Validate the volatile bits (package names, versions, config API shapes, current best practice), leave settled architecture alone, and fold findings into the plan's Execution-deviations log before executing.
- **`ARCHITECTURE.md` is the source of truth for current architecture** (precedence: `ARCHITECTURE.md` > spec > plan/deviation-log). When an architecture decision is made or changed, update `ARCHITECTURE.md` (the _what + why_) in the same change; the plan's deviation log records _why the change happened_. Keep it current — the spec is background, reconciled at Phase 6.
- **Don't defer foundational decisions — "addable later" is NOT a reason to skip.** Across agent handoffs there is no guaranteed trigger: "we'll add it in Phase N" almost always evaporates with the next agent (who lacks this context). So decide and lay foundations _now_, or capture them as a concrete task with a **named trigger** in the plan/`ARCHITECTURE.md` — never a vibe. Reversibility lowers the _cost of a wrong call_; it is not license to defer. (Defer only when genuinely uncertain or blocked — and write it down.) Foundational infra has value when laid, not when the "walls" arrive.
- **Verify component props via the Storybook MCP — never hallucinate.** Full operational details in §"Storybook MCP" below.
- **Review checkpoint before each phase / major-task commit:** dispatch an independent code-review subagent (`superpowers:requesting-code-review`) on the diff vs `ARCHITECTURE.md` / the plan; fix Critical + Important findings before committing. Self-review misses things — in Phase 3 a reviewer subagent caught a red `pnpm lint` the author had missed; in Phase 4 a reviewer subagent caught the a11y gate was silently a no-op (the implementer's analogous fix for `addonThemes` hadn't been applied to `addonA11y`).
- **One source for current state; reconcile docs before each commit.** The **deviation log** is the canonical record of what's actually happened; **`ARCHITECTURE.md`'s status line** is the one-glance summary. Don't duplicate "where we are" content elsewhere (parallel status text in `OVERVIEW.md` is what killed it — it lagged by 3+ phases). Before committing, do a 2-minute pass on every long-lived doc (`ARCHITECTURE`, `CLAUDE`, `AGENTS`, deviation log) and confirm nothing in it now contradicts the diff's outcome. The reviewer-subagent above catches code drift; this pass catches doc drift.

## Docs hygiene (the three persisting docs)

> Three docs persist long-term: `README.md`, `CLAUDE.md`, `ARCHITECTURE.md`. Every concept lives in **exactly one of them**; the others link. When in doubt about where a piece of content belongs, check the ownership matrix below and pick one — never two.

Per-file ownership:

- `ARCHITECTURE.md` — **what is** + **why**; the status line (canonical phase state); the file/module map. Architectural decisions live here, with rationale.
- `CLAUDE.md` (this file) — **how we work**; operational rules + commit conventions + gotchas + Storybook-MCP usage. Process discipline lives here.
- `README.md` — **consumer-facing view only**: install, basic usage, the runtime override contract, license, and pointers to the other two for depth. No status restatement; no internal-toolchain enumeration.
- The plan's **deviation log** is the canonical decision journal — the three persisting docs cite from it, never mirror it.

Common DRY traps (these have all actually bitten this project — concrete, not abstract):

- **Don't restate `ARCHITECTURE.md`'s status line** in `README.md` or anywhere else — link. `OVERVIEW.md` died of this exact pattern (lagged 3+ phases before deletion).
- **Don't restate the internal build pipeline** (Style Dictionary / Tailwind v4 / tsdown specifics) in `README.md` — that's `ARCHITECTURE.md`'s territory. README sticks to consumer-relevant claims (ESM, React 19+ peer dep, runtime CSS-var override, no Tailwind install on consumer side).
- **Don't restate `CLAUDE.md` rules** (pnpm-only, no `Co-Authored-By` trailer, version pins, etc.) elsewhere. Other docs link to the bullet; never duplicate the text.

Semantic markdown:

- Use headings (`##`, `###`) for structure; reserve `**bold**` for body-text emphasis. A bolded sentence acting as a section header is a smell — promote to `##` or drop the bold (TOC tools, anchors, and section-parsing agents see `##` as structure but bold as just emphasis).
- Bullets > prose for any list of ≥2 items — scales as items are added; comma-joined prose falls apart at 3+ entries. Each bullet carries its own description.
- For "see also"-style links, use `[Link](url) — description.` with an em-dash separator. Every link gets a description; no bare links.

**Update protocol** — extends the "One source for current state; reconcile docs before each commit" bullet above with one specific instruction: when touching ANY of the three persisting docs, **re-read the other two end-to-end** before committing. Not just the lines you intended to touch — drift hides in the lines you don't think to look at. (The `d6fe795` close-Phase-3 commit dogfooded this lesson by missing a stale section header in the very commit that bumped the status line; reviewer subagent caught it in `a018dff`.)

## Toolchain rules

- **pnpm only**, via Corepack. Do **not** use `npm`/`npx` inside the repo (they fail on our `packageManager` pin). Use `pnpm` and `pnpm dlx`.
- Node version: `.nvmrc` (24.16.0, exact). pnpm version: exact pin in `package.json` → `packageManager`.
- **Dev on Active LTS Node** (currently 24). Don't move to a just-released "Current" major (Node 26 = Current until it becomes LTS on 2026-10-28); revisit then.
- **ESM-only** package. Build = `tsdown`. Type-check = `tsc --noEmit` (tsc never emits; tsdown emits).
- Library docs lookups: use `ctx7` (`pnpm dlx ctx7@latest …`, or `npx ctx7@latest …` run from _outside_ this repo).
- **Storybook/Vitest deps ride `^` ranges pinned by `pnpm-lock.yaml`** (not exact-pinned — the lockfile is the reproducibility mechanism). CSF Next (our story format) is **experimental**, so after any `pnpm update` that bumps Storybook, re-run `pnpm storybook` + `pnpm test` to catch API drift before trusting it.

## Common commands

- `pnpm exec tsdown` — bundle only (use in early phases, before tokens exist)
- `pnpm build` — tokens → precompiled CSS → bundle (full build; needs Phase 2)
- `pnpm typecheck` · `pnpm lint` · `pnpm test` · `pnpm chromatic`

## Storybook MCP (verify component APIs — never hallucinate)

The repo runs `@storybook/addon-mcp` — a live HTTP MCP server at **`http://localhost:6006/mcp`** while `pnpm storybook` is running (wired for Claude Code in `.mcp.json`; other agents add an HTTP MCP server pointing at that URL).

**Before using ANY prop on a component — even common-sounding ones (`variant`, `size`, `shadow`, …) — confirm it is actually documented.** Do not infer props from naming conventions or from other libraries. A story's export name may not match a prop name; verify through the documentation tools, not the labels. If a prop isn't documented, ask the user instead of inventing it.

Tools the server provides:

- `list-all-documentation` — every component.
- `get-documentation` / `get-documentation-for-story` — a component's real props + examples.
- `get-storybook-story-instructions` — current conventions, before writing/updating a `.stories.*`.
- `run-story-tests` — verify your changes.
- `preview-stories` — preview URLs (include them in your reply so the user can open them).

**Fresh-checkout note:** `pnpm storybook` imports the precompiled `dist/styles.css` — on a fresh clone, run `pnpm build` first or the preview fails to resolve the import.

**When adding a Storybook addon:** if its default export is a `definePreviewAddon(...)` factory, register `addonX()` in `.storybook/preview.tsx`'s `definePreview({ addons: [...] })` array **in addition to** listing it in `.storybook/main.ts addons`. Without the preview-side registration, the addon's wiring (globalTypes registration, URL/channel global propagation, parameter handlers, axe runner) silently no-ops — tests, typecheck, and lint stay green because none assert the addon did its job. **Exception:** `@storybook/addon-vitest` is intentionally NOT in `definePreview.addons` — its module imports `vitest` at load time (only resolvable inside the vitest run context); the integration is wired through `storybookTest()` in `vitest.config.ts` instead.

## Commit conventions

- **Ask before committing.** Don't run `git commit` (or `--amend`, or a history-rewriting `rebase`) without explicit in-conversation approval. Surface the staged diff/status + proposed commit message; wait for a clear "yes" (or edits) before the commit. An approved commit also covers the immediate `git push origin <feature-branch>` that follows — no second ask. Force-pushes and any push to `main` need their own confirmation.
- **Conventional Commits**: `type(scope): summary`, valid types only (`feat`/`fix`/`chore`/`docs`/`build`/`refactor`/`test`) — no ad-hoc prefixes (`tokens:` → `chore(phase2):`). Milestone build-out uses a `chore(phaseN)` scope. (Releases are driven by Changesets, not commit messages — so this is hygiene, not tooling.)
- **No `Co-Authored-By` trailer** (repo convention; overrides any agent default).
- Subject ≤ ~72 chars; put the _why_ in the body, concise — link the plan's deviation log rather than duplicating it.
- Commit multi-line messages with `git commit -F <file>` — a pasted indented heredoc leaks leading spaces (and even the `EOF` delimiter) into the message.
- **A `chore(phaseN)` commit that completes phase work MUST bump `ARCHITECTURE.md`'s status line and update the deviation log's pending list in the same commit.** Skipping this is exactly how the status went stale across agent handoffs in early phases. If the phase moved, the status moves with it.

## Gotchas & hard-won lessons

> **Practice — log ruthlessly.** Add a line here ONLY if all three hold: (1) likely to recur, (2) it cost real time because the symptom was cryptic or _silent_ (no error), and (3) the tooling won't clearly catch it next time. If the raw error already states the fix, don't log it. This file loads every session — keep it short.

- **Corepack pins must be EXACT.** A `^range` in `packageManager` breaks _every_ pnpm/npx command in the repo — including `pnpm -v` itself (bootstrap trap). Use `"packageManager": "pnpm@11.1.2"`.
- **tsdown needs Node ≥ 24.11.1.** On older Node 24, loading `tsdown.config.ts` fails with the misleading `Unexpected module status 3` ("known Node.js bug"). Fix = upgrade Node (not the `--config-loader tsx` workaround); `engines.node` enforces the floor.
- **tsdown infers JS `target` from `engines.node`** — _silent_, no tool catches it. Set `target` explicitly (`'es2022'`) so a browser/React lib isn't built Node-targeted.
- **tsdown emits `.mjs` / `.d.mts`.** Point `package.json` `exports` (and path-reading scripts) at those, not `.js`/`.d.ts`.
- **pnpm 11 _silently_ ignores `.npmrc` for non-auth settings.** `saveExact`, `strictPeerDependencies`, `engineStrict`, etc. only work in `pnpm-workspace.yaml` as camelCase keys (no warning if you put them in `.npmrc`). `.npmrc` = auth/registry only.
- **tsdown cleans its `dist/` output dir each build (silently).** Any _separate_ writer to `dist/` — e.g. the Tailwind `css` step writing `dist/styles.css` — must run **after** tsdown in the `build` script (`… && tsdown && pnpm css`), or tsdown deletes it and the build still "succeeds" with the file missing.
- **Tailwind v4 auto-scans the _whole repo_ (incl. `docs/*.md`) — _silently_.** A bare `@import "tailwindcss"` emits utilities for any class-name string it finds in prose, so `dist/styles.css` ships doc-scraped classes and changes when you edit unrelated markdown — build stays green. For a precompiled lib, scope it: `@import "tailwindcss/utilities.css" … source(none)` + `@source "../components"`.
- **Tailwind `prefix(tw)` renames theme _variables_ too** (`--color-*` → `--tw-color-*`), which breaks a CSS-var override contract. Don't use it for collision-safety when consumers override your vars — namespace your own `@utility` class names instead (e.g. `ui-*`).
- **`@import "tailwindcss"` auto-injects Preflight** (a global reset) into `layer(base)`. A precompiled component lib shouldn't ship a global reset — use the layered-import form and omit `tailwindcss/preflight.css`, then make component classes self-contained (`appearance/border/margin/font`).
- **pnpm 11 approves dep build scripts via `allowBuilds`, NOT `onlyBuiltDependencies`.** pnpm 11 _removed_ `onlyBuiltDependencies`/`neverBuiltDependencies`/`ignoredBuiltDependencies`; the replacement is `allowBuilds: { pkg: true|false }` in `pnpm-workspace.yaml`. The old keys are **silently ignored** (no warning), so a blocked build (e.g. `esbuild`) keeps throwing `ERR_PNPM_IGNORED_BUILDS` — which is **fatal to `pnpm install`** and cascades into anything wrapping it (Storybook init, `playwright install`). Fix: `allowBuilds: { esbuild: true }`, then `pnpm install`/`pnpm rebuild`. _(Recurred across agents — when a pnpm setting silently does nothing, check the current pnpm-version docs for a renamed key.)_
- **Precompiled Tailwind lib: never build class names dynamically** (`ui-btn-${intent}`). Tailwind's scanner can't resolve them, so `dist/styles.css` _silently_ omits any variant whose class isn't present as a literal in scanned source — build stays green, but the consumer gets an **unstyled** variant. Use literal class names (a typed `Record<Variant, string>` map) so every variant is statically emitted and TS enforces completeness. (Caught when `.ui-btn-neutral` was missing from the shipped CSS.)
- **TS `include` _silently_ skips dot-directories.** A bare `.storybook` (or any `.dir`) entry in tsconfig `include` matches **zero** files — no error, build green — so `.d.ts` ambient declarations + config files inside never load. Symptom here: `.storybook/globals.d.ts`'s `declare module '*.css'` didn't register → `TS2882` on the precompiled-CSS side-effect import (a check that only became default-on in **TS 6.0** via `noUncheckedSideEffectImports`). Files _imported_ from elsewhere still resolve, which masks the gap. Fix: glob into the dot-dir explicitly — `'.storybook/**/*'`. Diagnose include scope with `tsc --showConfig` (read the resolved `files` array), not by guessing. _(The three handoff hypotheses + the "drop `verbatimModuleSyntax`" fix were all wrong; `--showConfig` settled it in one shot.)_
- **CSF Next: every addon you _use_ must be in `definePreview.addons: [factory()]`.** Listing an addon in `.storybook/main.ts addons` registers it on the manager side, but the **preview-side wiring** (globalTypes registration, URL `?globals=…` parsing, channel `updateGlobals` propagation) only connects when the addon's factory is also in `definePreview({ addons: [addonThemes(), addonDocs(), …] })`. Omitting it leaves named-import decorators (`withThemeByDataAttribute`) silently calling into nothing — they run on every render but fall back to `defaultTheme` because `context.globals.theme` is undefined. _Silent_: tests pass, typecheck passes, lint passes, MCP `get-documentation` passes — only a real visual/runtime check catches it. Symptom here: dark-theme toolbar (and the equivalent URL `?globals=theme:dark`) had zero effect; the Button rendered light no matter what. Caught by Phase-4 Playwright-driven verification.
