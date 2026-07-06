# Component conventions

The canonical pattern every component follows. This document is authority layer 1 for component decisions (see ARCHITECTURE § Component growth): a convention written here ends the question — references are not consulted for it again. It grows as each foundation component settles new patterns; a convention lands here once a component proves it, and the proving component's PR carries the convention change.

Settled by Button and the 2026-07 remediation. Sections note which component settled them.

## API shape

- Named exports only; the barrel (`src/index.ts`) re-exports the component, its props type, and its variant unions
- Props extend the relevant DOM attributes and spread `...rest` onto the element; `className` merges after the variant classes so consumer classes win ties
- `ref` is a plain prop (`ref?: Ref<HTMLButtonElement>`), no `forwardRef` — React 19 idiom
- Prop grammar: `intent` (color role), `size`, `loading`, `disabled`, `fullWidth` — unprefixed adjectives, not `isX` booleans
- Variant unions carry per-value JSDoc on the type itself; the prop's JSDoc describes the role, not the values (single source of truth for autodocs)
- Variant union types export with component-prefixed names (`ButtonIntent`, `BadgeIntent`) so barrel exports cannot collide (settled by Badge)
- Internal interactive sub-controls (a badge's remove button) are real `<button>` elements with a localizable accessible-name prop (`removeLabel?: string` with an English default), and inherit the parent's foreground via `currentColor` so consumer token overrides reach them for free (settled by Badge)
- Every exported prop and type carries consumer-grade JSDoc — `react-docgen-typescript` publishes it in autodocs, so it is API surface
- Convention-based surface, not composition: the component owns its internal parts (`<Button loading>`, not `<Button><Spinner/></Button>`); behavior primitives are wrapped internally, never re-exported
- No test-id props in the public API — consumers pass `data-testid` through `...rest` if they need one

## Variants and styling

- `variants.ts`: typed `Record<Variant, string>` maps joined by one pure function (`buttonClasses(intent, size)`). TS forces a class per union member; the pure function gets a unit test
- Class names are `ui-`-prefixed literals using the full component name (`ui-badge-primary`), never abbreviations — searchable in both directions between TSX and CSS (settled by Badge; Button's `ui-btn` renames in the review-fixes cleanup)
- All styling lives in the co-located `<name>.css`, imported into `layer(components)` by `src/styles/index.css` (one line; `assert-css-imports.mjs` fails the build if missing)
- Every visual value resolves through a `--ui-*` token — no hardcoded colors, spacing, radii, shadows, durations, or font sizes in component CSS. A styling need the tokens cannot express escalates to the token layer for a system-wide answer
- Disabled states use `opacity: 0.5` + `cursor: not-allowed`, not dedicated disabled tokens (Button precedent)
- Dark-theme rules use `:where([data-theme='dark'])` ancestors; dark solids are light-colored with near-black text, so interactive color shifts lighten in dark and darken in light

## Interaction and accessibility floor

Every interactive component ships all of these; none rely on browser defaults silently:

- Six states where applicable: idle, hover, active, focus-visible, disabled, loading
- Hover effects gated behind `@media (hover: hover)` (no sticky hover on touch)
- Focus-visible: 2px outline in `--ui-color-ring` with `outline-offset: 2px`, plus any component-specific reinforcement (Button adds an elevation step)
- `@media (prefers-reduced-motion: reduce)`: all transitions and animations disabled
- `@media (forced-colors: active)`: borders in system colors where backgrounds collapse; focus ring switches to `Highlight`
- Text zoom safety: `min-height`, never fixed `height`, on text-bearing controls (WCAG 1.4.4)
- Interactive sub-controls have a ≥24×24px hit area (WCAG 2.5.8) even when the glyph is smaller — pad the button, not the icon (settled by Badge)
- Content hidden during loading uses `opacity: 0`, not `visibility: hidden` — the label must stay in the accessibility tree; pair with `aria-busy` and `disabled`
- axe runs as a failing test (`parameters.a11y.test: 'error'`) on every story, both themes via the hand-authored `Dark*` stories (automation trigger: component #3)

## Server and client

- Server-renderable by default: presentational components carry file-level `"use no memo"` (opting out of React Compiler memoization, which would inject hooks) and ship zero JavaScript
- `"use client"` only where the component creates its own interactivity — state or handlers it defines itself (a click-point ripple's `useState`); forwarding a consumer-supplied callback (Button's `onClick`, Badge's `onRemove`) does not require it. The barrel never carries it
- A server-renderable component may expose optional callback props (Badge's `onRemove`): the static render ships zero JS, and the prop's JSDoc must state that passing it requires a client-component call site (settled by Badge)
- `assert-use-client.mjs` enforces the split at build time; the RSC decision is made explicitly per component and recorded in its phase notes

## Stories and tests

The five-story set per component (autodocs pages come free from the global `tags: ['autodocs']` cascade in `.storybook/preview.tsx`):

1. Variant baselines — one one-liner story per public variant (`export const Primary = meta.story({ args: { intent: 'primary' } })`); story names carry the meaning, no description blocks
2. State baselines — render-only stories for visually distinct states (Disabled, Loading), captured by Chromatic and scanned by axe
3. Interaction tests — one `play` story per interaction the component owns; skip native behavior it does not customize
4. Override demo — a story wrapping the component in an ancestor that sets `--ui-*` tokens, proving the runtime theming contract; it must override a variable the component actually consumes
5. `AllVariants` matrix — `tags: ['!autodocs']`, controls disabled, `parameters.chromatic.modes: { light, dark }` as the dual-theme visual baseline

Unit tests cover pure logic (`variants.test.ts` pattern): exhaustive variant enumeration plus a literal-class-presence check against the component's stylesheet. Behavior lives in play functions, not class-name assertions.

## Reference discipline (per component build)

The authority hierarchy lives in ARCHITECTURE § "Component growth" — that list is the single copy. Short version for daily use: a convention written here ends the question; MUI is the sole design target; the swfllive counterpart supplies requirements only; everything else is a cross-check; styling resolves through tokens or escalates to the token layer.

## Open items with named triggers

- Tonal (subtle-tint) badge/chip styling — swfllive's badges are tonal, but MUI Chip's filled-solid is the design target and tonal needs a new token tier (per-intent subtle bg/fg, which Radix steps 3/11 per hue would supply). Trigger: a consuming product needs the subtle look
- Sub-8px spacing step (badge internals currently use `--ui-spacing-1` = 0.5rem as the smallest gap). Trigger: owner visual gate finds compact components too loose twice
- Badge `size` prop — MUI Chip ships `small | medium`; cut under ARCHITECTURE's "API surface exactly as large as the products need". Trigger: a consuming product needs a second badge size
- Badge remove-icon override — Button's `loadingIndicator` precedent. Trigger: a consuming product needs a custom remove glyph
- `outline` Button variant (swfllive's secondary is transparent-with-ring) — trigger: a consuming product needs the outlined style
- Dual-theme axe automation replacing hand-authored `Dark*` stories — trigger: component #3
- Dark elevation strategy (shadows are near-invisible on dark surfaces; dark `shadow.*` semantics can rebind) — trigger: first component whose dark elevation reads wrong in the owner visual gate
