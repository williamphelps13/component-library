---
'@williamphelps13/ui': minor
---

Breaking: CSS architecture overhaul — the override contract is now `--ui-*`

- All CSS variables renamed with the `--ui-` prefix and consistent `-bg`/`-fg` semantics: `--color-primary` → `--ui-color-primary-bg`, `--color-neutral-bg` → `--ui-color-neutral-bg`, etc. Unprefixed names collided with Tailwind v4's reserved theme variables and silently re-themed consumer apps (`rounded-md`, `bg-blue-*`).
- All shipped styles now live inside cascade layers named to compose with Tailwind v4 (`theme, base, components, utilities`) in either import order: Preflight no longer strips component styling, and consumer utility classes (e.g. `className="rounded-full"`) now override component defaults.
- New public tokens: `--ui-shadow-*` (elevation states), `--ui-duration-*` (motion), `--ui-font-size-*` / `--ui-font-weight-semibold` (type scale). Spacing and radius tokens are now rem-based (same rendered defaults).
- Focus-visible now renders a real 2px ring using `--ui-color-ring` (previously documented but unused) in addition to the elevation change.
- Button sizes use `min-height` instead of `height`, so text-only zoom no longer clips labels (WCAG 1.4.4).
- Dark mode now sets `color-scheme: dark`, so native form controls and scrollbars match the theme.
- Tailwind removed from the build; the stylesheet is plain CSS bundled and minified by Lightning CSS (smaller output, no framework variables shipped).

Migration: replace `--color-X` overrides with `--ui-color-X-bg`/`--ui-color-X-fg` (see the README theming table for the full variable list).
