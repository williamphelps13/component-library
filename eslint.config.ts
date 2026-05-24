import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import reactHooks from 'eslint-plugin-react-hooks'
import eslintReact from '@eslint-react/eslint-plugin'
import importX from 'eslint-plugin-import-x'

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

  // Config files & scripts: plain lint, no type info required.
  {
    files: ['*.config.{ts,mjs,js}', 'scripts/**/*.{mjs,js,ts}'],
    extends: [...tseslint.configs.recommended],
  },
)
