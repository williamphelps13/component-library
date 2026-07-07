# Review-fixes implementation plan (2026-07-06)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve every finding in `docs/reviews/2026-07-06-library-review.md` in five batches — Badge PR polish first, then gate hardening, then documentation correction and deduplication, then component/token polish.

**Architecture:** Batch 1 amends the uncommitted `feat/badge` work so the PR merges in excellent shape. Batch 2 is one `chore(gates)` PR (pipeline changes need PR context to prove Chromatic behavior). Batches 3–5 are direct commits to `main`. Each batch ends with the repo's standard review checkpoint; component batches end with the owner visual gate.

**Tech Stack:** Existing toolchain only — pnpm, tsdown, Lightning CSS, Style Dictionary, Vitest browser mode, Chromatic, Changesets. No new dependencies.

## Global constraints

- pnpm only, via Corepack; never npm/npx inside the repo
- Teaching Mode default: the owner runs every CLI command; agents author code and provide exact commands (owner may drop Teaching Mode per batch)
- Ask before committing: surface the staged diff and proposed message, wait for explicit yes; no `Co-Authored-By` trailer
- Conventional Commits, subject ≤72 chars, multi-line messages via `git commit -F <file>`
- Update protocol: any batch touching a persistent doc re-reads all five (README, CLAUDE.md, ARCHITECTURE.md, docs/workflow.md, docs/component-conventions.md) end-to-end before its commit
- Validate volatile bits against current docs via `ctx7` before executing: Chromatic `externals` (Task 2.1), changesets/action inputs (Task 2.6)
- Markdown: every list item one line (no continuation wraps); persistent docs follow CLAUDE.md's documentation rules
- Line numbers in this plan reference the 2026-07-06 working tree and drift as edits land — locate by quoted text, not line number
- Review-doc IDs (C1, T1, A1, P1, K1, D1 …) reference `docs/reviews/2026-07-06-library-review.md`

## Owner decisions (recommendations pre-filled — confirm or override at Batch 1 start)

1. `onRemove` signature (P2): recommend `(event: MouseEvent<HTMLButtonElement>) => void` — matches MUI `onDelete(event)`, enables `stopPropagation`; cheap now, breaking later
2. Class-prefix policy (P4): recommend full component name (`ui-button`, `ui-badge`); rename `ui-btn` → `ui-button` in Batch 5 with a breaking-note changeset (pre-1.0, one known consumer)
3. Badge font-weight (P5): recommend adding `core.font-weight.medium` (500) to tokens and pinning `.ui-badge` to it — self-contained like Button, escalated through the token layer
4. Badge `size` prop (P2): recommend NOT adding it — ARCHITECTURE's "API surface exactly as large as the products need" is the named bar; record as an open item with trigger "a consuming product needs a second badge size"
5. RSC posture (P1): recommend keeping the hybrid (server-renderable; `onRemove` requires a client-component call site) and documenting it — JSDoc warning, conventions amendment, corrected changeset
6. Release gating (T4): recommend running the gate suite inside `release.yml` before `changesets/action` (simple, no cross-workflow coupling)

---

## Batch 1 — Badge PR polish (branch `feat/badge`, single `feat(badge)` commit)

Fixes: A1, A2, A3, A4, P1, P2, P3, P6, P7, D7, D17 (conventions items), story gaps. The branch's work is staged but uncommitted; these tasks amend it before its first commit.

### Task 1.1: Remove-button hit target and icon sizing (A1, P7)

**Files:**
- Modify: `src/components/badge/badge.css` (`.ui-badge-remove`, `.ui-badge-remove-svg`)
- Test: `src/components/badge/badge.stories.tsx` (`RemoveInteraction` play)

- [ ] **Step 1: Add the failing assertion** — in `RemoveInteraction`'s play, before the click:

```tsx
const box = removeButton.getBoundingClientRect()
await expect(box.width).toBeGreaterThanOrEqual(24)
await expect(box.height).toBeGreaterThanOrEqual(24)
```

- [ ] **Step 2: Run to verify it fails** — `pnpm test` (or focused: `pnpm exec vitest run --project storybook -t 'RemoveInteraction'`). Expected: FAIL, width/height ≈ 12.

- [ ] **Step 3: Fix the CSS** — in `.ui-badge-remove` replace `padding: 0;` with:

```css
  padding: 0;
  min-width: 1.5rem;
  min-height: 1.5rem;
```

and change `.ui-badge-remove-svg` to em units so the glyph tracks the badge's font size (P7):

```css
.ui-badge-remove-svg {
  width: 0.85em;
  height: 0.85em;
}
```

- [ ] **Step 4: Rebuild CSS and re-run** — `pnpm css && pnpm test`. Expected: PASS. (Restart Storybook afterward if it is running — boot-time CSS gotcha.)

### Task 1.2: Forced-colors and rest-state opacity (A2)

**Files:**
- Modify: `src/components/badge/badge.css` (forced-colors block)

- [ ] **Step 1: Add the opacity reset** — inside `@media (forced-colors: active)`:

```css
  .ui-badge-remove {
    opacity: 1;
  }
```

