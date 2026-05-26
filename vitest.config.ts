import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin'
import { playwright } from '@vitest/browser-playwright'

// ESM: __dirname doesn't exist, so derive it from import.meta.url.
const dirname = path.dirname(fileURLToPath(import.meta.url))

// https://storybook.js.org/docs/writing-tests/integrations/vitest-addon
export default defineConfig({
  test: {
    projects: [
      // Stories-as-tests + a11y, in a real headless browser.
      {
        extends: true,
        plugins: [storybookTest({ configDir: path.join(dirname, '.storybook') })],
        test: {
          name: 'storybook',
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({}),
            instances: [{ browser: 'chromium' }],
          },
        },
      },
      // Pure-logic unit tests (no DOM → node, not jsdom).
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'node',
          include: ['src/**/*.test.ts'],
        },
      },
    ],
  },
})
