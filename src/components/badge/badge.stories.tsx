import type { CSSProperties, ReactElement } from 'react'
import { fn, expect } from 'storybook/test'

import { allModes } from '../../../.storybook/modes'
import preview from '../../../.storybook/preview'
import { Badge } from './badge'

const meta = preview.meta({
  title: 'Components/Badge',
  component: Badge,
  args: { children: 'Badge' },
})

function DotIcon(): ReactElement {
  return (
    <svg viewBox="0 0 8 8" width="8" height="8" fill="currentColor" aria-hidden="true">
      <circle cx="4" cy="4" r="3" />
    </svg>
  )
}

// Intent baselines.
export const Neutral = meta.story({ args: { intent: 'neutral' } })
export const Primary = meta.story({ args: { intent: 'primary' } })
export const Danger = meta.story({ args: { intent: 'danger' } })
export const Success = meta.story({ args: { intent: 'success' } })

// Size baselines.
export const Small = meta.story({ args: { size: 'small' } })
export const Medium = meta.story({ args: { size: 'medium' } })

// State baselines.
export const WithIcon = meta.story({
  args: { intent: 'success', startIcon: <DotIcon />, children: 'Active' },
})
export const Removable = meta.story({
  args: { intent: 'primary', children: 'Filter: Live', onRemove: fn() },
})
export const Truncating = meta.story({
  render: (args) => (
    <div style={{ maxWidth: '8rem' }}>
      <Badge {...args}>A very long badge label that cannot possibly fit</Badge>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const label = canvasElement.querySelector('.ui-badge-label')
    if (!label) throw new Error('label span missing')
    await expect(label.scrollWidth).toBeGreaterThan(label.clientWidth)
  },
})

// Interaction: the remove button is the only interactivity the Badge owns.
export const RemoveInteraction = meta.story({
  args: { children: 'Removable', onRemove: fn() },
  play: async ({ canvas, userEvent, args }) => {
    const removeButton = canvas.getByRole('button', { name: 'Remove' })
    const box = removeButton.getBoundingClientRect()
    await expect(box.width).toBeGreaterThanOrEqual(24)
    await expect(box.height).toBeGreaterThanOrEqual(24)
    await userEvent.click(removeButton)
    await expect(args.onRemove).toHaveBeenCalledTimes(1)
    await expect(args.onRemove).toHaveBeenCalledWith(expect.objectContaining({ type: 'click' }))
  },
})

// Override token pairs — overriding `--ui-color-primary-bg` alone leaves
// `--ui-color-primary-fg` potentially sub-AA.
export const BrandPalette = meta.story({
  render: (args) => (
    <div
      style={
        {
          '--ui-color-primary-bg': 'oklch(0.45 0.2 320)',
          '--ui-color-primary-fg': 'oklch(1 0 0)',
        } as CSSProperties
      }
    >
      <Badge {...args} intent="primary" />
    </div>
  ),
})

export const SpacingOverride = meta.story({
  render: (args) => (
    <div style={{ '--ui-spacing-1': '1rem' } as CSSProperties}>
      <Badge {...args} intent="primary" onRemove={fn()} />
    </div>
  ),
})

// Axe runs only the active theme. Each component needs `Dark*` stories until
// the vitest storybook project runs both themes (deferred until component #3).
export const DarkNeutral = meta.story({
  args: { intent: 'neutral' },
  globals: { theme: 'dark' },
  tags: ['!autodocs'],
  parameters: { chromatic: { disable: true } },
})
export const DarkPrimary = meta.story({
  args: { intent: 'primary', onRemove: fn() },
  globals: { theme: 'dark' },
  tags: ['!autodocs'],
  parameters: { chromatic: { disable: true } },
})
export const DarkDanger = meta.story({
  args: { intent: 'danger' },
  globals: { theme: 'dark' },
  tags: ['!autodocs'],
  parameters: { chromatic: { disable: true } },
})
export const DarkSuccess = meta.story({
  args: { intent: 'success' },
  globals: { theme: 'dark' },
  tags: ['!autodocs'],
  parameters: { chromatic: { disable: true } },
})

const intents = ['neutral', 'primary', 'danger', 'success'] as const
const sizes = ['small', 'medium'] as const

export const AllVariants = meta.story({
  tags: ['!autodocs'],
  parameters: {
    controls: { disable: true },
    chromatic: { modes: { light: allModes.light, dark: allModes.dark } },
  },
  render: () => (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, max-content)', gap: '1rem' }}>
        {sizes.flatMap((size) =>
          intents.map((intent) => (
            <Badge key={`${intent}-${size}`} intent={intent} size={size}>
              {`${intent} / ${size}`}
            </Badge>
          )),
        )}
      </div>
      <div style={{ display: 'flex', gap: '1rem' }}>
        {intents.map((intent) => (
          <Badge key={intent} intent={intent} startIcon={<DotIcon />} onRemove={() => {}}>
            {intent}
          </Badge>
        ))}
      </div>
      <div style={{ maxWidth: '8rem' }}>
        <Badge intent="neutral">A very long badge label that cannot possibly fit</Badge>
      </div>
    </div>
  ),
})