- [ ] **Step 2: Verify** — `pnpm css`; owner confirms in the Batch 1 visual gate (Windows HCM emulation via DevTools Rendering → `forced-colors: active`).

### Task 1.3: `onRemove` receives the event (decision 1)

**Files:**
- Modify: `src/components/badge/badge.tsx`
- Test: `src/components/badge/badge.stories.tsx` (`RemoveInteraction`)

- [ ] **Step 1: Add the failing assertion** — in `RemoveInteraction`'s play, after the call-count assertion:

```tsx
await expect(args.onRemove).toHaveBeenCalledWith(expect.objectContaining({ type: 'click' }))
```

- [ ] **Step 2: Run to verify it fails** — `pnpm test`. Expected: FAIL — called with no arguments.

- [ ] **Step 3: Change the prop type** — in `badge.tsx`, add `MouseEvent as ReactMouseEvent` to the type-only react import and change the prop:

```tsx
  /**
   * Renders a remove button after the label and calls this when it is
   * activated (receives the click event, so consumers can stopPropagation
   * inside clickable rows). The badge body itself is never interactive.
   * RSC note: passing a function prop requires a client-component call
   * site; without `onRemove` the Badge renders on the server with zero JS.
   */
  onRemove?: (event: ReactMouseEvent<HTMLButtonElement>) => void
```

(`onClick={onRemove}` in the JSX already forwards the event — no other change.)

- [ ] **Step 4: Run to verify it passes** — `pnpm typecheck && pnpm test`. Expected: PASS.

### Task 1.4: JSDoc corrections (A3, A4, P1)

**Files:**
- Modify: `src/components/badge/badge.tsx`

