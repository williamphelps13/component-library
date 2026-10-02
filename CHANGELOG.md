# @williamphelps13/ui

## 0.4.0

### Minor Changes

- [#47](https://github.com/williamphelps13/component-library/pull/47) [`9815534`](https://github.com/williamphelps13/component-library/commit/9815534e9b85f43e540479f11ef7a32c2dc9d525) Thanks [@williamphelps13](https://github.com/williamphelps13)! - New component: Badge — status label with four intents, optional start icon, and an accessible remove button

  - `<Badge intent="success" startIcon={...} onRemove={...}>Active</Badge>`; the badge body is never interactive, the remove control is a real button with a localizable `removeLabel`
  - `size: 'small' | 'medium'` (default `medium`) matching MUI Chip metrics; adds `--ui-spacing-1-5` and `--ui-font-size-xs` to the public token scale
  - Server-renderable with zero JavaScript when `onRemove` is not passed; passing `onRemove` requires a client-component call site

- [#51](https://github.com/williamphelps13/component-library/pull/51) [`83d90ab`](https://github.com/williamphelps13/component-library/commit/83d90ab296d349a3b9d0821d50c50023a2620b87) Thanks [@williamphelps13](https://github.com/williamphelps13)! - Breaking (CSS classes): Button's class prefix is now `ui-button-*` (was `ui-btn-*`) — class prefixes use the full component name. Update any consumer CSS override selectors.

- [#47](https://github.com/williamphelps13/component-library/pull/47) [`9815534`](https://github.com/williamphelps13/component-library/commit/9815534e9b85f43e540479f11ef7a32c2dc9d525) Thanks [@williamphelps13](https://github.com/williamphelps13)! - Breaking (types only): Button's exported variant types renamed `Intent` → `ButtonIntent` and `Size` → `ButtonSize` so barrel exports cannot collide as components are added

- [#45](https://github.com/williamphelps13/component-library/pull/45) [`07ae12c`](https://github.com/williamphelps13/component-library/commit/07ae12cd7881546186b5204c7ceda299b80046fd) Thanks [@williamphelps13](https://github.com/williamphelps13)! - Default theme designed from Radix Colors; new semantic tokens for surfaces, borders, inputs, and overlays

  - All default color values now come verbatim from Radix Colors 3.0.0 (slate neutrals, blue primary) — replacing the original placeholder palette. Every text pair holds WCAG AA in both themes; solid intent colors deepened accordingly (light primary is now `#0d74ce`).
  - New public override variables: `--ui-color-surface-bg/-fg`, `--ui-color-raised-bg/-fg`, `--ui-color-muted-fg`, `--ui-color-border`, `--ui-color-border-strong`, `--ui-color-input-bg`, `--ui-color-input-border`, `--ui-color-placeholder-fg`, `--ui-color-overlay`. Existing variable names are unchanged.
  - Dark mode intents are now light-colored solids with near-black text (the MUI dark-palette pattern); Button hover/active lightens in dark mode for all intents.
  - Internal color primitives renamed to Radix scale names (`--ui-color-slate-6`, `--ui-color-blue-11`). Primitives are internal — the semantic variables above remain the stable contract.

- [#41](https://github.com/williamphelps13/component-library/pull/41) [`c166b0b`](https://github.com/williamphelps13/component-library/commit/c166b0b3003c7e3ae240719d9b86db54682c5f6e) Thanks [@williamphelps13](https://github.com/williamphelps13)! - Breaking: CSS architecture overhaul — the override contract is now `--ui-*`

  - All CSS variables renamed with the `--ui-` prefix and consistent `-bg`/`-fg` semantics: `--color-primary` → `--ui-color-primary-bg`, `--color-neutral-bg` → `--ui-color-neutral-bg`, etc. Unprefixed names collided with Tailwind v4's reserved theme variables and silently re-themed consumer apps (`rounded-md`, `bg-blue-*`).
  - All shipped styles now live inside cascade layers named to compose with Tailwind v4 (`theme, base, components, utilities`) in either import order: Preflight no longer strips component styling, and consumer utility classes (e.g. `className="rounded-full"`) now override component defaults.
  - New public tokens: `--ui-shadow-*` (elevation states), `--ui-duration-*` (motion), `--ui-font-size-*` / `--ui-font-weight-semibold` (type scale). Spacing and radius tokens are now rem-based (same rendered defaults).
  - Focus-visible now renders a real 2px ring using `--ui-color-ring` (previously documented but unused) in addition to the elevation change.
  - Button sizes use `min-height` instead of `height`, so text-only zoom no longer clips labels (WCAG 1.4.4).
  - Dark mode now sets `color-scheme: dark`, so native form controls and scrollbars match the theme.
  - Tailwind removed from the build; the stylesheet is plain CSS bundled and minified by Lightning CSS (smaller output, no framework variables shipped).

  Migration: replace `--color-X` overrides with `--ui-color-X-bg`/`--ui-color-X-fg` (see the README theming table for the full variable list).

### Patch Changes

- [#43](https://github.com/williamphelps13/component-library/pull/43) [`ab7354b`](https://github.com/williamphelps13/component-library/commit/ab7354b65fc00b318d340a455b53b487bb51e390) Thanks [@williamphelps13](https://github.com/williamphelps13)! - Packaging: add a `default` export condition (modern `require(esm)` consumers resolve instead of `ERR_PACKAGE_PATH_NOT_EXPORTED`) and a `./package.json` subpath for introspecting tools. Publishes are now guarded by `prepublishOnly` (fresh build + pack verification on every publish path).

- [#51](https://github.com/williamphelps13/component-library/pull/51) [`83d90ab`](https://github.com/williamphelps13/component-library/commit/83d90ab296d349a3b9d0821d50c50023a2620b87) Thanks [@williamphelps13](https://github.com/williamphelps13)! - Internal: Button's per-state elevation variable is now `--_ui-button-elevation` (private prefix). It was never documented; `--ui-shadow-*` remains the supported elevation override surface.

## 0.3.0

### Minor Changes

- [#28](https://github.com/williamphelps13/component-library/pull/28) [`d98163a`](https://github.com/williamphelps13/component-library/commit/d98163ab917c25fc0409cab65ee58df7b9ad3b26) Thanks [@williamphelps13](https://github.com/williamphelps13)! - Add `success` intent to `Button` — a positive/confirming action variant, themed via new `--color-success` / `--color-success-fg` tokens.

## 0.2.0

### Minor Changes

- [#22](https://github.com/williamphelps13/component-library/pull/22) [`e9cc573`](https://github.com/williamphelps13/component-library/commit/e9cc5730a21b0151e4898c32a6921cfe944fd66e) Thanks [@williamphelps13](https://github.com/williamphelps13)! - Add `fullWidth` prop to `Button` — stretches the button to fill its container.

## 0.1.1

### Patch Changes

- [#16](https://github.com/williamphelps13/component-library/pull/16) [`91961b7`](https://github.com/williamphelps13/component-library/commit/91961b713079333afa274f35f183d6bdbacb1509) Thanks [@williamphelps13](https://github.com/williamphelps13)! - Fix `Button` throwing in React Server Components. The React Compiler runs in `infer` mode (auto-memoizing every component), which compiled the hookless Button to import `useMemoCache` from `react/compiler-runtime` — a hook with no dispatcher in RSC. Server-renderable components now opt out with a file-level `"use no memo"` directive and ship hook-free. The Button renders in a Server Component with zero client JS, as documented.

## 0.1.0

### Minor Changes

- [#12](https://github.com/williamphelps13/component-library/pull/12) [`8c216c9`](https://github.com/williamphelps13/component-library/commit/8c216c9f22a922e0356229bcc5add01c5ee9b77c) Thanks [@williamphelps13](https://github.com/williamphelps13)! - Initial public release. Adds the `Button` component: six interactive states (idle, hover, active, focus-visible, disabled, loading), `loading`/`loadingIndicator`/`startIcon`/`endIcon` props, three sizes and three intents, and CSS-variable theming through the zero-specificity override contract. Server-renderable — no `"use client"`. Ships a precompiled `styles.css`.
