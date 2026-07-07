# Library review — 2026-07-06

Status: HISTORICAL — all findings remediated via `docs/superpowers/plans/2026-07-06-review-fixes.md` (batches 1–5; PRs #47, #48, #50, and the rename PR). C1 verified end-to-end by probe PR #49. Deliberately open with a named trigger: T5's dual-theme axe automation (fires at component #3). K3 is resolved as a recorded decision in ARCHITECTURE § Component model. D12's remediation-plan finding resolved by deleting the plan (batch 4). The problems described below no longer exist; the doc is preserved as the audit record.

Full-library audit before component #3: documentation accuracy and DRY-ness, testing infrastructure (silent-regression coverage), component implementation (Button and the staged Badge), and the token/CSS contract. Reviewed on branch `feat/badge` with the Badge work staged but uncommitted. Method: four parallel review agents (one per dimension); every finding below was then re-verified directly against the working tree — file and line references are firsthand, not agent claims. Claims that failed re-verification were dropped (listed at the end).

Line numbers reference the working tree as of this date and will drift as fixes land.

## Critical

### C1 — Chromatic cannot see CSS-only or token-only changes

`chromatic.config.json` sets `onlyChanged: true` (TurboSnap) with no `externals`. TurboSnap maps changed git files through the Vite bundler graph, but Storybook's only path to the library's styles is `.storybook/preview.tsx:26` importing `dist/styles.css` — which is gitignored and rebuilt out-of-band by `pnpm build` (`.github/workflows/ci.yml:66`). `tokens/tokens.json`, `src/components/*/*.css`, and `src/styles/index.css` are therefore outside the bundler graph: a PR that only edits them traces to zero affected stories. A token change that breaks dark-mode button contrast merges with CI green and a green Chromatic job that took no snapshots. Fix: declare those paths as TurboSnap `externals` (verify the exact option against current Chromatic docs), then confirm on a real CSS-only PR that Chromatic runs a full build.

Resolved 2026-07-06 (PR #48): `externals` covers `tokens/**`, `style-dictionary.config.mjs`, and `src/**/*.css`. Verified end-to-end by probe PR #49 — a CSS-comment-only change produced "TurboSnap disabled due to matching --externals" and a full 82-snapshot capture. Residual (accepted): a `lightningcss` or `style-dictionary` version bump arrives via the lockfile, which is not an external, so a toolchain-driven CSS output change can still trace to zero stories; locking the lockfile as an external would full-rebuild every Renovate PR.

### C2 — the published JavaScript is never executed by any gate

Story tests and unit tests import component source (`src/components/badge/badge.stories.tsx:6` imports `./badge`); nothing imports `dist/*.mjs`. Every dist-facing gate is static: `assert-use-client.mjs` greps text, `attw` checks type resolution, `publint` checks metadata, `assert-pack-contents.mjs` checks the file list. The dist pipeline (tsdown `unbundle` + babel-plugin-react-compiler) is exactly the kind of tooling whose upgrade can emit a broken import or miscompiled output — and that would publish with all gates green. The shipped CSS is exercised (Storybook imports `dist/styles.css`); the shipped JS is not. Fix: a smoke test that imports `dist/index.mjs` and `renderToString`s each export, run after the build in CI and in `prepublishOnly`.

### C3 — ARCHITECTURE directs Dialog at a superseded dependency decision

`ARCHITECTURE.md:90`: "the external and the peer dep land in the same change (Dialog will add Radix both places, spec §4.2)". The owner-settled decision is the opposite: "Dialog on the native `<dialog>` element (no behavior dependency)" (`docs/superpowers/plans/2026-07-04-foundation-components.md:7`, detailed in its Phase 6). Declared precedence is ARCHITECTURE > spec > plan, so the source-of-truth doc currently wins with the wrong answer, and it cites a stale spec section.

## Silent-regression gaps (Important)

### T1 — theme-parity guard has a silent bypass for raw dark values

`scripts/assert-theme-parity.mjs` compares light/dark key names only. The dark build emits only tokens whose `$value` is a reference (`isSemantic`, `style-dictionary.config.mjs:33-34,106`). A dark token given a raw value (`"#ff0000"` instead of `{color.red-dark.11}`) passes parity, is filtered out of `tokens.dark.css`, and dark mode silently inherits the light value. Latent today — all dark keys are currently references — but it is the exact failure class the script exists to catch. Fix: assert every light/dark `$value` is a reference (or diff key count against the emitted dark file).

### T2 — hover, active, focus-visible, and transition styles have zero automated coverage

`button.css:117-197` (hover/active/focus rules) and `badge.css:81-91` are exercised by nothing: Chromatic snapshots resting states, no play function asserts computed styles, no pseudo-state story exists. Deleting every `:hover` block or the focus ring keeps lint, tests, axe, and Chromatic green. The owner visual gate is the only defense, and it runs per component completion, not per PR.

### T3 — the cascade-layer contract on the shipped bundle is unguarded

CLAUDE.md's own gotcha says a wrong layer name fails silently, yet no gate asserts `dist/styles.css` contains the `theme/base/components/utilities` layer declaration (`package.json:47` runs only `assert-css-imports` + Lightning CSS). A Lightning CSS upgrade or an `index.css` edit that drops or renames a layer ships green and breaks Tailwind consumers in one import order or the other. Fix: assert the layer names in the built `dist/styles.css` as part of the `css` script.

### T4 — a publish can bypass the test gates

`release.yml` triggers on push to `main` in parallel with CI (separate workflows, no gating), and `prepublishOnly` (`package.json:62`) runs `build + verify:pack + assert:use-client` — not `test`, `typecheck`, or `lint`. Two individually-green PRs that break each other (merge skew) can publish the broken combination while main's CI run goes red. Fix: gate the publish on the commit's CI result (or add the cheap gates to `prepublishOnly`).

### T5 — dark-theme axe coverage misses non-intent states

Axe runs only the theme a story pins; dark coverage is the four hand-authored `Dark{Intent}` stories per component. Button's Loading and Disabled states and icon slots never get a dark axe pass (`button.stories.tsx:137-160` covers intents only; Badge's `DarkPrimary` does cover the remove button via `onRemove`). The stories name "component #3" as the dual-theme automation trigger — that is the next component; the trigger must actually fire.

### T6 — local `pnpm test` can run against stale CSS

`test` (`package.json:53`) does not rebuild `dist/styles.css`, so local story tests and the owner visual gate can exercise stale styles. CI is safe (`ci.yml` builds before testing); this produces false local confidence only.

## Component accessibility

### A1 (Important) — Badge remove button hit target is ~12×12px

`badge.css:59-79`: `.ui-badge-remove` has `padding: 0`, no min sizes, and its only content is the 0.75rem svg. WCAG 2.2 target size (2.5.8, AA) wants 24×24px; MUI Chip's delete control is substantially larger. axe's default ruleset does not check target size, so every automated gate stays green. The badge body is already 1.5rem tall — a 24px-square hit area fits with no visual change.

### A2 (Minor) — remove icon dimmed at rest and under forced colors

`badge.css:70` sets `opacity: 0.7` idle; the `forced-colors` block (`badge.css:101-108`) never resets it, so Windows High Contrast users get a permanently dimmed control (forced-colors honors `opacity`). A 70% `currentColor` X can also fall below the 3:1 non-text contrast floor over consumer-overridden backgrounds; axe does not test this.

### A3 (Minor) — Badge `intent` JSDoc omits the color-alone warning

`badge.tsx:8` says only "Visual role of the badge." — ARCHITECTURE's color-alone policy (`ARCHITECTURE.md:172`) requires the warning per-component in JSDoc, and Button's `intent` carries it (`button.tsx:11-15`). Status badges are the canonical WCAG 1.4.1 color-alone case.

### A4 (Minor) — default `removeLabel` makes multiple badges indistinguishable

`badge.tsx:32` defaults to bare `'Remove'`; a filter-chip row announces N identical "Remove" buttons. JSDoc guidance recommending `removeLabel={'Remove ' + label}` fixes it without an API change. The default label is also never exercised: `RemoveInteraction` passes an explicit `removeLabel` (`badge.stories.tsx:45`).

## Component API and consistency

### P1 (Important) — Badge's RSC posture contradicts the written convention and is recorded nowhere

`badge.tsx:1` declares `'use no memo'` (server-renderable) while `badge.tsx:48-54` wires `onClick={onRemove}` internally. Conventions say `"use client"` belongs "where the component itself owns interactivity (event wiring, state)" (`docs/component-conventions.md:45`), and ARCHITECTURE's Button justification rests on "no event handlers wired internally" (`ARCHITECTURE.md:158`). In an RSC consumer, a server component passing `onRemove` throws a serialization error pointing at an anonymous internal button; the changeset's "Server-renderable, zero JavaScript shipped" (`.changeset/badge-component.md:8`) is only true without `onRemove`. `assert-use-client.mjs` cannot catch this — it detects hooks and compiler-runtime imports, not handler attachment. The hybrid choice (server-renderable static badge, client call sites for removable) is defensible, but it must be recorded: JSDoc on `onRemove`, a conventions amendment, and an accurate changeset.

### P2 (Important) — undocumented deviations from the MUI Chip design target

ARCHITECTURE requires named justification for each deviation (`ARCHITECTURE.md:142`); the conventions open-items log records tonal styling and sub-8px spacing but not these three: Badge has no `size` prop (MUI Chip has `small | medium`; Button ships three sizes); `onRemove: () => void` (`badge.tsx:16`) drops the event, so a removable badge inside a clickable row cannot `stopPropagation` from the callback (MUI's `onDelete(event)` can); no remove-icon override exists (Button offers `loadingIndicator`). Each may be a deliberate cut — each needs a named bar or an open-item entry, or component #3 re-litigates.

### P3 (Minor) — props declaration style diverges between the two components

`button.tsx:10` uses `interface ButtonProps extends ButtonHTMLAttributes<…>`; `badge.tsx:7-22` uses `type BadgeProps = {…} & HTMLAttributes<…>`. Two components is when consistency is cheapest; react-docgen-typescript also treats the two forms slightly differently in autodocs prop-table extraction.

### P4 (Minor) — two class-prefix policies: `.ui-btn` vs `.ui-badge`

Button abbreviates, Badge spells out (`button.css:13`, `badge.css:13`). Consumers writing override selectors must look up each component's spelling; the conventions doc records the `ui-` prefix rule but not an abbreviation policy, so component #3 re-decides.

### P5 (Minor) — Badge sets no font-weight or font reset

`.ui-badge` (`badge.css:13-24`) inherits the context's weight — a badge inside a bold heading renders bold — while `.ui-btn` pins `font-weight: var(--ui-font-weight-semibold)`. If context-following is intentional, record it; if badges should be self-contained, set the weight from the token scale.

### P6 (Minor) — the breaking rename shares a changeset with the Badge feature

`.changeset/badge-component.md:9` carries the `Intent` → `ButtonIntent` / `Size` → `ButtonSize` rename inside the Badge changeset. `minor` is correct pre-1.0 and the note is honest, but the combined entry makes the CHANGELOG read as one feature and offers no `@deprecated` transitional aliases. A separate changeset keeps the consumer-facing messages distinct.

### P7 (Minor) — two icon-sizing conventions inside Badge

`badge.tsx:10` documents `startIcon` as consumer-sized ("1em fits the text line") while the remove svg is fixed at 0.75rem (`badge.css:76-79`); the two icons drift apart at non-default font sizes.

## Token and CSS contract

### K1 (Important) — `--ui-btn-elevation` is a private state variable in the public namespace

`button.css:31` declares it on `.ui-btn` and re-binds it per state (`:119`, `:157`, `:196`, `:205`). README promises any `--ui-*` set on `:root` re-themes (`README.md:13,33`) — for this variable that is a silent no-op, because an element-level declaration always beats an inherited `:root` value. It appears in no token file and no doc. Either mark it private (`--_ui-btn-elevation`, the Open Props convention) or document it as a component-level hook; Badge introduces no hooks, so this one variable is setting the precedent.

### K2 (Minor) — README implies a continuous spacing scale

`README.md:62` advertises "`--ui-spacing-0` … `--ui-spacing-10`" but the scale is 0/1/2/3/4/5/6/8/10 (`tokens/tokens.json` `core.spacing`) — no 7 or 9. A consumer's `var(--ui-spacing-7)` is an empty reference and the declaration silently drops.

### K3 (Minor) — hover/active shifts use relative color syntax with no recorded decision

`button.css:122-183` derives hover/active colors via `oklch(from var(…) calc(l ± N) c h)` instead of hover-step tokens (Radix ships step 10 as the designated hover solid). Browsers without relative-color support drop the declaration — the color shift vanishes, though the shadow lift remains — and the lighten/darken sign lives in per-theme CSS rules rather than tokens. Defensible, but it is a deviation from the reference with a maintenance cost and no recorded justification.

## Documentation — factual errors

### D1 (Important) — ARCHITECTURE contradicts itself and the code on focus-visible

`ARCHITECTURE.md:142` lists "focus-visible signaled by elevation depth … no static ring" under "Surfaces that match MUI", while `ARCHITECTURE.md:130`, `docs/component-conventions.md:35`, and `button.css:193-197` all establish a 2px `--ui-color-ring` outline as the primary indicator. Pre-remediation residue.

### D2 (Important) — ARCHITECTURE's reduced-motion policy is wrong on both counts

`ARCHITECTURE.md:171` claims motion is "gated behind `@media (prefers-reduced-motion: no-preference)`" and "No current component needs this; the first one with a transition is the trigger." Both components ship transitions/animations today, and both use the opposite (and conventions-documented) pattern: a `reduce` override (`button.css:251-261`, `badge.css:93-97`).

### D3 (Important) — `pnpm release` composition misstated in two docs

`ARCHITECTURE.md:210` and `docs/workflow.md:37` both say `pnpm release` is "`pnpm build && changeset publish`". Actual: `"release": "pnpm changeset publish"` (`package.json:63`); the build lives in `prepublishOnly` — which ARCHITECTURE's own next paragraph describes correctly.

### D4 (Important) — ARCHITECTURE's status section predates the active plan

`ARCHITECTURE.md:20-27` ends at milestone-0's phases. The foundation-components plan's phases 0-2 are merged (PRs #45, #46) and Phase 3 (Badge) is staged — none visible. CLAUDE.md: "If the phase moved, the status moves with it."

### D5 (Minor) — CLAUDE.md's bundle-only command diverges from the pipeline

CLAUDE.md § Common commands lists `pnpm exec tsdown`; the build runs `tsdown --tsconfig tsconfig.build.json` (`package.json:49`). The bare command emits from the lenient default tsconfig.

### D6 (Minor) — tokens/README claims core is "Never consumed directly"

`tokens/README.md:20`. Component CSS consumes `--ui-spacing-*`, `--ui-radius-*`, `--ui-font-size-*`, `--ui-font-weight-*`, and `--ui-duration-*` straight from `core` (there is no semantic dimension tier, which is fine — the doc claim is what's wrong).

### D7 (Minor) — foundation plan's Phase 3 token promise is unmet by the staged Badge

`docs/superpowers/plans/2026-07-04-foundation-components.md` Phase 3: "First consumer of Phase 1's surface/border/muted tokens". `badge.css` consumes only intent bg/fg, spacing, radius, font-size, and duration. Needs a deviation-log entry (the log currently has no Phase 3 entries).

## Documentation — duplication

### D8 (Important) — the reference-discipline hierarchy exists in three copies

`ARCHITECTURE.md:50` is the declared single copy. `docs/component-conventions.md:62` restates all four layers as a "short version", and `.claude/skills/add-component/SKILL.md:23-27` (plus its frontmatter description) restates them again with sub-bullets. The restated copies are where drift breeds; both should point.

### D9 (Important) — the five-story set exists in two copies

`docs/component-conventions.md:50-56` is the declared single copy (`ARCHITECTURE.md:187`: "that document is the single copy"); `SKILL.md:51` restates all five.

### D10 (Important) — the component scaffold conventions are restated in the skill

`SKILL.md:35-38` repeats conventions § API shape and § Variants and styling nearly line-for-line (typed `Record` maps, literal `ui-*` classes, per-value JSDoc, ref-as-prop, `...rest`/`className` merging, token-only values, the interaction/a11y floor).

### D11 (Minor) — smaller duplication cluster

- RSC decision rule in three places: `ARCHITECTURE.md:136-138`, `conventions:43-46`, `SKILL.md:29-32`
- CSS-import gate in three docs plus the `index.css` comment: `ARCHITECTURE.md:134`, `conventions:24`, `SKILL.md:40-42`, `src/styles/index.css:27-28`
- Cascade-layer/Tailwind rationale: CLAUDE.md gotcha, `ARCHITECTURE.md:126`, `src/styles/index.css:4-13` (README's consumer-facing copy is legitimate)
- tokens/README duplicates ARCHITECTURE § Tokens: single-file/free-tier rationale, `--ui-` prefix rationale, emitted artifacts (`tokens/README.md:8-14,20-27,36-39` vs `ARCHITECTURE.md:116-117,119`)
- Within ARCHITECTURE: the React Compiler/`useMemoCache` mechanism at `:91` and `:138`; the `--ui-` prefix rationale at `:116` and `:127`
- `SKILL.md` steps 12-15 restate changeset, review-checkpoint, owner-gate, and ask-before-commit rules owned by CLAUDE.md and workflow.md
- Three divergent gate-command lists: CLAUDE.md § Common commands, `workflow.md:8`, `SKILL.md:56` (workflow.md's already omits knip/spell/format/verify:types — the drift the duplication invites)
- Radix provenance + AA verification: `README.md:68` vs `ARCHITECTURE.md:115`; the dark-solids-lighten explanation additionally in `conventions:27` and `button.css:134-137`
- Dual-theme axe trigger stated twice within conventions: `:40` and `:70`

## Documentation — stale or unneeded content

### D12 (Minor) — executed remediation plan lacks a status header

`docs/superpowers/plans/2026-07-04-remediation.md` is fully executed but carries no HISTORICAL marker, and its context line "This runs before the Phase 6 bake-off" references a bake-off later superseded. Both review docs model the correct pattern.

### D13 (Minor) — "the deviation log" is singular but three plans carry logs

CLAUDE.md: "The deviation log is the canonical record of what's actually happened." Milestone-0, remediation, and foundation-components each hold one; which is canonical is only inferable.

### D14 (Minor) — "Five docs persist long-term" undercounts

CLAUDE.md § Documentation. AGENTS.md and tokens/README.md also persist (both referenced from ARCHITECTURE's See Also and file map); whether the documentation rules govern them is ambiguous — tokens/README currently violates several (heavy bolding throughout).

### D15 (Minor) — speculative and historical content in persistent docs

- `ARCHITECTURE.md:173`: RTL trigger names components outside the settled set ("likely Tabs, Menu, or Tooltip post-§4.1") with an unglossed spec cross-reference
- `ARCHITECTURE.md:124`: "The most-corrected area. The 2026-07 remediation executed the long-planned Tailwind→vanilla migration (its three verification premises held: …)" — insider narrative meaningless without the plan context
- `ARCHITECTURE.md:218`: "the 0.18.2 environmental crash was fixed upstream in 0.18.3" — dated dependency history
- `workflow.md:3`: "Written from two real change→publish→consume cycles (`fullWidth` → 0.2.0, `success` intent → 0.3.0)"; `workflow.md:33`: "The spec listed `pnpm pack` as an optional pre-publish check; it is now…" — provenance narrative

### D16 (Minor) — file map omissions

`ARCHITECTURE.md`'s file map has no rows for `tsconfig.node.json` (discussed in prose at `:108`) or `.storybook/brand-swfllive.css` (the rebrand-proof asset imported by `preview.tsx`).

## Documentation — style-rule violations

### D17 (Minor)

- `ARCHITECTURE.md:7`: "### See Also" — title case (rule: sentence case)
- `ARCHITECTURE.md:259`: "baked into the emit" — banned jargon (rule 9)
- `docs/component-conventions.md:64-71`: the staged diff split § Open items into two lists (blank line at `:68`)
- `docs/component-conventions.md:3` ("a convention lands here only once it is proven in a merged component") vs `SKILL.md:64` ("include them in the same PR") — contradictory; the staged diff follows the skill, adding two "(settled by Badge)" bullets before Badge is merged

## Story coverage gaps (Minor)

- Badge has no `SpacingOverride` story (Button has one at `button.stories.tsx:127-133`), so the spacing-token override contract is untested for Badge
- `Truncating` (`badge.stories.tsx:35-41`) is light-only, absent from the dual-theme `AllVariants` matrix, and has no play assertion that the ellipsis applies

## Verified clean — checked and not worth worrying about

- The a11y gate is real: `addonA11y()` registered in `definePreview.addons` (`preview.tsx:66`) with `a11y.test: 'error'` (`preview.tsx:83`)
- Cascade layers as authored: order declared before imports (`index.css:21`), tokens in `theme` via zero-specificity `:where()`, components in `layer(components)`, badge import wired (`index.css:30`)
- Every `var(--ui-*)` in component CSS resolves to a token (sole exception: `--ui-btn-elevation`, K1); Badge introduces zero new token names
- README's exports/usage and theming table match `package.json` `exports` and `tokens/tokens.json`
- CI orders build before test, so story tests exercise fresh CSS; Chromatic is blocking when it runs and `AllVariants` snapshots both themes
- `variants.ts` pattern, story structure, and `Intent` → `ButtonIntent` rename are consistent across both components; `shouldRemoveUndefinedFromOptional` is set globally (`.storybook/main.ts:24`)
- Loading label hides via `opacity: 0` (`button.css:230-232`), the past `visibility: hidden` trap is fixed

## Dropped after re-verification

- "Badge's remove button never gets a dark axe pass" — false: `DarkPrimary` (`badge.stories.tsx:78-83`) wires `onRemove`, so the remove button is axe-scanned in dark
- "`variants.test.ts` can be fooled by an emptied rule body" — true but by design; the tests guard the class-name ↔ stylesheet pairing only and are documented as such

## Counts

Critical: 3 · Important: 14 · Minor: 24
