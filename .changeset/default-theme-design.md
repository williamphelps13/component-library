---
'@williamphelps13/ui': minor
---

Default theme designed from Radix Colors; new semantic tokens for surfaces, borders, inputs, and overlays

- All default color values now come verbatim from Radix Colors 3.0.0 (slate neutrals, blue primary) — replacing the original placeholder palette. Every text pair holds WCAG AA in both themes; solid intent colors deepened accordingly (light primary is now `#0d74ce`).
- New public override variables: `--ui-color-surface-bg/-fg`, `--ui-color-raised-bg/-fg`, `--ui-color-muted-fg`, `--ui-color-border`, `--ui-color-border-strong`, `--ui-color-input-bg`, `--ui-color-input-border`, `--ui-color-placeholder-fg`, `--ui-color-overlay`. Existing variable names are unchanged.
- Dark mode intents are now light-colored solids with near-black text (the MUI dark-palette pattern); Button hover/active lightens in dark mode for all intents.
- Internal color primitives renamed to Radix scale names (`--ui-color-slate-6`, `--ui-color-blue-11`). Primitives are internal — the semantic variables above remain the stable contract.
