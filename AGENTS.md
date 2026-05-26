# AGENTS.md — @williamphelps13/ui

**Agent guidance for this repo lives in [`CLAUDE.md`](./CLAUDE.md).**

`CLAUDE.md` is named per Claude Code's auto-load convention, but its content is tool-agnostic
— the rules apply to any AI agent (Claude Code, Cursor, Codex, Aider, etc.) working in this
codebase. If your tool doesn't auto-load `CLAUDE.md`, treat it as your primary agent-direction
source and read it first.

In particular, see `CLAUDE.md` § "Storybook MCP" for how to query the live Storybook MCP server
to verify component props (never hallucinate), what the addon-registration trap is when you add
a Storybook addon, and the fresh-checkout setup note.

## See also

[`ARCHITECTURE.md`](./ARCHITECTURE.md) (as-built design + rationale; source of truth) ·
[`docs/superpowers/plans/2026-05-17-component-library-milestone-0.md`](./docs/superpowers/plans/2026-05-17-component-library-milestone-0.md)
(deviation log near the top is canonical for execution history + pending items).
