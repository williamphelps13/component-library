import { describe, expect, test } from 'vitest'

import { badgeClasses, type BadgeIntent } from './variants'

const intents: BadgeIntent[] = ['neutral', 'primary', 'danger', 'success']

describe('badgeClasses', () => {
  test.each(intents)('returns base + intent classes for %s', (intent) => {
    expect(badgeClasses(intent)).toBe(`ui-badge ui-badge-${intent}`)
  })

  test('every class is a static literal present in the stylesheet source', async () => {
    const { readFileSync } = await import('node:fs')
    const css = readFileSync('src/components/badge/badge.css', 'utf8')
    for (const intent of intents) {
      expect(css).toContain(`.ui-badge-${intent}`)
    }
  })
})
