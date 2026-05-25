import { definePreview, type Decorator } from '@storybook/react-vite'
import { withThemeByDataAttribute } from '@storybook/addon-themes'
import addonDocs from '@storybook/addon-docs'

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
  // Registers the docs renderer into the preview (required for autodocs in CSF Next).
  addons: [addonDocs()],
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
