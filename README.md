# @williamphelps13/ui

A versioned, public React component library.

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

To re-theme without rebuilding, override the semantic CSS variables in your own `:root` (and `[data-theme="dark"]`):

```css
:root {
  --color-primary: oklch(0.55 0.2 320);
}
```

## For contributors and AI agents

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) § "See Also" for the doc landscape (what each doc covers and the read order).

## License

MIT — see [`LICENSE`](./LICENSE) if present, or `package.json`'s `license` field.