- [ ] **Step 1: `intent` gets the color-alone warning (mirrors Button's):**

```tsx
  /**
   * Visual role of the badge. Status conveyed by color alone is invisible
   * to users who can't see color — pair `danger`/`success` with text or an
   * icon that carries the same meaning.
   */
  intent?: BadgeIntent
```

- [ ] **Step 2: `removeLabel` gets disambiguation guidance:**

```tsx
  /**
   * Accessible name for the remove button. With several removable badges,
   * make each unique (`removeLabel={'Remove ' + label}`) so screen-reader
   * users can tell them apart. Localize when the UI is not English.
   */
  removeLabel?: string
```

(The `onRemove` RSC note landed in Task 1.3.)

- [ ] **Step 3: Verify** — `pnpm typecheck && pnpm lint`; confirm the new text renders in autodocs during the visual gate.

### Task 1.5: Align props declaration style (P3)

**Files:**
- Modify: `src/components/badge/badge.tsx`

- [ ] **Step 1: Convert the type intersection to Button's interface-extends form** (keep every member and JSDoc exactly as of Task 1.4):

```tsx
export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  // …existing members unchanged; `children: ReactNode` stays (legal narrowing
  // of HTMLAttributes' optional children — it is required here)…
}
```

- [ ] **Step 2: Verify** — `pnpm typecheck && pnpm test`. Expected: PASS, no consumer-visible type change.

### Task 1.6: Story coverage gaps

**Files:**
- Modify: `src/components/badge/badge.stories.tsx`

- [ ] **Step 1: `RemoveInteraction` exercises the default label** — remove `removeLabel: 'Remove badge'` from its args and query `{ name: 'Remove' }` instead.

- [ ] **Step 2: Add `SpacingOverride`** (Badge consumes `--ui-spacing-1`; mirrors Button's story):

```tsx
export const SpacingOverride = meta.story({
  render: (args) => (
    <div style={{ '--ui-spacing-1': '1rem' } as CSSProperties}>
      <Badge {...args} intent="primary" onRemove={fn()} />
    </div>
  ),
})
```

- [ ] **Step 3: `Truncating` asserts the ellipsis** — add a play function:

```tsx
  play: async ({ canvasElement }) => {
    const label = canvasElement.querySelector('.ui-badge-label')
    if (!label) throw new Error('label span missing')
    await expect(label.scrollWidth).toBeGreaterThan(label.clientWidth)
  },
```

- [ ] **Step 4: Add a truncating row to `AllVariants`** (dual-theme visual coverage) — inside the grid, after the icon/remove row:

```tsx
      <div style={{ maxWidth: '8rem' }}>
        <Badge intent="neutral">A very long badge label that cannot possibly fit</Badge>
      </div>
```

- [ ] **Step 5: Run** — `pnpm test`. Expected: PASS (new Chromatic baselines are expected on the PR).

### Task 1.7: Badge font weight via the token layer (decision 3)

**Files:**
- Modify: `tokens/tokens.json` (`core.font-weight`), `src/components/badge/badge.css`, `README.md` (type-scale line)

- [ ] **Step 1: Add the token** — in `core.font-weight` alongside `semibold`:

```json
"medium": { "$value": "500", "$type": "fontWeights" }
```

(Core is theme-agnostic — no light/dark entries; parity is unaffected.)

- [ ] **Step 2: Pin the badge** — in `.ui-badge` add `font-weight: var(--ui-font-weight-medium);`.

- [ ] **Step 3: Update the README contract line** to `--ui-font-size-sm/md/lg`, `--ui-font-weight-medium/semibold` — component type scale.

- [ ] **Step 4: Rebuild and verify** — `pnpm tokens && pnpm css && pnpm test`; grep `--ui-font-weight-medium` in `build/tokens.light.css`. Expected: present.

### Task 1.8: Conventions doc — badge-settled patterns and repairs (D17, P1, P2, decisions 2/4/5)

**Files:**
- Modify: `docs/component-conventions.md`

- [ ] **Step 1: Repair § Open items** — delete the blank line splitting the list (between the sub-8px-spacing and `outline`-variant bullets).

- [ ] **Step 2: Resolve the settling-rule contradiction** — change line 3's clause "a convention lands here only once it is proven in a merged component" to "a convention lands here once a component proves it; the proving component's PR carries the convention change".

- [ ] **Step 3: Amend § Server and client** with the hybrid rule (P1) — after the `"use client"` bullet add:

```markdown
- A server-renderable component may expose optional callback props (Badge's `onRemove`): the static render ships zero JS, and the prop's JSDoc must state that passing it requires a client-component call site
```

- [ ] **Step 4: Record the class-prefix policy (decision 2)** — in § Variants and styling, after the `ui-`-prefix bullet:

```markdown
- Class prefixes use the full component name (`ui-badge-primary`, `ui-button-primary`), never abbreviations (settled by Badge; Button's `ui-btn` renames in the same cleanup)
```

- [ ] **Step 5: Record the target-size floor** — in § Interaction and accessibility floor:

```markdown
- Interactive sub-controls have a ≥24×24px hit area (WCAG 2.5.8) even when the glyph is smaller — pad the button, not the icon (settled by Badge)
```

- [ ] **Step 6: Record the deliberate MUI Chip cuts (P2, decision 4)** — in § Open items:

```markdown
- Badge `size` prop — MUI Chip ships `small | medium`; cut under ARCHITECTURE's "API surface exactly as large as the products need". Trigger: a consuming product needs a second badge size
- Badge remove-icon override — Button's `loadingIndicator` precedent. Trigger: a consuming product needs a custom remove glyph
```

- [ ] **Step 7: Verify** — `pnpm spell && pnpm format`. Expected: PASS.

### Task 1.9: Changeset split and accuracy (P6, P1), deviation log (D7)

**Files:**
- Modify: `.changeset/badge-component.md`
- Create: `.changeset/button-variant-type-rename.md`
- Modify: `docs/superpowers/plans/2026-07-04-foundation-components.md` (§ Execution deviations log)

- [ ] **Step 1: Rewrite the badge changeset** — drop the rename bullet, correct the RSC claim:

```markdown
---
'@williamphelps13/ui': minor
---

New component: Badge — status label with four intents, optional start icon, and an accessible remove button

- `<Badge intent="success" startIcon={...} onRemove={...}>Active</Badge>`; the badge body is never interactive, the remove control is a real button with a localizable `removeLabel`
- Server-renderable with zero JavaScript when `onRemove` is not passed; passing `onRemove` requires a client-component call site
```

- [ ] **Step 2: Create the rename changeset:**

```markdown
---
'@williamphelps13/ui': minor
---

Breaking (types only): Button's exported variant types renamed `Intent` → `ButtonIntent` and `Size` → `ButtonSize` so barrel exports cannot collide as components are added
```

- [ ] **Step 3: Add the Phase 3 deviation-log entries:**

```markdown
- Phase 3: Badge consumes no surface/border/muted tokens — the plan's "first consumer" line assumed a bordered/tonal badge, but the MUI Chip target is filled-solid, so Badge rides the intent bg/fg pairs; the surface/border semantics wait for the field system (Phase 4)
- Phase 3: Badge is server-renderable with an optional `onRemove` callback (hybrid RSC posture) — recorded in conventions § Server and client; `onRemove` receives the click event (MUI `onDelete(event)` parity)
- Phase 3: 2026-07-06 library review ran mid-phase (`docs/reviews/2026-07-06-library-review.md`); its Batch 1 landed in this PR
```

- [ ] **Step 4: Verify** — `pnpm spell && pnpm format`. Expected: PASS.

### Task 1.10: Batch 1 gates, review checkpoint, visual gate, commit

- [ ] **Step 1: Full gate run** — `pnpm build && pnpm typecheck && pnpm lint && pnpm knip && pnpm spell && pnpm format && pnpm test && pnpm verify:pack && pnpm verify:types && pnpm assert:use-client`. Expected: all green.
- [ ] **Step 2: Re-read all five persistent docs end-to-end** (update protocol — Tasks 1.7/1.8 touched two of them).
- [ ] **Step 3: Dispatch the review-checkpoint subagent** on `git diff HEAD` vs ARCHITECTURE.md, conventions, and this plan; fix Critical/Important findings.
- [ ] **Step 4: Owner visual gate** — restart Storybook (confirm the old process exited), exercise every Badge state in both themes plus forced-colors; `preview-stories` MCP URLs in the reply.
- [ ] **Step 5: Propose the commit** — `feat(badge): status label with intents, start icon, and removable variant` (body links the deviation log); wait for approval, then push and open the PR.

---

## Batch 2 — Silent-regression gates (PR `chore(gates)`; a PR is required to prove TurboSnap behavior)

Fixes: C1, C2, T1, T2, T3, T4, T6. Branch off `main` after `feat/badge` merges.

### Task 2.1: Chromatic sees CSS and token changes (C1)

**Files:**
- Modify: `chromatic.config.json`

- [ ] **Step 1: Validate the option against current Chromatic docs** — `pnpm dlx ctx7@latest library "Chromatic" "TurboSnap externals for files processed outside the bundler"`, then fetch docs for the best match. Confirm the config-file key name and glob semantics.
- [ ] **Step 2: Add the externals** (adjust key name if Step 1 says otherwise):

```json
  "externals": ["tokens/**", "style-dictionary.config.mjs", "src/**/*.css"]
```

- [ ] **Step 3: Verification is Task 2.8** (needs a merged config and a follow-up CSS-only PR).

### Task 2.2: Execute the built JavaScript (C2)

**Files:**
- Create: `scripts/smoke-dist.mjs`
- Modify: `package.json` (script + `prepublishOnly`), `.github/workflows/ci.yml`

- [ ] **Step 1: Write the smoke script:**

```js
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'

// Renders every export of the BUILT package. Static gates (greps, attw,
// publint) never execute dist JS; a tsdown/react-compiler upgrade that emits
// a broken import or miscompiled component passes them all. Every export
// must be listed here — an unlisted one fails, so new components can't skip.
const PROPS = {
  Button: { children: 'smoke' },
  Badge: { children: 'smoke' },
}

const mod = await import('../dist/index.mjs')
let failed = false
for (const [name, value] of Object.entries(mod)) {
  if (typeof value !== 'function') continue
  const props = PROPS[name]
  if (!props) {
    console.error(`FAIL: dist export ${name} has no smoke props — add it to PROPS`)
    failed = true
    continue
  }
  const html = renderToString(createElement(value, props))
  if (!html.includes('smoke')) {
    console.error(`FAIL: ${name} rendered without its children: ${html.slice(0, 120)}`)
    failed = true
  }
}
if (failed) process.exit(1)
console.log(`OK: dist smoke render passed (${Object.keys(PROPS).length} components)`)
```

- [ ] **Step 2: Wire it** — `package.json` scripts: `"smoke:dist": "node scripts/smoke-dist.mjs"`; append `&& pnpm smoke:dist` to `prepublishOnly`; in `ci.yml` add `- run: pnpm smoke:dist` directly after `- run: pnpm assert:use-client`.
- [ ] **Step 3: Prove it fails on breakage** — temporarily rename `Button` to `Buttonx` in PROPS, run `pnpm build && pnpm smoke:dist`. Expected: FAIL (no smoke props). Revert.
- [ ] **Step 4: Run clean** — `pnpm smoke:dist`. Expected: OK line.

### Task 2.3: Theme-parity guard checks values (T1)

**Files:**
- Modify: `scripts/assert-theme-parity.mjs`

- [ ] **Step 1: Add the value check** — after the key-parity block, before the final `console.log`:

```js
// The dark build emits only reference-valued tokens (isSemantic filter in
// style-dictionary.config.mjs). A raw value in either theme set passes key
// parity but is silently dropped from the emitted CSS — dark then inherits
// the light value. So every themed $value must be a reference.
function rawValued(node, prefix = '') {
  const out = []
  for (const [k, v] of Object.entries(node)) {
    const path = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object' && !Array.isArray(v) && !('$value' in v)) {
      out.push(...rawValued(v, path))
    } else if (v && typeof v === 'object' && !String(v.$value).startsWith('{')) {
      out.push(path)
    }
  }
  return out
}
const raw = [...rawValued(light, 'light'), ...rawValued(dark, 'dark')]
if (raw.length) {
  console.error(`FAIL: themed tokens must be references (raw values are dropped from the dark build): ${raw.join(', ')}`)
  process.exit(1)
}
```

- [ ] **Step 2: Prove it catches the bypass** — temporarily set `dark.color.danger-bg.$value` to `"#ff0000"`, run `pnpm tokens`. Expected: FAIL with the new message. Revert.
- [ ] **Step 3: Run clean** — `pnpm tokens`. Expected: OK.

### Task 2.4: Assert cascade layers in the shipped bundle (T3)

**Files:**
- Create: `scripts/assert-css-layers.mjs`
- Modify: `package.json` (`css` script)

- [ ] **Step 1: Write the assertion:**

```js
import { readFileSync } from 'node:fs'

// The override contract depends on the shipped bundle declaring Tailwind v4's
// exact layer names in order (see src/styles/index.css header). A Lightning
// CSS upgrade or index.css edit that drops/renames a layer ships green —
// only this check and a real two-stylesheet render catch it.
const css = readFileSync('dist/styles.css', 'utf8')
const DECLARATION = /@layer theme\s*,\s*base\s*,\s*components\s*,\s*utilities[;{]/
let failed = false
if (!DECLARATION.test(css)) {
  console.error('FAIL: dist/styles.css lacks the `@layer theme, base, components, utilities` declaration')
  failed = true
}
for (const layer of ['theme', 'components']) {
  if (!new RegExp(`@layer ${layer}\\s*\\{`).test(css)) {
    console.error(`FAIL: dist/styles.css has no populated @layer ${layer} block`)
    failed = true
  }
}
if (failed) process.exit(1)
console.log('OK: dist/styles.css cascade-layer contract holds')
```

- [ ] **Step 2: Wire it** — `css` script becomes `node scripts/assert-css-imports.mjs && lightningcss --bundle --minify src/styles/index.css -o dist/styles.css && node scripts/assert-css-layers.mjs`.
- [ ] **Step 3: Prove it fails** — temporarily rename `theme` to `ui-theme` in `src/styles/index.css:21`, run `pnpm css`. Expected: FAIL. Revert.
- [ ] **Step 4: Run clean** — `pnpm build`. Expected: OK line after the css step.

### Task 2.5: Automated coverage for interactive-state styles (T2)

**Files:**
- Modify: `src/components/button/button.stories.tsx`, `src/components/badge/badge.stories.tsx`

- [ ] **Step 1: Button focus ring + hover lift assertions** — add after `DisabledBlocksClicks`:

```tsx
// Guards the interaction-state CSS: deleting the :hover or :focus-visible
// blocks keeps every other gate green (Chromatic snapshots resting states).
export const StateStyles = meta.story({
  tags: ['!autodocs'],
  parameters: { chromatic: { disable: true } },
  play: async ({ canvas, userEvent }) => {
    const button = canvas.getByRole('button', { name: 'Button' })
    const resting = getComputedStyle(button).boxShadow
    await userEvent.hover(button)
    await expect(getComputedStyle(button).boxShadow).not.toBe(resting)
    await userEvent.unhover(button)
    await userEvent.tab()
    await expect(button).toHaveFocus()
    const focused = getComputedStyle(button)
    await expect(focused.outlineWidth).toBe('2px')
    await expect(focused.outlineStyle).toBe('solid')
  },
})
```

- [ ] **Step 2: Badge remove-button focus ring assertion** — add after `RemoveInteraction`:

```tsx
export const RemoveFocusRing = meta.story({
  args: { children: 'Removable', onRemove: fn() },
  tags: ['!autodocs'],
  parameters: { chromatic: { disable: true } },
  play: async ({ canvas, userEvent }) => {
    await userEvent.tab()
    const removeButton = canvas.getByRole('button', { name: 'Remove' })
    await expect(removeButton).toHaveFocus()
    const focused = getComputedStyle(removeButton)
    await expect(focused.outlineWidth).toBe('2px')
    await expect(focused.opacity).toBe('1')
  },
})
```

- [ ] **Step 3: Run** — `pnpm test`. Expected: PASS. If `userEvent.hover` does not trigger `@media (hover: hover)` styles in headless chromium, report the failure output and stop for guided debugging (do not delete the assertion to go green).
- [ ] **Step 4: Prove the guard** — temporarily delete button.css's `:focus-visible` block, run the story test. Expected: FAIL. Revert.

### Task 2.6: Publish path runs the gates (T4, decision 6)

**Files:**
- Modify: `.github/workflows/release.yml`

- [ ] **Step 1: Validate against changesets/action docs** (`ctx7`: "changesets action run tests before publish") — confirm pre-steps are the supported pattern.
- [ ] **Step 2: Add gate steps** after `pnpm install --frozen-lockfile` and before the changesets step:

```yaml
      # The Release workflow runs in parallel with CI (separate workflows, no
      # gating) and prepublishOnly is build-only — without these steps a
      # merge-skew break on main can publish. Duplicates CI by design.
      - uses: actions/cache@55cc8345863c7cc4c66a329aec7e433d2d1c52a9 # v6
        with:
          path: ~/.cache/ms-playwright
          key: ${{ runner.os }}-playwright-${{ hashFiles('pnpm-lock.yaml') }}
      - run: pnpm exec playwright install --with-deps chromium
      - run: pnpm typecheck
      - run: pnpm lint
      - run: pnpm build
      - run: pnpm test
```

- [ ] **Step 3: Verify** — workflow lints clean (`pnpm dlx action-validator .github/workflows/release.yml` or rely on the PR's Actions parse); real proof is the next Version Packages PR cycle.

### Task 2.7: Local `pnpm test` rebuilds the stylesheet (T6)

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Change the script** — `"test": "pnpm css && vitest run --coverage"` (the css step is fast and asserts imports + layers as a bonus; requires `pnpm tokens` to have run once, which `pnpm build` covers on fresh clones).
- [ ] **Step 2: Run** — `pnpm test`. Expected: css build output, then the full suite green.

### Task 2.8: Batch 2 gates, PR, and TurboSnap proof

- [ ] **Step 1: Full gate run** (same chain as Task 1.10 Step 1). Expected: green.
- [ ] **Step 2: Review checkpoint subagent** on the diff; fix Critical/Important.
- [ ] **Step 3: Propose commit(s)** — `chore(gates): close silent-regression gaps from 2026-07-06 review`; push, open PR, merge on approval.
- [ ] **Step 4: Prove C1 is fixed** — open a follow-up PR changing only a CSS comment in `button.css`; expected: the Chromatic job reports a full build (or story snapshots > 0), not "0 stories affected". Record the result in the review doc's C1 entry, then merge or close the probe PR.

---

## Batch 3 — Documentation factual corrections (direct commit to `main`)

Fixes: C3, D1, D2, D3, D4, D5, D6, D15, D16, D17 (ARCHITECTURE items). One commit: `docs: correct factual drift found by 2026-07-06 review`.

### Task 3.1: ARCHITECTURE.md corrections

**Files:**
- Modify: `ARCHITECTURE.md`

- [ ] **Step 1 (C3):** in § Build externals bullet, replace "(Dialog will add Radix both places, spec §4.2)" with "(a component that needs a runtime dep adds the external and the peer dep together; none planned — Dialog is built on the native `<dialog>` element per the foundation plan)".
- [ ] **Step 2 (D1):** in § Component model "Surfaces that match MUI", replace "focus-visible signaled by elevation depth (between hover and active; no static ring)" with "focus-visible elevation step (between hover and active) reinforcing the 2px `--ui-color-ring` outline (see § Styling)".
- [ ] **Step 3 (D2):** in § Cross-cutting accessibility, replace the reduced-motion bullet with: "Respect `prefers-reduced-motion`: every transition and animation is disabled under `@media (prefers-reduced-motion: reduce)` (Button and Badge are the references)".
- [ ] **Step 3b (Batch 1 reviewer finding):** in § Server and client boundary, the binary framing "purely-visual server-renderable components add a file-level `\"use no memo\"`" gains the hybrid clause: "a server-renderable component may still expose optional callback props (Badge's `onRemove`) — see conventions § Server and client".
- [ ] **Step 4 (D3):** in § Release, replace "merging it runs `pnpm release` (`pnpm build && changeset publish`)" with "merging it runs `pnpm release` (`changeset publish`; the build and verifications run in `prepublishOnly`)".
- [ ] **Step 5 (D4):** replace the § Status list with the current truth:

```markdown
- ✅ Milestone 0 (foundation, tokens, styling harness, Button, workflow loop); Phase 6 comparison superseded by the swfllive component assessment
- Active: foundation-components plan (`docs/superpowers/plans/2026-07-04-foundation-components.md`) — ✅ Phase 0 docs, ✅ Phase 1 default theme, ✅ Phase 2 conventions + skill, ✅ Phase 3 Badge; next: Phase 4 field system
```

(Adjust the Phase 3 mark to match reality on commit day.)
- [ ] **Step 6 (D15):** delete "The most-corrected area." and the parenthetical "(its three verification premises held: …)" from § Styling; delete "— the 0.18.2 environmental crash was fixed upstream in 0.18.3" from § Quality gates; in the RTL bullet replace "(likely Tabs, Menu, or Tooltip post-§4.1)" with "(none in the foundation set)".
- [ ] **Step 7 (D16):** add file-map rows:

```markdown
| `tsconfig.node.json` | root `*.config.ts` type-checking (typecheck pass 3) |
| `.storybook/brand-swfllive.css` | brand-preset override sheet for the Palette toolbar (rebrand proof) |
```

- [ ] **Step 8 (D17):** "### See Also" → "### See also"; in § Invariants replace "is baked into the emit" with "is fixed at build time".

### Task 3.2: CLAUDE.md, workflow.md, tokens/README.md corrections

**Files:**
- Modify: `CLAUDE.md`, `docs/workflow.md`, `tokens/README.md`

- [ ] **Step 1 (D5):** CLAUDE.md § Common commands: `pnpm exec tsdown` → `pnpm exec tsdown --tsconfig tsconfig.build.json` (matching the build script).
- [ ] **Step 2 (D3):** workflow.md § How releases work: same `pnpm release` correction as Task 3.1 Step 4.
- [ ] **Step 3 (D6):** tokens/README.md `core` bullet: "Never consumed directly." → "Color primitives are never consumed directly by components; dimension/type/duration primitives are (there is no semantic tier for them)."
- [ ] **Step 4: Gates + protocol** — `pnpm spell && pnpm format && pnpm lint`; re-read all five persistent docs; review checkpoint; propose the commit.

---

## Batch 4 — Documentation deduplication (direct commit to `main`)

Fixes: D8, D9, D10, D11, D12, D13, D14. One commit: `docs: deduplicate cross-doc content to declared single copies`.

### Task 4.1: Rewrite the add-component skill as pointers (D8, D9, D10, D11)

**Files:**
- Modify: `.claude/skills/add-component/SKILL.md`

- [ ] **Step 1: Replace the restating steps.** Keep the checklist shape and every step number; steps 2, 3, 4, 8, and 12–15 become pointers. Exact replacements:

Step 2 body →

```markdown
2. Gather references in authority order — the hierarchy lives in ARCHITECTURE § "Component growth" (single copy). Read the swfllive counterpart for requirements, MUI's implementation as design target (extracting its concrete metrics into the phase notes before writing CSS — keep this clause, it was added after invented badge dimensions passed every review), cross-checks only for suspected gaps
```

Step 3 body →

```markdown
3. Make the RSC decision explicitly — rule and mechanism in `docs/component-conventions.md` § "Server and client"; record the decision and reason in the deviation log or PR body
```

Step 4 body →

```markdown
4. Scaffold `src/components/<name>/` — `variants.ts`, `<name>.tsx`, `<name>.css`, `variants.test.ts` per `docs/component-conventions.md` § "API shape" and § "Variants and styling" (single copy of the pattern)
```

Step 8 body →

```markdown
8. Write `<name>.stories.tsx` — the five-story set per `docs/component-conventions.md` § "Stories and tests" (single copy)
```

Steps 12–15 →

```markdown
12. Add a changeset (`pnpm changeset`, minor; see `docs/workflow.md` step 1)
13. Dispatch the review checkpoint (CLAUDE.md § "How we work")
14. Owner visual gate (CLAUDE.md § "How we work")
15. Ask before committing (CLAUDE.md § "Commit conventions")
```

- [ ] **Step 2: Trim the frontmatter description** to trigger phrasing plus a one-line scope ("Walks a new component from name through commit using the repo's conventions docs") — the hierarchy summary moves out.
- [ ] **Step 3: Fix the gate chain (D11)** — step 9 points at CLAUDE.md § Common commands instead of restating ten commands; keep the literal chain only if the owner prefers copy-paste (owner call at execution).

### Task 4.2: Conventions and ARCHITECTURE internal dedup (D8, D11)

**Files:**
- Modify: `docs/component-conventions.md`, `ARCHITECTURE.md`

- [ ] **Step 1:** conventions § Reference discipline: delete the "Short version for daily use: …" sentence — keep only the pointer to ARCHITECTURE § Component growth.
- [ ] **Step 2:** conventions § Stories and tests line 40: drop "(automation trigger: component #3)" (the open-items entry is the single copy of that trigger).
- [ ] **Step 3:** ARCHITECTURE § Server and client boundary: the React Compiler/`useMemoCache` mechanism is explained in § Build — replace the repeated explanation with "(mechanism in § Build)". § Styling bullet 2: replace the repeated `--ui-` collision rationale with "(rationale in § Tokens)".

### Task 4.3: tokens/README slim-down (D11, D14)

**Files:**
- Modify: `tokens/README.md`

- [ ] **Step 1: Rewrite to Figma-sync mechanics only** — keep § Figma sync and the reference-syntax note; replace § Why single-file, § Structure, and § Build with two lines pointing at ARCHITECTURE § Tokens; remove the bolding throughout (doc rules apply — see Task 4.4 Step 2).

### Task 4.4: CLAUDE.md and workflow.md dedup (D11, D12, D13, D14)

**Files:**
- Modify: `CLAUDE.md`, `docs/workflow.md`, `docs/superpowers/plans/2026-07-04-remediation.md`

- [ ] **Step 1 (D11):** CLAUDE.md cascade-layer gotcha: delete it entirely — after Task 2.4, `assert-css-layers.mjs` machine-guards the failure, so per CLAUDE.md's own curation rule ("the tooling won't clearly catch it next time") the gotcha no longer qualifies; the script comment and `src/styles/index.css` header own the why.
- [ ] **Step 2 (D14):** CLAUDE.md § Documentation: "Five docs persist long-term: …" → "Seven docs persist long-term: README.md, CLAUDE.md, ARCHITECTURE.md, AGENTS.md, tokens/README.md, docs/workflow.md, docs/component-conventions.md — the rules below govern all of them."
- [ ] **Step 3 (D13):** CLAUDE.md "One source for current state" bullet: "The deviation log" → "The active plan's deviation log (currently `2026-07-04-foundation-components.md`; executed plans' logs are frozen history)".
- [ ] **Step 4 (D11):** workflow.md step 2: replace the partial gate list with "run the gate suite (CLAUDE.md § Common commands)"; delete the two provenance sentences (line 3 "Written from two real…" and line 33 "The spec listed…") (D15-adjacent, same commit).
- [ ] **Step 5 (D12):** superseded by Task 4.5 — the remediation plan is deleted, not annotated.
- [ ] **Step 6: Gates + protocol** — `pnpm spell && pnpm format`; re-read all persistent docs end-to-end (this batch touched five); review checkpoint; propose the commit.

### Task 4.5: Delete superseded historical docs (owner approved 2026-07-06)

**Files:**
- Delete: `docs/superpowers/specs/2026-05-17-component-library-design.md`, `docs/superpowers/plans/2026-05-17-component-library-milestone-0.md`, `docs/superpowers/plans/2026-07-04-remediation.md`, `docs/reviews/2026-07-04-repo-review.md`
- Modify: `ARCHITECTURE.md` (§ See also), `CLAUDE.md` (precedence line), `docs/superpowers/plans/2026-07-04-foundation-components.md` (milestone-plan pointer), any other referrer found by grep

- [ ] **Step 1: Find every reference** — `grep -rn '2026-05-17\|remediation\|repo-review' --include='*.md' .` (excluding the files being deleted). Fix each: ARCHITECTURE § See also drops the spec entry and re-words the plan/review entries to "the active plan (`docs/superpowers/plans/`)" and "dated audits (`docs/reviews/`)"; CLAUDE.md's "precedence: `ARCHITECTURE.md` > spec > plan and deviation log" becomes "precedence: `ARCHITECTURE.md` > the active plan and its deviation log"; the foundation plan's line referencing the milestone plan's deviation log gets "(plan since deleted; history in git)".
- [ ] **Step 2: Delete the four files** — `git rm` them.
- [ ] **Step 3: Verify no dangling links** — re-run the grep; `pnpm spell && pnpm lint`. Expected: no matches outside git history, gates green.

---

## Batch 5 — Component and token polish (commits to `main`, changesets included)

Fixes: K1, K2, K3, P4 (decision 2 execution). Commit separately per task.

### Task 5.1: Privatize `--ui-btn-elevation` (K1)

**Files:**
- Modify: `src/components/button/button.css` (5 occurrences), `docs/component-conventions.md`
- Create: `.changeset/private-elevation-var.md`

- [ ] **Step 1:** rename all `--ui-btn-elevation` → `--_ui-btn-elevation` (declaration line 31 and the four state re-bindings; underscore marks private, Open Props convention).
- [ ] **Step 2:** conventions § Variants and styling, add: "Component-internal custom properties use the `--_ui-` prefix — everything under `--ui-*` is the public override surface (settled by Button's elevation variable)".
- [ ] **Step 3:** changeset (patch): "Internal: Button's per-state elevation variable is now `--_ui-btn-elevation` (private prefix). It was never documented; `--ui-shadow-*` remains the supported elevation override surface."
- [ ] **Step 4:** `pnpm css && pnpm test`. Expected: PASS (StateStyles from Task 2.5 exercises the hover lift).

### Task 5.2: Rename `ui-btn` → `ui-button` (P4, decision 2)

**Files:**
- Modify: `src/components/button/variants.ts`, `button.css`, `button.tsx` (class-name literals), `button.stories.tsx` (none expected — verify), `src/components/button/variants.test.ts`
- Create: `.changeset/button-class-rename.md`

- [ ] **Step 1:** update `variants.test.ts` expectations to `ui-button …` first, run `pnpm test`. Expected: FAIL (still `ui-btn`).
- [ ] **Step 2:** global rename in the button directory: every `ui-btn` literal → `ui-button` (variants maps, `buttonClasses` return, all CSS selectors, the JSX literals `ui-btn-spinner`, `ui-btn-spinner-svg`, `ui-btn-content`, `ui-btn-content-loading`, `ui-btn-icon-start`, `ui-btn-icon-end`, `ui-btn-full-width`, keyframe names `ui-btn-ripple`/`ui-btn-spin`). Verify no stragglers: `grep -rn 'ui-btn' src/ .storybook/`. Expected: no matches.
- [ ] **Step 3:** `pnpm build && pnpm test`. Expected: PASS.
- [ ] **Step 4:** changeset (minor): "Breaking (CSS classes): Button's class prefix is now `ui-button-*` (was `ui-btn-*`) — class prefixes use the full component name. Update any consumer CSS override selectors."
- [ ] **Step 4b:** conventions § Variants and styling: delete the now-stale clause "(settled by Badge; Button's `ui-btn` renames in the review-fixes cleanup)" — the rename has landed, the forward reference must not persist.
- [ ] **Step 5:** Chromatic re-baselines are expected; owner accepts them knowingly.

### Task 5.3: README spacing clause + hover-derivation decision record (K2, K3)

**Files:**
- Modify: `README.md`, `ARCHITECTURE.md`

- [ ] **Step 1 (K2):** README dimensions line → "`--ui-spacing-0/1/2/3/4/5/6/8/10` — rem-based spacing scale (gaps, padding); no 7 or 9 step".
- [ ] **Step 2 (K3):** ARCHITECTURE § Component model, extend the oklch deviation bullet with one sentence: "Chosen over Radix-style hover tokens so one `-bg` override re-derives its hover/active shifts — the cost is per-theme shift rules in CSS."
- [ ] **Step 3:** gates, protocol re-read, review checkpoint, propose commits.

### Task 5.4: Close the review

**Files:**
- Modify: `docs/reviews/2026-07-06-library-review.md`

- [ ] **Step 1:** flip the status line to `Status: HISTORICAL — all findings remediated via docs/superpowers/plans/2026-07-06-review-fixes.md (batches 1–5); C1's fix verified on a CSS-only probe PR.` Note any finding deliberately left open with its named trigger (T5's dual-theme axe automation fires at component #3).
- [ ] **Step 2:** propose the final commit — `docs(reviews): close 2026-07-06 review`.

---

## Explicitly out of scope (named triggers, per deferral discipline)

- T5 dual-theme axe automation — existing named trigger: component #3 (the next component build must execute it)
- Tonal badge styling, `outline` Button variant, dark elevation strategy — pre-existing open items with triggers in conventions § Open items
- Switching hover colors to Radix step-10 tokens — trigger recorded in Task 5.3 Step 2
