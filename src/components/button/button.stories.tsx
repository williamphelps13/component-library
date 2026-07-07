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
export const Success = meta.story({ args: { intent: 'success' } })

// Size baselines.
export const Small = meta.story({ args: { size: 'small' } })
export const Medium = meta.story({ args: { size: 'medium' } })
export const Large = meta.story({ args: { size: 'large' } })

// Layout modifier — stretches to fill the container.
export const FullWidth = meta.story({
  args: { fullWidth: true },
  render: (args) => (
    <div style={{ width: 320 }}>
      <Button {...args} />
    </div>
  ),
})

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
  play: async ({ args, canvas, userEvent }) => {
    const button = canvas.getByRole('button', { name: 'Button' })
    await expect(button).toBeDisabled()
    await expect(button).toHaveAttribute('aria-busy', 'true')
    await userEvent.click(button)
    await expect(args.onClick).not.toHaveBeenCalled()
  },
})

export const DisabledBlocksClicks = meta.story({
  args: { disabled: true, onClick: fn() },
  play: async ({ args, canvas, userEvent }) => {
    const button = canvas.getByRole('button', { name: 'Button' })
    await expect(button).toBeDisabled()
    await userEvent.click(button)
    await expect(args.onClick).not.toHaveBeenCalled()
  },
})

// Keyboard focus is programmatic, so the ring (a conventions-floor contract:
// 2px outline) is asserted behaviorally. Hover/active are covered by the
// forced-pseudo visual stories below — :hover is a browser trusted event that
// synthetic pointers cannot activate.
export const FocusRing = meta.story({
  tags: ['!autodocs'],
  parameters: { chromatic: { disable: true } },
  play: async ({ canvas, userEvent }) => {
    const button = canvas.getByRole('button', { name: 'Button' })
    await userEvent.tab()
    await expect(button).toHaveFocus()
    const focused = getComputedStyle(button)
    await expect(focused.outlineWidth).toBe('2px')
    await expect(focused.outlineStyle).toBe('solid')
  },
})

// Forced pseudo-states (storybook-addon-pseudo-states) — Chromatic snapshots
// the hover/active looks in both themes. (Snapshot-only: the addon cannot
// apply in the vitest harness, so axe sees these stories idle.)
export const HoverStates = meta.story({
  tags: ['!autodocs'],
  parameters: {
    pseudo: { hover: '.force-hover' },
    controls: { disable: true },
    chromatic: { modes: { light: allModes.light, dark: allModes.dark } },
  },
  render: () => (
    <div style={{ display: 'flex', gap: '1rem' }}>
      {intents.map((intent) => (
        <Button key={intent} intent={intent} className="force-hover">
          {`${intent} / hover`}
        </Button>
      ))}
      <Button intent="primary">idle control</Button>
    </div>
  ),
  // The snapshot is the addon's no-op guard — a programmatic assertion is
  // infeasible in both test lanes (vitest lacks #storybook-root, the addon's
  // anchor; Chromatic runs play before the addon's stylesheet-rewrite event).
  // The in-frame idle control makes addon death obvious: if every button
  // matches the control, forcing is broken and the Chromatic diff flags it.
})

export const ActiveStates = meta.story({
  tags: ['!autodocs'],
  parameters: {
    pseudo: { active: true },
    controls: { disable: true },
    // Forced :active also starts the ripple keyframes; pause at the END frame
    // (ripple at opacity 0) so the snapshot shows the pressed background and
    // shadow, not a frozen mid-ripple wash.
    chromatic: {
      modes: { light: allModes.light, dark: allModes.dark },
      pauseAnimationAtEnd: true,
    },
  },
  render: () => (
    <div style={{ display: 'flex', gap: '1rem' }}>
      {intents.map((intent) => (
        <Button key={intent} intent={intent}>
          {`${intent} / active`}
        </Button>
      ))}
    </div>
  ),
})

// Override token pairs — overriding `--ui-color-primary-bg` alone leaves `--ui-color-primary-fg` sub-AA.
export const BrandPalette = meta.story({
  render: (args) => (
    <div
      style={
        {
          '--ui-color-primary-bg': 'oklch(0.55 0.2 320)',
          '--ui-color-primary-fg': 'oklch(1 0 0)',
        } as CSSProperties
      }
    >
      <Button {...args} intent="primary" />
    </div>
  ),
})

export const SpacingOverride = meta.story({
  render: (args) => (
    <div style={{ '--ui-spacing-2': '2rem' } as CSSProperties}>
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
export const DarkSuccess = meta.story({
  args: { intent: 'success' },
  globals: { theme: 'dark' },
  tags: ['!autodocs'],
  parameters: { chromatic: { disable: true } },
})
export const DarkLoading = meta.story({
  args: { loading: true },
  globals: { theme: 'dark' },
  tags: ['!autodocs'],
  parameters: { chromatic: { disable: true } },
})
export const DarkDisabled = meta.story({
  args: { disabled: true },
  globals: { theme: 'dark' },
  tags: ['!autodocs'],
  parameters: { chromatic: { disable: true } },
})

const intents = ['primary', 'neutral', 'danger', 'success'] as const
const sizes = ['small', 'medium', 'large'] as const

export const AllVariants = meta.story({
  tags: ['!autodocs'],
  parameters: {
    controls: { disable: true },
    chromatic: { modes: { light: allModes.light, dark: allModes.dark } },
  },
  render: () => (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, max-content)', gap: '1rem' }}>
        {sizes.flatMap((size) =>
          intents.map((intent) => (
            <Button key={`${intent}-${size}`} intent={intent} size={size}>
              {`${intent} / ${size}`}
            </Button>
          )),
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, max-content)', gap: '1rem' }}>
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, max-content)', gap: '1rem' }}>
        {intents.map((intent) => (
          <Button key={`${intent}-loading`} intent={intent} loading>
            {`${intent} / loading`}
          </Button>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, max-content)', gap: '1rem' }}>
        {intents.map((intent) => (
          <Button key={`${intent}-disabled`} intent={intent} disabled>
            {`${intent} / disabled`}
          </Button>
        ))}
      </div>
    </div>
  ),
})
