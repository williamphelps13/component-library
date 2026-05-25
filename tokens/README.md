# Design tokens

Code-first design tokens in **W3C/DTCG** format (`$value` / `$type`), stored as
a **single `tokens.json`** so Tokens Studio's **free** Git sync can round-trip
them to/from Figma. This file is the **source of truth**; Figma mirrors it.

## Why single-file + sets (not themes)

Tokens Studio's **multi-file sync** and **themes** features are **Pro**
(€39/editor/mo). We avoid that cost by using the **free Starter** tier:
**single-file** sync + plain **token sets**. Light/dark are modelled as sets
(`light`, `dark`) layered over `core` — not as Pro "themes". On free we forgo
the in-Figma theme *switcher* and light/dark as variable *modes* (you export
one semantic set at a time) — neither of which our code build needs.

## Structure (`tokens.json`)

Top-level keys are **token sets**:

- `core` — raw palette scales (`color.blue.500`, …). Never consumed directly.
- `light` / `dark` — intent tokens (`color.primary`, …) that **reference**
  `core`. This is the **consumer override surface** and the layer that flips
  for dark mode.
- `$metadata.tokenSetOrder` — set order. `$themes` is empty (Pro feature).

References are written `{color.blue.500}` (no set name) — they resolve against
the merged tree at build time.

## Build

`pnpm tokens` (Style Dictionary v5 + `@tokens-studio/sd-transforms`) reads
`tokens.json`, merges `core`+`light` and `core`+`dark`, and emits to `build/`:

- `tokens.light.css` — `:root { … }` (primitives raw + semantics as `var()`)
- `tokens.dark.css` — `[data-theme="dark"] { … }` (semantics re-bound)
- `theme.css` — Tailwind v4 `@theme inline { … }` mapping

## Figma sync (Tokens Studio, free tier)

- Tokens Studio for Figma → **GitHub** storage provider, **single-file** mode,
  pointed at `tokens/tokens.json`.
- **Code is the source of truth.** Designer token changes arrive via a
  **branch + pull request** — never pushed directly to `main`.
- Designers work with the **token sets**; the Pro "themes" switcher is not used.
- In the plugin, set **`core` → "source"** and the active semantic set
  (`light`/`dark`) → **enabled** — otherwise references show as broken.
- To create native Figma variables: **Export → Token Sets** (free), *not*
  Themes (Pro); bind layers to the resulting **variables**, not raw values.
