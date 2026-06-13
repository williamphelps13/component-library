---
name: add-component
description: 'Use when adding a new React component to @williamphelps13/ui. Covers file scaffold (variants.ts + component.tsx), Tailwind class-name discipline plus the ui-* utility namespace, CSF Next story authoring via Storybook MCP, precompiled-CSS verification, changeset, code-review checkpoint, and the review-before-commit gate. Trigger phrasings — "add a new component", "create a [name] component", "scaffold a [name]", "build a [name] for the library".'
---

# Add a component to @williamphelps13/ui

Walk a new component from name through commit. Each checklist item below should
become a TaskCreate todo on entry.

## Required reading first

- `CLAUDE.md` § "Toolchain rules" — pnpm only, build pipeline, ESM-only
- `CLAUDE.md` § "Gotchas and hard-won lessons" — precompiled-Tailwind class-name discipline, CSF Next addon registration
- `ARCHITECTURE.md` § "Pipeline and data flow" and § "Package shape" — what each tool emits, where outputs land, and the `exports` map consumers see
- `ARCHITECTURE.md` § "API philosophy" — convention-based prop surface, not composition

## Checklist

1. Confirm the component name and variants up front
   - kebab-case directory name (e.g. `accordion`, `text-field`)
   - PascalCase identifier (e.g. `Accordion`, `TextField`)
   - List variant props with their full union types up front

2. Fetch 2–3 reference implementations from professional libraries into a system temp directory
   - Create the dir: `EXAMPLES_DIR=$(mktemp -d -t component-examples)` (path looks like `/tmp/component-examples.XXXX`)
   - Defaults: MUI, shadcn/ui, Chakra UI
   - Fallbacks when the top three lack the component: Mantine, Radix UI
   - Source URLs:
      - MUI: `https://github.com/mui/material-ui/tree/master/packages/mui-material/src/<Component>`
      - shadcn: `https://github.com/shadcn-ui/ui/tree/main/apps/v4/registry/new-york-v4/ui`
      - Chakra: `https://github.com/chakra-ui/chakra-ui/tree/main/packages/react/src/components`
      - Mantine: `https://github.com/mantinedev/mantine/tree/master/packages/@mantine/core/src/components`
      - Radix UI: `https://github.com/radix-ui/primitives/tree/main/packages/react`
   - Read for prop shape, accessibility patterns, edge-case handling, naming conventions
   - Reason for system temp (not in-repo): zero `.gitignore` or tool-config footprint; the examples are scaffolding, not part of the library

3. Scaffold `src/components/<name>/`

   Three files, following the existing `button/` pattern:
   - `variants.ts` — typed `Record<Variant, string>` maps + a single function that joins them. Literal class names only (precompiled-Tailwind gotcha in CLAUDE.md). Variant union types carry per-value JSDoc directly on the type (single source of truth — the component prop's JSDoc just describes the role, not the values).
   - `<name>.tsx` — presentational component, props extend the relevant DOM attributes, React 19 `ref` is a plain prop (no `forwardRef`). Returns `<element className={classes} {...rest} />` where `classes = [variantClasses(...), className].filter(Boolean).join(' ')`.
   - `<name>.css` — component styles via Tailwind `@utility` blocks + plain selectors + any keyframes. Co-located with the TSX (NOT in `src/styles/index.css`).

4. Wire the component's CSS into the entry
   - Add `@import '../components/<name>/<name>.css';` to `src/styles/index.css` under "Per-component styles"
   - Custom utility classes go through `@utility ui-*` (e.g. `ui-card-shadow`) inside the component's `.css` file
   - Reason: collision-safety naming + per-component co-location

5. Call the Storybook MCP for story conventions
   - Tool: `get-storybook-story-instructions`
   - Required before writing the story — captures current CSF Next conventions

6. Write `src/components/<name>/<name>.stories.tsx`
   - CSF Next format
   - One story per variant; meta `title` should match the component path
   - Component-level autodocs by default

7. Preview in Storybook and paste URLs into the reply
   - With `pnpm storybook` running, call the `preview-stories` MCP tool
   - Include returned URLs in your reply so the user can verify visually

8. Run the local gates

   ```
   pnpm typecheck && pnpm lint && pnpm test && pnpm build
   ```

   All four must pass before continuing.

9. Verify the new utilities landed in `dist/styles.css`
   - Run: `grep -E '<utility-class-name>' dist/styles.css`
   - Reason: a dynamic class-name slip will pass tests but silently drop styles for that variant (the precompiled-Tailwind gotcha)

10. Add a changeset
   - Run: `pnpm changeset`
   - Minor bump for additive component; patch for a fix
   - One-line consumer-facing summary

11. Dispatch a code review
   - Skill: `superpowers:requesting-code-review`
   - Target: the diff vs `ARCHITECTURE.md` and the active plan
   - Fix Critical and Important findings before continuing

12. Delete the temp examples directory
   - Run: `rm -rf "$EXAMPLES_DIR"`
   - (Or just leave it — the OS clears `/tmp` periodically — but explicit cleanup is cleaner)

13. Owner verifies visually. Open the component in Storybook and exercise every documented state. Per CLAUDE.md § "How we work."

14. Ask the user before committing
   - Surface staged diff + proposed message; wait for explicit yes
   - Conventional Commits: `feat(<name>): <summary>` for a new component
   - Per CLAUDE.md § "Commit conventions"
