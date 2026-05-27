import type { StorybookConfig } from '@storybook/react-vite'

// Note: `defineMain` is a `next`-branch API not exported in 10.4.1 — use the typed
// config object. CSF Next stories work off `definePreview` in preview.tsx, not main.
const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
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
      // Strip `| undefined` from optional union props so the inferred argTypes
      // (and the dev Controls panel) don't include an `undefined` option that
      // duplicates the runtime default (see react-docgen-typescript API).
      shouldRemoveUndefinedFromOptional: true,
      // Default include doesn't descend into dot-dirs, so `.storybook/preview.tsx`
      // falls outside the docgen TS program (startup warning). Add it explicitly;
      // `**/*.tsx` keeps default coverage for src/.
      include: ['**/*.tsx', '.storybook/**/*.tsx'],
      // Hide `ref` everywhere — React 19's ref-as-prop puts it on every
      // component's Props interface, and consumers shouldn't see it in the
      // Controls panel or the autodocs prop table. Otherwise: include local
      // props; exclude node_modules props except @radix-ui passthroughs.
      propFilter: (prop) =>
        prop.name !== 'ref' &&
        (!/node_modules/.test(prop.parent?.fileName ?? '') ||
          /@radix-ui/.test(prop.parent?.fileName ?? '')),
    },
  },
}

export default config
