# swfllive component set — migrate or rebuild assessment

Status: SETTLED — the decision and rules below were adopted; the canonical versions live in `ARCHITECTURE.md` (§Positioning, §Component growth) and execution lives in `docs/superpowers/plans/2026-07-04-foundation-components.md`. If this doc and ARCHITECTURE ever disagree, ARCHITECTURE wins. This doc is preserved as the analysis that produced the decision.

Decision input for how `@williamphelps13/ui` grows past Button. The owner has an earlier component library, built at work by making Tailwind Plus components reusable and later carried into swfllive. It contains about 20 components and a large test suite. The question: migrate those components into this repo, or rebuild each one here using them as references?

Assessed 2026-07-04 by reading the full inventory (about 20 components, 11k source lines, 4.4k test lines), with close reads of Button, Modal, Select, TextField/TextBase, Toggle, Table, and the Button test suite.

Decision: rebuild through the add-component flow. The swfllive components serve as the requirements source for each rebuild. The reasoning is below.

## Characterizing Tailwind Plus

Tailwind Plus is deliberately neutral, and the neutrality is well executed. The spacing and typography are professional. The surfaces are restrained gray with one accent color. The radii and shadows are conservative. It is designed to look correct in any product, and that is exactly why it never looks distinctive in yours.

Its strength is layout and composition patterns. Its weakness as a library foundation is that it is markup plus utility classes, not a system. Behavior comes from somewhere else (usually Headless UI). Theming means editing class strings by hand. Interaction states go about as deep as hover and focus color swaps: there is no elevation system, no Windows High Contrast support, and little reduced-motion handling.

The cure for the blandness is not more styling inside components. It is the token contract this library now has. Components stay neutral, and each product supplies its own identity by overriding token values.

## Inventory

| Component                                                                          | Size                | Behavior source                                 |
| ---------------------------------------------------------------------------------- | ------------------- | ----------------------------------------------- |
| Avatar, Badge, Breadcrumbs, Label, Loader, Icon, Toggle, Tabs                      | ~150–700 lines each | hand-rolled presentational; Tabs on Headless UI |
| Button, IconButton                                                                 | ~450 lines          | hand-rolled                                     |
| TextBase → TextField, Textarea; RadioCheckboxBase → Checkbox, Radio, CheckboxGroup | ~1,400 lines        | shared-base pattern, hand-rolled                |
| Modal, ConfirmationModal, Toast                                                    | ~850 lines          | Headless UI Dialog                              |
| Select                                                                             | ~1,000 lines        | react-select (+ creatable)                      |
| Table (editable cells, filters)                                                    | ~1,900 lines        | TanStack Table                                  |
| DatePicker                                                                         | ~1,900 lines        | react-day-picker                                |
| ScrollNavigator, Detail                                                            | ~1,200 lines        | app-specific                                    |

## What the set gets right

- Consistency is the standout. Every component follows one shape: a `model.ts` type file, `cId` test ids, `isX` boolean props, `twMerge` for class composition, shared base components, and co-located stories and tests
- Behavior lives in specialist libraries, which is the right architecture. Focus traps, keyboard navigation, and aria state come from Headless UI, TanStack Table, react-day-picker, and react-select rather than hand-rolled code
- The test investment is real: 4.4k lines, with 57 cases on DatePicker alone
- The details show care. Loading states hide the label with `opacity-0`, which keeps it available to screen readers (the same lesson this repo learned independently). Labels wire up `aria-describedby`. `isDisabled` defaults to `isLoading`

## Where it falls short of this library's bar

- The styling cannot be ported. Every visual decision is a Tailwind utility string bound to swfllive's theme names, and that theme is dark-only. There is no light mode to migrate; light values would have to be designed from scratch. Any path forward rewrites the entire visual layer
- The APIs are app conventions, not published-library conventions. `cId` is a required prop, which bakes a test-id scheme into the public contract. `children` only accepts a string. Components use default exports and carry no JSDoc for documentation generation
- The tests assert class names (`toHaveClass("px-3 py-2 text-sm")`) rather than behavior. The scenarios they cover are valuable and portable. The assertion code dies with the class names
- Interaction depth matches Tailwind Plus, which is shallow. One file handles reduced motion. None handle Windows High Contrast. No axe accessibility check has ever run against them, and there is no visual regression testing
- Two dependencies deserve scrutiny. react-select is a heavy client-side library that brings its own styling engine (Emotion) and resists styling from outside CSS. The editable-cell Table is deeply shaped by swfllive's specific workflows

## The effort math

Migrating one component means all of the following. Re-author its styling onto `--ui-*` tokens, and design the light theme that does not exist. Extend the token vocabulary, because surface, border, input, and overlay semantics have not been created yet. Reshape the API to this repo's conventions. Decide whether it renders on the server or needs `"use client"`. Rewrite the tests as story play functions. Rewrite the stories in CSF Next with dark modes and axe. Then pass gates the original never faced.

That adds up to roughly 60–75% of building the component from scratch. The 25–40% that survives — the prop inventory, the edge-case scenarios, the behavior-library choices, the layout structure — transfers just as well by reading the old component during a fresh build. In practice, "migrate" and "rebuild with reference" are nearly the same amount of work.

What actually differs is the mindset, and the risk lives there. Migration starts from old code and edits it. That is how `cId` leaks into the public API, dark-only assumptions linger, and interaction depth never improves, because the component already works. Rebuilding starts from this repo's foundation and mines the old component for what it knows.

## Decision: rebuild, with the swfllive set as the requirements source

