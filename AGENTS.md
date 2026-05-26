# AGENTS.md — @williamphelps13/ui

Cross-tool instructions for AI agents working on this component library.
(Claude Code also loads `CLAUDE.md` for the full toolchain rules/gotchas; `ARCHITECTURE.md` is
the source of truth for the design.)

## Verify component APIs via the Storybook MCP — never hallucinate props

This repo runs a **Storybook MCP server** (`@storybook/addon-mcp`) that exposes the library's
_real_ component documentation, props, and stories to agents. It is live at
**`http://localhost:6006/mcp`** whenever `pnpm storybook` is running.

**Before using ANY prop on a component — even common-sounding ones (`variant`, `size`, `shadow`,
…) — confirm it is actually documented.** Do not infer props from naming conventions or from
other libraries. If a prop isn't documented, ask the user instead of inventing it. A story's
export name may not match a prop name, so verify through the documentation tools, not the labels.

Tools the server provides:

- `list-all-documentation` — list every component.
- `get-documentation` / `get-documentation-for-story` — a component's real props + examples.
- `get-storybook-story-instructions` — current conventions, before writing/updating a `.stories.*`.
- `run-story-tests` — verify your changes.
- `preview-stories` — preview URLs (include them in your reply so the user can open them).

## Connecting

The server is wired for Claude Code in `.mcp.json` (HTTP → `http://localhost:6006/mcp`). It is
reachable **only while `pnpm storybook` is running** — start Storybook before relying on these
tools. Other agents: add an HTTP MCP server pointing at that URL.

Note: `pnpm storybook` imports the precompiled `dist/styles.css`, so on a fresh checkout run
`pnpm build` first (it generates `dist/styles.css`) or the preview fails to resolve the import.

## When adding a Storybook addon

When you add an entry to `.storybook/main.ts addons`, check whether its default export is a
`definePreviewAddon(...)` factory. If yes, it ALSO needs `addonX()` registered in
`.storybook/preview.tsx`'s `definePreview({ addons: [...] })` array — otherwise its preview-side
wiring (globalTypes registration, URL/channel global propagation, parameter handlers, axe runner,
etc.) silently no-ops. Tests, typecheck, and lint all stay green because none assert the addon
did its job. **Exception:** `@storybook/addon-vitest` is intentionally NOT in `definePreview.addons`
— its module imports `vitest` at load time, which is only resolvable inside the vitest run
context; the integration is wired through `storybookTest()` in `vitest.config.ts` instead.

## See also

`CLAUDE.md` (toolchain rules, gotchas, commit + workflow conventions) · `ARCHITECTURE.md`
(as-built design + rationale, source of truth) · the plan's deviation log (decision history).
