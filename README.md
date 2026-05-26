# @williamphelps13/ui

A versioned, public React component library. ESM-only · React 19+ peer dep ·
server-renderable by default (`"use client"` per file where interactivity
demands it) · ships one precompiled stylesheet (no Tailwind install on your
end) · runtime theming via CSS-variable override — set `--color-*` on
`:root`; no rebuild needed.

**Status:** see [`ARCHITECTURE.md`](./ARCHITECTURE.md) (status line at the top)
for the canonical phase state.

## Install (once published — Phase 5)

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

To re-theme without rebuilding, override the semantic CSS variables in your
own `:root` (and `[data-theme="dark"]`):

```css
:root {
  --color-primary: oklch(0.55 0.2 320);
}
```

## For contributors & AI agents

- **Read first:** [`ARCHITECTURE.md`](./ARCHITECTURE.md) — source of truth
  for the current design + why each decision was made.
- **Toolchain rules + gotchas:** [`CLAUDE.md`](./CLAUDE.md) — pnpm + Node
  pins, commit conventions, hard-won lessons that are easy to repeat.
- **Cross-tool agent guidance:** [`AGENTS.md`](./AGENTS.md) — verify
  component props through the live Storybook MCP server, never hallucinate.
- **Execution history + current pending items:**
  [`docs/superpowers/plans/2026-05-17-component-library-milestone-0.md`](./docs/superpowers/plans/2026-05-17-component-library-milestone-0.md)
  — the deviation log near the top is canonical for "what actually happened
  and what's next."

## License

MIT — see [`LICENSE`](./LICENSE) if present, or `package.json`'s `license`
field.
