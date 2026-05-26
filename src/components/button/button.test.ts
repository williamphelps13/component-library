import { describe, it, expect } from 'vitest'

import { buttonClasses } from './variants'

describe('buttonClasses', () => {
  it('composes base + intent + size', () => {
    expect(buttonClasses('primary', 'md')).toBe('ui-btn ui-btn-primary ui-btn-md')
  })

  it('supports danger + sm', () => {
    expect(buttonClasses('danger', 'sm')).toBe('ui-btn ui-btn-danger ui-btn-sm')
  })
})
