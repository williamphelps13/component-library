import type { StorybookConfig } from '@storybook/react-vite'

// Note: `defineMain` is a `next`-branch API not exported in 10.4.1 — use the typed
// config object. CSF Next stories work off `definePreview` in preview.tsx, not main.
const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: [
    '@chromatic-com/storybook',
    '@storybook/addon-vitest',
    '@storybook/addon-a11y',
    '@storybook/addon-docs',
    '@storybook/addon-mcp',
    '@storybook/addon-themes',
  ],
  framework: '@storybook/react-vite',
  typescript: {
    // Accurate prop tables (matters once Radix-extended props arrive).
    reactDocgen: 'react-docgen-typescript',
    reactDocgenTypescriptOptions: {
      shouldExtractLiteralValuesFromEnum: true,
      propFilter: (prop) =>
        !/node_modules/.test(prop.parent?.fileName ?? '') ||
        /@radix-ui/.test(prop.parent?.fileName ?? ''),
    },
  },
}

export default config
