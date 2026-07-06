---
name: add-component
description: 'Use when adding a new React component to @williamphelps13/ui. Covers the reference-discipline hierarchy (conventions → MUI design target → swfllive requirements → cross-checks), file scaffold (variants.ts + component.tsx + component.css on --ui-* tokens), the RSC decision, CSF Next stories via Storybook MCP, gates, review checkpoint, and the owner visual gate. Trigger phrasings — "add a new component", "create a [name] component", "scaffold a [name]", "build a [name] for the library".'
---

# Add a component to @williamphelps13/ui

Walk a new component from name through commit. Each checklist item below should
become a TaskCreate todo on entry.

## Required reading first

- `docs/component-conventions.md` — the canonical pattern; a convention there ends the question
- `ARCHITECTURE.md` § "Component growth" (reference discipline), § "Styling and theming", § "Server and client boundary"
- `CLAUDE.md` § "Toolchain rules" and § "Gotchas" — pnpm only, build pipeline, Storybook stale-CSS restart rule

## Checklist

1. Confirm the component name and variants up front
   - kebab-case directory name (e.g. `badge`, `text-field`); PascalCase identifier
   - List variant props with their full union types before writing code

2. Gather references — reading sequence below; authority order is ARCHITECTURE § "Component growth" (conventions/tokens outrank everything, then MUI, then swfllive, then cross-checks)
   - Requirements: read the swfllive counterpart (`../swfllive/src/components/<Name>/`) — its model.ts prop surface, its test scenarios, its edge cases. This says WHAT the component must do, never how it looks or what props are named
   - Design target: read MUI's implementation (`https://github.com/mui/material-ui/tree/master/packages/mui-material/src/<Component>`) for interaction depth, state behavior, and a11y edge cases. When MUI does X, we do X unless the deviation clears one of ARCHITECTURE's two named bars
   - Extract the target's concrete metrics (heights, paddings, font sizes per size variant) into the phase notes before writing CSS — invented dimensions read as plausible and pass every review; only a numeric diff against the target catches them. The review checkpoint diffs shipped values against these notes
   - Cross-checks only if a gap is suspected: shadcn/Chakra for edge cases the others miss — never for naming or styling
   - Styling questions are not answered by any reference: they resolve through the `--ui-*` tokens, or escalate to the token layer

3. Make the RSC decision explicitly
   - Presentational, no owned interactivity → file-level `"use no memo"`, zero JS shipped
   - Owns event wiring or state → file-level `"use client"`, add to the `assert-use-client.mjs` allowlist
   - Record the decision and its reason in the phase notes or PR body

4. Scaffold `src/components/<name>/`
   - `variants.ts` — typed `Record<Variant, string>` maps + one pure join function. Literal `ui-*` class names. Per-value JSDoc on the union types
   - `<name>.tsx` — props extend DOM attributes, `ref` as plain prop, `...rest` spread, `className` merges last, consumer-grade JSDoc on every exported prop and type
   - `<name>.css` — plain CSS classes (no framework syntax), every value through a `--ui-*` token, the full interaction/a11y floor from the conventions doc (hover gating, focus ring, reduced motion, forced colors, min-height)
   - `variants.test.ts` — exhaustive variant enumeration + literal-class-presence check against the stylesheet

5. Wire the CSS into the entry
   - Add `@import '../components/<name>/<name>.css' layer(components);` to `src/styles/index.css`
   - `scripts/assert-css-imports.mjs` fails the build if you forget — run `pnpm css` to confirm

6. Add tokens only through the token layer
   - If the component needs a value the tokens cannot express, extend `tokens/tokens.json` (light + dark in parity; reference-valued semantics so the dark build emits them) and update the README contract table — never hardcode

7. Call the Storybook MCP for story conventions
   - Tool: `get-storybook-story-instructions` — required before writing the story

8. Write `src/components/<name>/<name>.stories.tsx` — the five-story set
   - Autodocs default; state baselines; one `play` story per owned interaction; override demo (must override a token the component actually consumes); `AllVariants` dual-theme matrix (`tags: ['!autodocs']`, chromatic light+dark modes)

9. Run the gates

   ```
   pnpm build && pnpm typecheck && pnpm lint && pnpm knip && pnpm spell && pnpm format && pnpm test && pnpm verify:pack && pnpm verify:types && pnpm assert:use-client
   ```

10. Preview in Storybook and paste URLs into the reply
    - Restart Storybook after the build (CLAUDE.md gotcha: it serves boot-time CSS; confirm the old process exited)
    - Call the `preview-stories` MCP tool; include returned URLs so the owner can verify visually

11. Update `docs/component-conventions.md` if this component settled a new pattern
    - New conventions land only when proven; include them in the same PR

12. Add a changeset
    - `pnpm changeset` — minor for a new component; one-line consumer-facing summary

13. Dispatch the review checkpoint
    - Independent code-review subagent on the diff vs `ARCHITECTURE.md`, `docs/component-conventions.md`, and the active plan
    - Fix Critical and Important findings before continuing

14. Owner visual gate
    - The owner opens the component in Storybook and exercises every documented state, both themes. No component is done without this

15. Ask before committing
    - Surface staged diff + proposed message; wait for explicit yes
    - Conventional Commits: `feat(<name>): <summary>`
