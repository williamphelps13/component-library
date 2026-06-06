import type { ButtonHTMLAttributes, ReactElement, Ref } from 'react'

import { buttonClasses, type Intent, type Size } from './variants'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Semantic role: `primary` for the main action, `neutral` for secondary, `danger` for destructive.
   * For `danger`, pair the colored treatment with an explicit destructive label (e.g. "Delete account")
   * so the action is unambiguous to users for whom color carries less signal.
   */
  intent?: Intent
  /** Visual size: `sm` (compact) or `md` (default). */
  size?: Size
  // React 19: ref is a plain prop (no forwardRef). Hidden from controls/autodocs
  // via the global `propFilter` in .storybook/main.ts (it's React-implementation
  // detail, not a public API surface).
  ref?: Ref<HTMLButtonElement>
}

/**
 * Presentational button. Re-skin at runtime by overriding semantic CSS variables
 * (e.g. `--color-primary`) on any ancestor — no rebuild required.
 */
export function Button({
  intent = 'primary',
  size = 'md',
  className,
  ref,
  ...rest
}: ButtonProps): ReactElement {
  const classes = [buttonClasses(intent, size), className].filter(Boolean).join(' ')
  return <button ref={ref} className={classes} {...rest} />
}
