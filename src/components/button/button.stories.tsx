import type { CSSProperties, ReactElement } from 'react'
import { fn, expect } from 'storybook/test'

import { allModes } from '../../../.storybook/modes'
import preview from '../../../.storybook/preview'
import { Button } from './button'

const meta = preview.meta({
  title: 'Components/Button',
  component: Button,
  args: { children: 'Button' },
})

function DownloadIcon(): ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ArrowRightIcon(): ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M5 12h14m-4-4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// Intent baselines.
export const Primary = meta.story({ args: { intent: 'primary' } })
export const Neutral = meta.story({ args: { intent: 'neutral' } })
export const Danger = meta.story({ args: { intent: 'danger' } })

// Size baseline.
export const Small = meta.story({ args: { size: 'sm' } })

// State baselines.
export const Disabled = meta.story({ args: { disabled: true } })
export const Loading = meta.story({ args: { loading: true } })

// Icon slot demos.
export const WithStartIcon = meta.story({
  args: { startIcon: <DownloadIcon />, children: 'Download' },
})
export const WithEndIcon = meta.story({ args: { endIcon: <ArrowRightIcon />, children: 'Next' } })
export const WithBothIcons = meta.story({
  args: { startIcon: <DownloadIcon />, endIcon: <ArrowRightIcon />, children: 'Action' },
})
export const LoadingWithIcon = meta.story({
  args: { loading: true, startIcon: <DownloadIcon />, children: 'Saving…' },
})

// Interaction tests.
export const Clicks = meta.story({
  args: { onClick: fn() },
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Button' }))
    await expect(args.onClick).toHaveBeenCalledOnce()
  },
})

export const LoadingBlocksClicks = meta.story({
  args: { loading: true, onClick: fn() },
  play: async ({ args, canvas }) => {
    // userEvent.click refuses to fire on pointer-events:none (browser-realistic).
    // Assert the disabled + aria-busy contract directly instead.
    const button = canvas.getByRole('button', { name: 'Button' })
    await expect(button).toBeDisabled()
    await expect(button).toHaveAttribute('aria-busy', 'true')
    await expect(args.onClick).not.toHaveBeenCalled()
  },
})

export const DisabledBlocksClicks = meta.story({
  args: { disabled: true, onClick: fn() },
  play: async ({ args, canvas }) => {
    const button = canvas.getByRole('button', { name: 'Button' })
    await expect(button).toBeDisabled()
    await expect(args.onClick).not.toHaveBeenCalled()
  },
})

// Override token pairs — overriding `--color-primary` alone leaves `--color-primary-fg` sub-AA.
export const BrandPalette = meta.story({
  render: (args) => (
    <div
      style={
        {
          '--color-primary': 'oklch(0.55 0.2 320)',
          '--color-primary-fg': 'oklch(1 0 0)',
        } as CSSProperties
      }
    >
      <Button {...args} intent="primary" />
    </div>
  ),
})

export const SpacingOverride = meta.story({
  render: (args) => (
    <div style={{ '--spacing-5': '28px' } as CSSProperties}>
      <Button {...args} intent="primary" />
    </div>
  ),
})

// Axe runs only the active theme. Each component needs `Dark*` stories until
// the vitest storybook project runs both themes (deferred until component #3).
export const DarkPrimary = meta.story({
  args: { intent: 'primary' },
  globals: { theme: 'dark' },
  tags: ['!autodocs'],
  parameters: { chromatic: { disable: true } },
})
export const DarkNeutral = meta.story({
  args: { intent: 'neutral' },
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

const intents = ['primary', 'neutral', 'danger'] as const
const sizes = ['sm', 'md'] as const

export const AllVariants = meta.story({
  tags: ['!autodocs'],
  parameters: {
    controls: { disable: true },
    chromatic: { modes: { light: allModes.light, dark: allModes.dark } },
  },
  render: () => (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, max-content)', gap: '1rem' }}>
        {sizes.flatMap((size) =>
          intents.map((intent) => (
            <Button key={`${intent}-${size}`} intent={intent} size={size}>
              {`${intent} / ${size}`}
            </Button>
          )),
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, max-content)', gap: '1rem' }}>
        {intents.map((intent) => (
          <Button
            key={`${intent}-icons`}
            intent={intent}
            startIcon={<DownloadIcon />}
            endIcon={<ArrowRightIcon />}
          >
            {`${intent} / icons`}
          </Button>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, max-content)', gap: '1rem' }}>
        {intents.map((intent) => (
          <Button key={`${intent}-loading`} intent={intent} loading>
            {`${intent} / loading`}
          </Button>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, max-content)', gap: '1rem' }}>
        {intents.map((intent) => (
          <Button key={`${intent}-disabled`} intent={intent} disabled>
            {`${intent} / disabled`}
          </Button>
        ))}
      </div>
    </div>
  ),
})
