import type { CSSProperties } from 'react'
import { fn, expect } from 'storybook/test'

import { allModes } from '../../../.storybook/modes'
import preview from '../../../.storybook/preview'
import { Button } from './button'

const meta = preview.meta({
  title: 'Components/Button',
  component: Button,
  args: { children: 'Button' },
})

export const Primary = meta.story({ args: { intent: 'primary' } })
export const Neutral = meta.story({ args: { intent: 'neutral' } })
export const Danger = meta.story({ args: { intent: 'danger' } })
export const Small = meta.story({ args: { size: 'sm' } })
export const Disabled = meta.story({ args: { disabled: true } })

export const Clicks = meta.story({
  args: { onClick: fn() },
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Button' }))
    await expect(args.onClick).toHaveBeenCalledOnce()
  },
})

export const BrandPalette = meta.story({
  render: (args) => (
    <div style={{ '--color-primary': 'oklch(0.55 0.2 320)' } as CSSProperties}>
      <Button {...args} intent="primary" />
    </div>
  ),
})

const intents = ['primary', 'neutral', 'danger'] as const
const sizes = ['sm', 'md'] as const

export const AllVariants = meta.story({
  tags: ['!autodocs'],
  parameters: {
    controls: { disable: true },
    chromatic: { modes: { light: allModes.light, dark: allModes.dark } },
  },
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, max-content)', gap: '1rem' }}>
      {sizes.flatMap((size) =>
        intents.map((intent) => (
          <Button key={`${intent}-${size}`} intent={intent} size={size}>
            {`${intent} / ${size}`}
          </Button>
        )),
      )}
    </div>
  ),
})
