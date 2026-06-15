// Server-renderable: opt out of React Compiler. Its memoization is a hook
// (useMemoCache) that throws in RSC; the build runs the compiler in infer mode,
// so this directive is what keeps the Button hook-free. assert-use-client enforces it.
'use no memo'

import type { ButtonHTMLAttributes, ReactElement, ReactNode, Ref } from 'react'

import { buttonClasses, type Intent, type Size } from './variants'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Semantic role of the action. Pair `danger` with an explicit destructive
   * label — color alone is not enough to convey destructive intent to users
   * who can't see color.
   */
  intent?: Intent
  /** Visual size. */
  size?: Size
  /** When true, the button stretches to fill the width of its container. */
  fullWidth?: boolean
  /** When true, shows a spinner, disables interaction, and sets `aria-busy="true"`. */
  loading?: boolean
  /** Optional override for the default 16px spinner. */
  loadingIndicator?: ReactNode
  /** Element rendered before the label (8px gap; decorative). */
  startIcon?: ReactNode
  /** Element rendered after the label (8px gap; decorative). */
  endIcon?: ReactNode
  // React 19: ref is a plain prop (no forwardRef). Hidden from controls/autodocs
  // via the global `propFilter` in .storybook/main.ts (it's a React-implementation
  // detail, not a public API surface).
  ref?: Ref<HTMLButtonElement>
}

function DefaultSpinner(): ReactElement {
  return (
    <svg viewBox="0 0 24 24" className="ui-btn-spinner-svg" aria-hidden="true">
      <circle
        cx="12"
        cy="12"
        r="10"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="3"
      />
      <path
        d="M22 12a10 10 0 0 1-10 10"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  )
}

/**
 * Presentational button. Re-skin at runtime by overriding semantic CSS variables
 * (e.g. `--color-primary`, `--spacing-2`, `--radius-md`) on any ancestor — no
 * rebuild required.
 */
export function Button({
  intent = 'primary',
  size = 'medium',
  fullWidth = false,
  loading = false,
  loadingIndicator,
  startIcon,
  endIcon,
  disabled,
  type = 'button',
  className,
  children,
  ref,
  ...rest
}: ButtonProps): ReactElement {
  const classes = [buttonClasses(intent, size), fullWidth && 'ui-btn-full-width', className]
    .filter(Boolean)
    .join(' ')
  const contentClasses = loading ? 'ui-btn-content ui-btn-content-loading' : 'ui-btn-content'
  return (
    <button
      ref={ref}
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      <span className="ui-btn-spinner" aria-hidden={!loading}>
        {loading && (loadingIndicator ?? <DefaultSpinner />)}
      </span>
      <span className={contentClasses}>
        {startIcon && (
          <span className="ui-btn-icon-start" aria-hidden="true">
            {startIcon}
          </span>
        )}
        {children}
        {endIcon && (
          <span className="ui-btn-icon-end" aria-hidden="true">
            {endIcon}
          </span>
        )}
      </span>
    </button>
  )
}
