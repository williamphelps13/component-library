# Foundation components plan

## Context

The 2026-07-04 repo review and remediation rebuilt this library's foundation (vanilla CSS, `--ui-*` token contract, hardened gates). The follow-up assessment (`docs/reviews/2026-07-04-swfllive-component-assessment.md`) settled how the library grows: rebuild components through the add-component flow, with the owner's swfllive set as the requirements source, MUI as the single design target, and styling only ever from tokens. This plan executes that decision. It supersedes Milestone 0's Phase 6 bake-off — the conclusion the bake-off was designed to produce was reached with better evidence, and `docs/component-conventions.md` now emerges from building real components instead of from a Button debate.

Goal: build the foundation set — Badge, the field system (Label + TextField + Textarea), Checkbox (+ Radio), and Dialog — such that every pattern future components need is established, codified, and proven. Owner decisions already made: this component set; Dialog on the native `<dialog>` element (no behavior dependency); execution mode with one PR per phase.

Requirements sources are the swfllive counterparts (prop surfaces, edge cases, and test scenarios were extracted during planning and are summarized per phase — no re-exploration needed). App-specific patterns (`cId` required prop, `Detail` coupling, dark-only styling) are deliberately not carried over.

## Phase 0 — Land the decision docs (PR `docs/growth-strategy`)

- Commit `docs/reviews/2026-07-04-swfllive-component-assessment.md` (already written, untracked)
- ARCHITECTURE: add a Positioning section (condensed why-not-MUI: server-first vs Emotion's client-only architecture, MUI depth without Material's look, exact API surface, change sovereignty; narrow-and-deep strategy) and a Component growth section (rebuild decision, reference-discipline hierarchy, roadmap pointer to the assessment)
- Milestone plan deviation log: Phase 6 superseded by the assessment + this plan; ARCHITECTURE status line: Phase 6 → superseded, foundation-components plan active
- Copy this plan to `docs/superpowers/plans/2026-07-04-foundation-components.md` with an execution deviations log

## Phase 1 — Token vocabulary extension (PR `feat(tokens)`)

One deliberate design pass; additive only (no renames — the `--ui-*` contract from 0.4.0 stays stable).

- New primitives as needed: mid-gray steps (the current core has gray 100/900 only; borders, muted text, and disabled states need intermediate values)
- New semantic groups, light + dark: `surface` (page/raised backgrounds), `border` (default/strong), `text` (muted/subtle — naming decision: extend the `-fg` grammar), `input` (bg/border/placeholder), `overlay` (backdrop)
- Document the naming grammar in the seeded conventions doc (Phase 2) so future names are derivable, not invented
- Update the README theming table; `assert-theme-parity` covers the new sets automatically
- Prove the rebrand contract: one Storybook-only brand-preset (a small CSS file of overrides applied via a story decorator) — addresses the "bland by default" concern by demonstrating identity-by-tokens
- Changeset: minor. Verification: build diff shows only added variables; Chromatic zero visual diffs

## Phase 2 — Skill rewrite + conventions seed (PR `docs(component-flow)`)

- Rewrite `.claude/skills/add-component/SKILL.md`: vanilla-CSS flow (plain classes in `<name>.css`, imported into `layer(components)` via `src/styles/index.css`; `assert-css-imports` gates it), the reference-discipline hierarchy replacing the MUI/shadcn/Chakra panel (requirements from the swfllive counterpart → MUI design target with named deviation bars → cross-checks for gaps only), the RSC decision step (`"use client"` vs `"use no memo"`), docgen JSDoc requirements, current gate list (incl. coverage and `verify:types`), review checkpoint, owner visual gate
- Seed `docs/component-conventions.md` with what is already settled: variants.ts `Record` maps, ref-as-prop, named exports, prop grammar (`intent`/`size`/`loading`/`disabled`/`fullWidth`), six-interactive-state floor, a11y floor (axe-as-error, forced-colors, reduced-motion, min-height text zoom, focus ring on `--ui-color-ring`), token-only styling, the five-story set (autodocs default, state baselines, interaction play, override demo, AllVariants dual-theme). Each component phase appends what it settles
- ARCHITECTURE file-map rows for the new doc

