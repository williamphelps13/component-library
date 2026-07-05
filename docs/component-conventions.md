# Component conventions

The canonical pattern every component follows. This document is authority layer 1 for component decisions (see ARCHITECTURE § Component growth): a convention written here ends the question — references are not consulted for it again. It grows as each foundation component settles new patterns; a convention lands here only once it is proven in a merged component.

Settled by Button and the 2026-07 remediation. Sections note which component settled them.

## API shape

- Named exports only; the barrel (`src/index.ts`) re-exports the component, its props type, and its variant unions
- Props extend the relevant DOM attributes and spread `...rest` onto the element; `className` merges after the variant classes so consumer classes win ties
- `ref` is a plain prop (`ref?: Ref<HTMLButtonElement>`), no `forwardRef` — React 19 idiom
- Prop grammar: `intent` (color role), `size`, `loading`, `disabled`, `fullWidth` — unprefixed adjectives, not `isX` booleans
- Variant unions carry per-value JSDoc on the type itself; the prop's JSDoc describes the role, not the values (single source of truth for autodocs)
- Every exported prop and type carries consumer-grade JSDoc — `react-docgen-typescript` publishes it in autodocs, so it is API surface
- Convention-based surface, not composition: the component owns its internal parts (`<Button loading>`, not `<Button><Spinner/></Button>`); behavior primitives are wrapped internally, never re-exported
- No test-id props in the public API — consumers pass `data-testid` through `...rest` if they need one

## Variants and styling

- `variants.ts`: typed `Record<Variant, string>` maps joined by one pure function (`buttonClasses(intent, size)`). TS forces a class per union member; the pure function gets a unit test
- Class names are `ui-`-prefixed literals (`ui-btn-primary`) — searchable in both directions between TSX and CSS
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
- Content hidden during loading uses `opacity: 0`, not `visibility: hidden` — the label must stay in the accessibility tree; pair with `aria-busy` and `disabled`
- axe runs as a failing test (`parameters.a11y.test: 'error'`) on every story, both themes via the hand-authored `Dark*` stories (automation trigger: component #3)

## Server and client

- Server-renderable by default: presentational components carry file-level `"use no memo"` (opting out of React Compiler memoization, which would inject hooks) and ship zero JavaScript
- `"use client"` only where the component itself owns interactivity (event wiring, state); the barrel never carries it
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

- `outline` Button variant (swfllive's secondary is transparent-with-ring) — trigger: a consuming product needs the outlined style
- Dual-theme axe automation replacing hand-authored `Dark*` stories — trigger: component #3
- Dark elevation strategy (shadows are near-invisible on dark surfaces; dark `shadow.*` semantics can rebind) — trigger: first component whose dark elevation reads wrong in the owner visual gate
