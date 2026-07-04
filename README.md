# @williamphelps13/ui

A focused React component library for React 19 and the Next.js App Router.

- ESM-only
- React 19+ peer dep
- Server-renderable by default (`"use client"` per file where interactivity demands it)
- Ships one precompiled stylesheet (no CSS framework required on your end; plays well with Tailwind if you use it)
- Runtime theming via CSS-variable override — set `--ui-*` on `:root`; no rebuild needed

## Install

```bash
pnpm add @williamphelps13/ui
```

```tsx
import { Button } from '@williamphelps13/ui'
import '@williamphelps13/ui/styles.css' // one precompiled stylesheet

export default function Page() {
  return <Button intent="primary">Hello</Button>
}
```

## Theming

Every visual decision resolves through `--ui-*` CSS variables. Override them in your own `:root` (and `[data-theme="dark"]` for dark mode) to re-theme without rebuilding the library. All shipped styles live in cascade layers, so any unlayered CSS you write beats the library's defaults — no `!important` needed.

Semantic color variables (the primary override surface):

| Variable                | Role                               |
| ----------------------- | ---------------------------------- |
| `--ui-color-primary-bg` | Primary intent background          |
| `--ui-color-primary-fg` | Foreground on primary surfaces     |
| `--ui-color-neutral-bg` | Neutral intent background          |
| `--ui-color-neutral-fg` | Foreground on neutral surfaces     |
| `--ui-color-danger-bg`  | Danger intent background           |
| `--ui-color-danger-fg`  | Foreground on danger surfaces      |
| `--ui-color-success-bg` | Success intent background          |
| `--ui-color-success-fg` | Foreground on success surfaces     |
| `--ui-color-ring`       | Focus-visible ring on every intent |

Also public and override-stable — dimensions, elevation, and motion:

- `--ui-spacing-0` … `--ui-spacing-10` — rem-based spacing scale (gaps, padding)
- `--ui-radius-none/sm/md/lg/full` — corner radii
- `--ui-shadow-resting/raised/focus/pressed/flat` — elevation states
- `--ui-duration-fast/base/slow` — transition and animation timing
- `--ui-font-size-sm/md/lg`, `--ui-font-weight-semibold` — component type scale

Current default values live in [`tokens/tokens.json`](./tokens/tokens.json) (canonical) and the published `dist/styles.css` (compiled).

Two rules for safe overrides:

- Override in pairs — a `-bg` without its `-fg` (or vice versa) can drop the foreground below WCAG AA contrast. The defaults are AA-compliant in both modes.
- Override both themes — a `:root` override also wins over the library's dark-mode rebinding for elements outside a `[data-theme="dark"]` subtree, and inside one the dark default applies. If you re-theme light, re-theme dark in the same breath (as below).

```css
:root {
  --ui-color-primary-bg: oklch(0.55 0.2 320);
  --ui-color-primary-fg: oklch(1 0 0);
}
[data-theme='dark'] {
  --ui-color-primary-bg: oklch(0.7 0.18 320);
  --ui-color-primary-fg: oklch(0.18 0 0);
}
```

### Using with Tailwind

The stylesheet declares the same cascade layers as Tailwind v4 (`theme, base, components, utilities`), so it composes correctly in either import order: Preflight never strips component styling, and your utility classes (e.g. `<Button className="rounded-full">`) always win over component defaults. Library variables are all `--ui-`-prefixed — your `--color-*` theme is never touched.

### Dark mode

Activation is consumer-controlled — there is no automatic `prefers-color-scheme` wiring. Set `data-theme="dark"` on `<html>` (or any ancestor of the components you want themed):

```html
<html data-theme="dark">
  ...
</html>
```

Toggle from a small `"use client"` component if you want runtime switching.

## For contributors and AI agents

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) § "See Also" for the doc landscape (what each doc covers and the read order).

## License

MIT — see [`LICENSE`](./LICENSE).
