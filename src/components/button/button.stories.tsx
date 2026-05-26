import { fn, expect } from 'storybook/test'

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

export const Clicks = meta.story({
  args: { onClick: fn() },
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Button' }))
    await expect(args.onClick).toHaveBeenCalledOnce()
  },
})