## Phase 3 — Badge (PR `feat(badge)`)

First run of the rewritten flow; smallest real component; server-pure (zero JS).

- Requirements (from swfllive Badge): truncating text, intents default/primary/danger, optional leading icon, removable variant with an accessibly-labeled remove button firing a callback
- Library adaptations: `children: ReactNode` (not `text: string`); no `cId` (test ids via `data-testid` passthrough — settle this policy here and codify it); icon as `startIcon: ReactNode` matching Button; `onRemove` naming; drop `Detail` coupling
- MUI design target: Chip (closest MUI analog — removable, icon, variants)
- First consumer of Phase 1's surface/border/muted tokens
- Conventions codified: test-id policy, icon-slot convention, text-overflow policy

## Phase 4 — Field system: Label, TextField, Textarea (PR `feat(fields)`)

The pattern investment phase — every future form component reuses this anatomy.

- Requirements (from swfllive Label/TextBase/TextField/Textarea): real `<label htmlFor>`; annotation text wired to the input via `aria-describedby` (their `${cId}-annotation` contract, redesigned without `cId`); error state; disabled/readOnly; fullWidth; optional input icon; textarea shares the engine minus icon; the hard-won type lesson — event handlers stay off the shared base props to avoid variance casts, facades declare their own narrowly-typed handlers
- Library decisions to make in-phase: shared internal field shell vs public Label + per-field wiring; error prop grammar (`error?: string` rendering a described message vs bare `hasError` boolean — MUI target suggests message-bearing); do NOT carry `autoComplete="off"` + `data-1p-ignore` as defaults (app decision, not library default — record as a named deviation from requirements)
- All server-renderable (`"use no memo"`; handlers come from the consumer)
- Conventions codified: field anatomy, description/error wiring, controlled/uncontrolled policy

## Phase 5 — Checkbox + Radio (PR `feat(selection-controls)`)

