# @williamphelps13/ui

A focused React component library for React 19 and the Next.js App Router.

- ESM-only
- React 19+ peer dep
- Server-renderable by default (`"use client"` per file where interactivity demands it)
- Ships one precompiled stylesheet (no Tailwind install on your end)
- Runtime theming via CSS-variable override — set `--color-*` on `:root`; no rebuild needed

## Status

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) (status line at the top) for the canonical phase state.

## Install (once published)

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

Seven semantic CSS variables drive every component's colors. Override them in your own `:root` (and `[data-theme="dark"]` for dark mode) to re-theme without rebuilding the library.

| Variable             | Role                                     |
| -------------------- | ---------------------------------------- |
| `--color-primary`    | Primary intent background                |
| `--color-primary-fg` | Foreground on `--color-primary` surfaces |
| `--color-neutral-bg` | Neutral intent background                |
| `--color-neutral-fg` | Foreground on `--color-neutral-bg`       |
| `--color-danger`     | Danger intent background                 |
| `--color-danger-fg`  | Foreground on `--color-danger`           |
| `--color-ring`       | Focus ring on every intent               |

Current default values live in [`tokens/tokens.json`](./tokens/tokens.json) (canonical) and the published `dist/styles.css` (compiled).

Override in pairs — `--color-primary` without `--color-primary-fg` (or vice versa) can drop the foreground below WCAG AA contrast. The defaults are AA-compliant in both modes.

```css
:root {
  --color-primary: oklch(0.55 0.2 320);
  --color-primary-fg: oklch(1 0 0);
}
[data-theme='dark'] {
  --color-primary: oklch(0.7 0.18 320);
  --color-primary-fg: oklch(0.18 0 0);
}
```

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
