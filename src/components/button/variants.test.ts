import { describe, expect, test } from 'vitest'

import { buttonClasses, type Intent, type Size } from './variants'

const intents: Intent[] = ['primary', 'neutral', 'danger', 'success']
const sizes: Size[] = ['small', 'medium', 'large']

describe('buttonClasses', () => {
  test.each(intents.flatMap((intent) => sizes.map((size) => [intent, size] as const)))(
    'returns base + intent + size classes for %s/%s',
    (intent, size) => {
      const classes = buttonClasses(intent, size)
      expect(classes).toBe(`ui-btn ui-btn-${intent} ui-btn-${size}`)
    },
  )

  test('every class is a static literal present in the stylesheet source', async () => {
    const { readFileSync } = await import('node:fs')
    const css = readFileSync('src/components/button/button.css', 'utf8')
    for (const intent of intents) {
      expect(css).toContain(`.ui-btn-${intent}`)
    }
    for (const size of sizes) {
      expect(css).toContain(`.ui-btn-${size}`)
    }
  })
})