- Requirements (from swfllive RadioCheckboxBase/Checkbox/Radio): native `<input type=checkbox|radio>` wrapped in an associated label; checked/disabled; the shared-base pattern
- Library scope: Checkbox and Radio as components; group semantics (fieldset + legend) documented as a composition pattern in conventions, group components deferred until a product needs them
- Design work: styling native controls on tokens (custom box with `:checked` styling vs `accent-color` — decide against MUI's visual target), `:indeterminate` support for Checkbox, forced-colors behavior for form controls
- Conventions codified: native-control styling approach, selection-state patterns

## Phase 6 — Dialog (PR `feat(dialog)`)

The client-boundary and overlay precedent, on the platform's own primitive.

- Native `<dialog>`: `showModal()` via a minimal `"use client"` wrapper; focus trapping, top-layer stacking, `::backdrop`, and Esc handling come from the platform; backdrop styled with the Phase 1 overlay token; entry/exit transitions via `@starting-state`/`transition-behavior: allow-discrete` with reduced-motion fallbacks; focus-return on close
- Requirements (from swfllive Modal): controlled `open`/`onClose`, mobile full-width option, backdrop-click close
- Per CLAUDE.md, this phase starts with a current-docs validation pass (native dialog transition APIs and support are the volatile bits; invoker commands `command`/`commandfor` evaluated but optional)
- ConfirmationDialog is not a component — demonstrated as a composition in stories instead (conventions: composition demos over wrapper components)
- Conventions codified: client-boundary minimalism, overlay/motion conventions, portal-free layering

## Phase 7 — Closure

- Read `component-conventions.md` end-to-end as one document; reconcile with ARCHITECTURE and the skill
- Milestone 0 §4.1 checklist evaluation; ARCHITECTURE status → Milestone 0 complete
- Release decision point (owner call): merge the accumulated Version PR (0.4.0+: the CSS contract, tokens, and four component sets), then optionally validate in swfllive with the `--ui-*` migration
- Retro: fold lessons from four component runs back into the skill

## Per-phase discipline

Every phase: all gates green (`typecheck`, `lint`, `knip`, `spell`, `format`, `test` + coverage, `build`, `assert:use-client`, `verify:pack`, `verify:types`), review-checkpoint subagent on the diff with Critical/Important findings fixed pre-commit, owner Storybook visual gate for component phases (preview URLs supplied via Storybook MCP), changeset per phase, ask-before-commit, deviations logged in the repo copy of this plan.

## Verification

- Component phases: story tests + axe in real Chromium; Chromatic dual-theme snapshots (owner accepts intended diffs only); Storybook MCP docs check (props render correctly in autodocs); server components proven zero-JS by `assert-use-client`; owner exercises every documented state
- Phase 1: `build/tokens.*.css` diff is purely additive; Chromatic shows zero diffs; brand-preset story visibly rebrands Button
- Phase 6: manual keyboard walkthrough (Tab cycle, Esc, focus return), reduced-motion check, backdrop-click behavior
- Phase 7: registry round-trip after release (if owner releases)

Rough scale: 6–8 working sessions across the eight phases; Phases 0+2 are small, Phase 4 is the largest.

## Execution deviations log

- Phase 3: Badge consumes no surface/border/muted tokens — the plan's "first consumer" line assumed a bordered/tonal badge, but the MUI Chip target is filled-solid, so Badge rides the intent bg/fg pairs; the surface/border semantics wait for the field system (Phase 4)
- Phase 3: Badge is server-renderable with an optional `onRemove` callback (hybrid RSC posture) — recorded in conventions § Server and client; `onRemove` receives the click event (MUI `onDelete(event)` parity)
- Phase 3 (owner visual gate): badge dimensions matched neither MUI Chip variant — small's 24px/8px frame carrying medium's 13px font. Invented values passed every review because no step diffs shipped dimensions against the target source; the add-component skill now requires extracting the target's concrete metrics before writing CSS. Fix: `size` prop (`small | medium`, default medium) with MUI-exact metrics, new core tokens `font-size.xs` (0.75rem) and `spacing.1-5` (0.75rem); the earlier size-prop API cut is withdrawn
- Phase 3: 2026-07-06 library review ran mid-phase (`docs/reviews/2026-07-06-library-review.md`); its Batch 1 landed in this PR, and `core.font-weight.medium` (500) was added for the badge's self-contained weight

- Phase 2: conventions doc seeded strictly from proven-in-merged-code patterns (Button + remediation era); the three known open items (outline Button variant, dual-theme axe automation, dark elevation strategy) are listed in the doc with named triggers rather than pre-decided. The skill's reference step now encodes the authority hierarchy instead of the old MUI/shadcn/Chakra panel; the temp-dir example-fetch step is gone (references are read in place, in authority order).

- Phase 1 redefined from "token vocabulary extension" to a full default-theme design pass (owner-caught): the existing palette values were placeholders from the milestone build, and the original Phase 1 proposal interpolated new grays between placeholder endpoints. All color values are now designed from a named source — Radix Colors 3.0.0, verbatim, version-pinned. Names and semantic structure kept from the original proposal.
- Radix's step-9 "solid background" guidance fails WCAG AA with white text on every scale used (blue 3.26:1, red 3.91:1, green 3.16:1). Solid intents use step 11 instead; dark intents flip to light solids with near-black text (no dark step passes with white). Documented in ARCHITECTURE §Tokens.
- The dark-intent flip changes Button's dark hover/active rules: all four intents now lighten in dark mode (previously danger/success reused the light-mode darken because their placeholder solids were theme-constant). `button.css` comments updated; expected Chromatic diffs.
- `tokens/README.md` sync note: Tokens Studio single-file sync unchanged; primitive names now carry Radix step numbers.
- Owner visual pass surfaced a requirements signal: swfllive's secondary button is outline-style (transparent + ring), while this library's `neutral` intent is a filled subtle surface (Radix step 3, kept as-is). An `outline` Button variant goes to the conventions/ergonomics discussion in Phase 2 — named trigger: when a consuming product needs the outlined style.
- Storybook stale-CSS zombie-server incident during the visual gate (old 2:33 PM server kept port 6006 and served boot-time styles; "restart" silently prompted for port 6007). Logged as a CLAUDE.md gotcha.
