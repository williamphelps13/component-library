import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import reactHooks from 'eslint-plugin-react-hooks'
import eslintReact from '@eslint-react/eslint-plugin'
import importX from 'eslint-plugin-import-x'
import storybook from 'eslint-plugin-storybook'

export default tseslint.config(
  { ignores: ['dist', 'build', 'storybook-static', 'coverage'] },
  js.configs.recommended,
  // Library source: full type-aware + React/a11y/import linting.
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [
      ...tseslint.configs.recommendedTypeChecked,
      jsxA11y.flatConfigs.strict,
      eslintReact.configs['recommended-typescript'],
      // Defer Rules-of-Hooks to the dedicated plugin (avoid double-reporting).
      eslintReact.configs['disable-conflict-eslint-plugin-react-hooks'],
    ],
    languageOptions: { parserOptions: { projectService: true } },
    plugins: { 'react-hooks': reactHooks, 'import-x': importX },
    rules: {
      ...reactHooks.configs['recommended-latest'].rules,
      'import-x/order': 'warn',
      'import-x/no-duplicates': 'error',
    },
  },
  // Config files, scripts, Storybook/Vitest config: plain lint, no type info.
  // (.storybook/*.ts(x) match none of the type-aware globs, so they need a TS
  // parser block here or eslint's default parser chokes on TS syntax.)
  {
    files: ['*.config.{ts,mjs,js}', 'scripts/**/*.{mjs,js,ts}', '.storybook/**/*.{ts,tsx}'],
    extends: [...tseslint.configs.recommended],
  },
  // Storybook story linting (flat config; targets *.stories.*).
  storybook.configs['flat/recommended'],
  // Edit-time guard for the barrel directive — faster feedback than the dist gate.
  {
    files: ['src/index.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Program > ExpressionStatement > Literal[value="use client"]',
          message:
            'The barrel must not carry "use client" — would force the entire library client-side and kill RSC server rendering.',
        },
      ],
    },
  },
)
