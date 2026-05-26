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
// `withThemeByDataAttribute` stays a named import in addon-themes 10.4.1.
import addonChromatic from '@chromatic-com/storybook'
import addonA11y from '@storybook/addon-a11y'
import addonDocs from '@storybook/addon-docs'
import addonThemes, { withThemeByDataAttribute } from '@storybook/addon-themes'
// NOTE: `@storybook/addon-vitest`'s default-export factory is intentionally
// NOT registered here. Its module imports `vitest` at load time, which is
// only resolvable inside the vitest run context — placing it in
// `definePreview.addons` makes Storybook dev (and any non-vitest consumer of
// preview.tsx) crash on import. The vitest integration is wired through the
// `storybookTest()` plugin in `vitest.config.ts` instead; see the header
// comment for the general rule (and this exception).

// Ship-shaped: import the SAME precompiled stylesheet consumers get.
import '../dist/styles.css'

// Palette toolbar: overrides a semantic token at runtime, proving the
// zero-rebuild theming contract (consumer sets --color-primary in :root).
const withPalette: Decorator = (Story, context) => {
  const root = document.documentElement
  if (context.globals.palette === 'brand') {
    root.style.setProperty('--color-primary', 'oklch(0.55 0.2 320)')
  } else {
    root.style.removeProperty('--color-primary')
  }
  return Story()
}

export default definePreview({
  // Every addon listed in main.ts that exposes a `definePreviewAddon(...)`
  // default export MUST appear here, factory-called, or its preview wiring
  // silently no-ops (see header comment). One per line so additions/removals
  // are obvious in diffs and future code review.
  addons: [
    addonDocs(), // autodocs renderer
    addonA11y(), // axe runner — without this, parameters.a11y is ignored
    addonThemes(), // globalTypes.theme + URL/channel propagation
    addonChromatic(), // visual-snapshot capture parameters (foundation for B3)
    // addonVitest is intentionally absent — see header comment.
  ],
  decorators: [
    withThemeByDataAttribute({
      attributeName: 'data-theme',
      themes: { light: 'light', dark: 'dark' },
      defaultTheme: 'light',
    }),
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
          { value: 'brand', title: 'Brand override' },
        ],
      },
    },
  },
  initialGlobals: { palette: 'default' },
})
