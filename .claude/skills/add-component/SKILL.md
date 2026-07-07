---
name: add-component
description: "Use when adding a new React component to @williamphelps13/ui. Walks a component from name through commit using the repo's conventions docs: reference gathering with target metrics, scaffold, RSC decision, stories, gates, review checkpoint, and the owner visual gate. Trigger phrasings — 'add a new component', 'create a [name] component', 'scaffold a [name]', 'build a [name] for the library'."
---

# Add a component to @williamphelps13/ui

Walk a new component from name through commit. Each checklist item below should
become a TaskCreate todo on entry.

## Required reading first

- `docs/component-conventions.md` — the canonical pattern; a convention there ends the question
- `ARCHITECTURE.md` § "Component growth" (reference discipline), § "Styling and theming", § "Server and client boundary"
- `CLAUDE.md` § "Toolchain rules" and § "Gotchas" — pnpm only, build pipeline, Storybook stale-CSS restart rule

## Checklist

1. Confirm the component name and variants up front — kebab-case directory, PascalCase identifier; list variant props with their full union types before writing code

2. Gather references in authority order — the hierarchy lives in ARCHITECTURE § "Component growth" (single copy): the swfllive counterpart for requirements, MUI's implementation as the design target, cross-checks only for suspected gaps. Extract the target's concrete metrics (heights, paddings, font sizes per size variant) into the phase notes before writing CSS — invented dimensions read as plausible and pass every review; the review checkpoint diffs shipped values against these notes

3. Make the RSC decision explicitly — rule and mechanism in `docs/component-conventions.md` § "Server and client"; record the decision and its reason in the deviation log or PR body

4. Scaffold `src/components/<name>/` — `variants.ts`, `<name>.tsx`, `<name>.css`, `variants.test.ts` per `docs/component-conventions.md` § "API shape" and § "Variants and styling" (single copy of the pattern)

5. Wire the CSS into the entry — one `@import … layer(components)` line in `src/styles/index.css`; `pnpm css` confirms (`assert-css-imports.mjs` fails the build if it is missing)

6. Add tokens only through the token layer — extend `tokens/tokens.json` (light and dark in parity, reference-valued semantics) and the README contract table; never hardcode

7. Call the Storybook MCP tool `get-storybook-story-instructions` — required before writing the story

8. Write `<name>.stories.tsx` — the story set per `docs/component-conventions.md` § "Stories and tests" (single copy)

9. Run the gates — the suite in CLAUDE.md § "Common commands"

10. Preview in Storybook — restart after the build (stale-CSS gotcha: confirm the old process exited), call the `preview-stories` MCP tool, include the URLs in the reply

11. Update `docs/component-conventions.md` if this component settled a new pattern — the convention change lands in the same PR that proves it

12. Add a changeset — `pnpm changeset`, minor for a new component (see `docs/workflow.md`)

13. Dispatch the review checkpoint (CLAUDE.md § "How we work")

14. Owner visual gate (CLAUDE.md § "How we work")

15. Ask before committing (CLAUDE.md § "Commit conventions")
