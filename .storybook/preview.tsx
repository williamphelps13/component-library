import { definePreview, type Decorator } from '@storybook/react-vite'
// CSF Next: every addon in .storybook/main.ts whose default export is
// `definePreviewAddon(...)` must ALSO be registered here as a factory call —
// otherwise its preview-side wiring (globalTypes registration, URL/channel
// global propagation, parameter handlers, axe runner, vitest hooks) never
// connects. It fails silently: tests/typecheck/lint stay green because nothing
// asserts the addon actually did its job. We hit this for `addonThemes()`
// during Phase-4 visual verification, and an independent reviewer found the
// same trap had silently disabled the **a11y gate** (`parameters.a11y.test:
// 'error'` below was a no-op until `addonA11y()` was added — proven by seeding
// a button-name violation that passed all 7 tests until the fix landed).
// `withThemeByDataAttribute` stays a named import in addon-themes.
import addonChromatic from '@chromatic-com/storybook'
import addonA11y from '@storybook/addon-a11y'
import addonDocs from '@storybook/addon-docs'
import addonThemes, { withThemeByDataAttribute } from '@storybook/addon-themes'
// Root export is a definePreviewAddon factory (header rule applies). Its
// `/preview` subpath is classic annotations — passing that module object into
// `addons` type-checks but is silently ignored (verified 2026-07-06, caught
// by HoverStates' differential play assertion). Use the factory.
import addonPseudoStates from 'storybook-addon-pseudo-states'
// NOTE: `@storybook/addon-vitest`'s default-export factory is intentionally
// NOT registered here. Its module imports `vitest` at load time, which is
// only resolvable inside the vitest run context — placing it in
// `definePreview.addons` makes Storybook dev (and any non-vitest consumer of
// preview.tsx) crash on import. The vitest integration is wired through the
// `storybookTest()` plugin in `vitest.config.ts` instead; see the header
// comment for the general rule (and this exception).

// Ship-shaped: import the SAME precompiled stylesheet consumers get.
import '../dist/styles.css'
// Brand preset for the Palette toolbar — the consumer-shaped rebrand proof.
import './brand-swfllive.css'

// Canvas surface: binds the iframe body to the surface tokens (the page
// background/text semantics), which the dark rebinding flips automatically.
// Storybook-only — the shipped library doesn't impose a page background
// (no global reset ships; see src/styles/index.css). Without this, the
// dark-theme toggle re-skins the component but leaves the canvas white.
const withCanvasSurface: Decorator = (Story) => {
  document.body.style.backgroundColor = 'var(--ui-color-surface-bg)'
  document.body.style.color = 'var(--ui-color-surface-fg)'
  return Story()
}

// Palette toolbar: applies a real brand-preset stylesheet at runtime, proving
// the zero-rebuild theming contract — a consumer re-skins the library by
// shipping one CSS file of --ui-* overrides (see brand-swfllive.css).
const withPalette: Decorator = (Story, context) => {
  if (context.globals.palette === 'swfllive') {
    return (
      <div className="brand-swfllive">
        <Story />
      </div>
    )
  }
  return Story()
}

export default definePreview({
  // Cascades to every story — autodocs page is rendered for every component
  // without a per-meta `tags: ['autodocs']`. Exclude individual stories from
  // autodocs with `tags: ['!autodocs']` (e.g., the AllVariants matrix).
  tags: ['autodocs'],
  // Every addon listed in main.ts that exposes a `definePreviewAddon(...)`
  // default export MUST appear here, factory-called, or its preview wiring
  // silently no-ops (see header comment). One per line so additions/removals
  // are obvious in diffs and future code review.
  addons: [
    addonDocs(), // autodocs renderer
    addonA11y(), // axe runner — without this, parameters.a11y is ignored
    addonThemes(), // globalTypes.theme + URL/channel propagation
    addonChromatic(), // visual-snapshot capture parameters (foundation for B3)
    addonPseudoStates(), // forced :hover/:active for visual state stories
    // addonVitest is intentionally absent — see header comment.
  ],
  decorators: [
    withThemeByDataAttribute({
      attributeName: 'data-theme',
      themes: { light: 'light', dark: 'dark' },
      defaultTheme: 'light',
    }),
    withCanvasSurface,
    withPalette,
  ],
  parameters: {
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
    // a11y violations fail the test run (real gate, not advisory).
    a11y: { test: 'error' },
  },
  globalTypes: {
    palette: {
      description: 'Override semantic palette (proves runtime theming)',
      toolbar: {
        title: 'Palette',
        items: [
          { value: 'default', title: 'Default' },
          { value: 'swfllive', title: 'swfllive brand' },
        ],
      },
    },
  },
  initialGlobals: { palette: 'default' },
})
