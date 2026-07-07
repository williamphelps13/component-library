# Design tokens

`tokens.json` is the single DTCG-format source (`$value`/`$type`); code is the source of truth and Figma mirrors it. Tiers, naming, palette provenance, and build rationale live in ARCHITECTURE § Tokens. `pnpm tokens` emits `build/tokens.{light,dark}.css`.

## Figma sync (Tokens Studio, free tier)

- Tokens Studio for Figma → GitHub storage provider, single-file mode, pointed at `tokens/tokens.json` — single-file because multi-file sync and themes are Pro features; light/dark are plain token sets layered over `core`
- Designer token changes arrive via a branch and pull request, never pushed to `main`
- References are written `{color.blue.11}` (no set name); they resolve against the merged tree at build time
- In the plugin, set `core` to "source" and the active semantic set (`light`/`dark`) to enabled — otherwise references show as broken
- To create native Figma variables: Export → Token Sets (free), not Themes (Pro); bind layers to the resulting variables, not raw values
