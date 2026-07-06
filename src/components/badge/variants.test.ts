import { describe, expect, test } from 'vitest'

import { badgeClasses, type BadgeIntent, type BadgeSize } from './variants'

const intents: BadgeIntent[] = ['neutral', 'primary', 'danger', 'success']
const sizes: BadgeSize[] = ['small', 'medium']

describe('badgeClasses', () => {
  test.each(intents.flatMap((intent) => sizes.map((size) => [intent, size] as const)))(
    'returns base + intent + size classes for %s/%s',
    (intent, size) => {
      expect(badgeClasses(intent, size)).toBe(`ui-badge ui-badge-${intent} ui-badge-${size}`)
    },
  )

  test('every class is a static literal present in the stylesheet source', async () => {
    const { readFileSync } = await import('node:fs')
    const css = readFileSync('src/components/badge/badge.css', 'utf8')
    for (const intent of intents) {
      expect(css).toContain(`.ui-badge-${intent}`)
    }
    for (const size of sizes) {
      expect(css).toContain(`.ui-badge-${size}`)
    }
  })
})