The prior investment transfers four ways:

1. The roadmap. The swfllive set is the priority list, validated by real usage: Badge, then the form-field family (the TextBase pattern covering TextField, Textarea, Checkbox, Radio), then Modal, Toast, Tabs, and Select
2. Requirements per component. The swfllive counterpart states what each component must do: which props earned their place in production and which edge cases occurred (label annotations, disabled-while-loading, error states). Requirements only — naming, styling, and interaction design come from this library's own conventions
3. Test scenarios. They port as play-function checklists even though the assertion code does not
4. Dependency verdicts. Headless UI fits the wrap-behavior-internally philosophy and stays. react-day-picker is plausible. react-select should be replaced with Headless UI's Combobox when Select's turn comes. Table and DatePicker stay in the app until a second consumer needs them

## Reference discipline — one voice

Consistency comes from the decision procedure, not from the reading list. If each component's author picks whatever feels right from a panel of reference libraries, the library drifts into a patchwork, even when every individual choice is defensible. Every component therefore passes through the same procedure, in this order of authority:

1. This library's own conventions: the tokens, ARCHITECTURE's API philosophy, and `docs/component-conventions.md` once it exists. A settled convention ends the question; references are not consulted for it again
2. One design target: MUI. It sets the bar for interaction depth, state behavior, and accessibility edge cases. This generalizes the Button precedent already in ARCHITECTURE: when MUI does X, we do X, unless the deviation clears one of the two named bars (a concrete user-visible UX win, or React 19 / App Router / RSC alignment)
3. Requirements: the swfllive counterpart. It says what to build, never how it looks or what it is named
4. Cross-checks: shadcn, Chakra, and similar. They are consulted to find gaps, never as a source of naming or styling

Styling decisions come from none of the references. They come from the token system. When a component raises a styling question the tokens cannot answer, the question escalates to the token layer and gets a system-wide answer, never a local one. That is the structural guarantee of visual cohesion.

The sources are not equals, and it helps to be honest about scale. MUI encodes decades of engineering effort on top of Material Design, which was itself produced by a dedicated design organization. shadcn builds on years of accessibility engineering in Radix. The swfllive set's months of work cannot compete with that as design authority, and it does not need to. Its value is different: it is the only reference that encodes this owner's actual product requirements, which is the one thing the big libraries can never supply.

## Positioning — why this library exists instead of MUI

If MUI is the design target, why not use MUI directly? For most teams that is the right call. This library is justified only by things MUI structurally cannot do. There are four.

1. MUI is client-side by architecture; this library is server-first. MUI generates its CSS at runtime (through Emotion), themes through a React context provider, and implements its ripple with hooks. Every MUI component therefore forces a `"use client"` boundary and ships JavaScript to hydrate. This library's Button renders on the server with zero JavaScript, and a build assertion proves that on every build. MUI cannot retrofit this without a rewrite (its Pigment CSS project is that rewrite, still in progress)
2. This library adopts MUI's interaction quality without Material's look. Using MUI directly means a product looks like Material Design until its generated styles are overridden, and those overrides are the notorious time sink of MUI projects. Here the look lives entirely in CSS variables: rebranding a product means writing one CSS file of `--ui-*` values. No rebuild, no provider
3. The API surface is exactly as large as the products need. MUI's props serve every team on earth. This library's props exist because a real product needed them. A small surface can be held in one person's head, which is a compounding speed advantage for a solo maintainer working across several apps
4. Change happens on the owner's schedule. MUI's major versions force migrations on MUI's timetable. This library can spend its pre-1.0 period making aggressive corrections, then freeze a 1.0 contract its consumers can trust

There is also a benefit that has nothing to do with consumers: building the library teaches the build systems, token architecture, accessibility, and release engineering that using MUI never would.

How to maximize each benefit:

- Zero-JS server rendering: record "server-renderable, 0 bytes of JavaScript" per component in the docs. When a component needs client behavior, wrap it so only the interactive core crosses the boundary
- Token-owned identity: finish the token vocabulary extension, then prove the contract with two or three real brand presets as small CSS files. Each product becomes a brand file over shared components
- Exact API surface: a prop enters only when a real product needs it. `className` plus tokens is the escape hatch; nothing like `sx` ever ships
- Sovereignty: spend pre-1.0 freely, then treat 1.0 as a real freeze

The failure mode for a personal component library is half-built breadth: twenty-five mediocre components chasing MUI's catalog. The strategy here is the opposite. Ten to twelve components at MUI-grade depth, server-first and token-skinned, beat a broad shallow catalog for these products. Keeping Table and DatePicker in the app was the first application of that rule.

## Prerequisites before any component work

- Rewrite the add-component skill. It still teaches Tailwind `@utility` blocks, the precompiled-Tailwind class-name gotcha, and grepping `dist/styles.css` for emitted utilities, all obsolete since the vanilla-CSS migration. It also prescribes a reference panel (MUI, shadcn, and Chakra as peers), which contradicts the single-design-target rule above. Replace that step with the reference-discipline hierarchy
- Extend the semantic token vocabulary once, deliberately: surface, border, muted text, input, and overlay semantics. The repo review already flagged that the current names do not stretch. One design pass beats inventing names per component

## Relation to Phase 6

This decision answers the bake-off's system-level question: this repo's foundation wins. The Button head-to-head is still worth a short session. Its deliverable, `docs/component-conventions.md`, is where the swfllive patterns worth keeping (the shared-base idea, the label annotation system, specific ergonomics) get written down so every rebuild inherits them.
