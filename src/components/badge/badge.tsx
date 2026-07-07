// Server-renderable: opts out of React Compiler, whose memoization injects hooks that throw in RSC.
'use no memo'

import type {
  HTMLAttributes,
  MouseEvent as ReactMouseEvent,
  ReactElement,
  ReactNode,
  Ref,
} from 'react'

import { badgeClasses, type BadgeIntent, type BadgeSize } from './variants'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /**
   * Visual role of the badge. Status conveyed by color alone is invisible to
   * users who can't see color — pair `danger`/`success` with text or an icon
   * that carries the same meaning.
   */
  intent?: BadgeIntent
  /** Visual size. */
  size?: BadgeSize
  /** Icon rendered before the label. Sized by the consumer (1em fits the text line). */
  startIcon?: ReactNode
  /**
   * Renders a remove button after the label and calls this when it is
   * activated (receives the click event, so consumers can `stopPropagation`
   * inside clickable rows). The badge body itself is never interactive.
   * RSC note: passing a function prop requires a client-component call site;
   * without `onRemove` the Badge renders on the server with zero JS.
   */
  onRemove?: (event: ReactMouseEvent<HTMLButtonElement>) => void
  /**
   * Accessible name for the remove button. With several removable badges,
   * make each unique (`removeLabel={'Remove ' + label}`) so screen-reader
   * users can tell them apart. Localize when the UI is not English.
   */
  removeLabel?: string
  /** Badge content. Truncates with an ellipsis when the container constrains it. */
  children: ReactNode
  ref?: Ref<HTMLSpanElement>
}

/**
 * Status label. Re-skin at runtime by overriding semantic CSS variables
 * (e.g. `--ui-color-primary-bg`) on any ancestor — no rebuild required.
 */
export function Badge({
  intent = 'neutral',
  size = 'medium',
  startIcon,
  onRemove,
  removeLabel = 'Remove',
  className,
  children,
  ref,
  ...rest
}: BadgeProps): ReactElement {
  const classes = [badgeClasses(intent, size), className].filter(Boolean).join(' ')

  return (
    <span ref={ref} className={classes} {...rest}>
      {startIcon && (
        <span className="ui-badge-icon" aria-hidden="true">
          {startIcon}
        </span>
      )}
      <span className="ui-badge-label">{children}</span>
      {onRemove && (
        <button
          type="button"
          className="ui-badge-remove"
          aria-label={removeLabel}
          onClick={onRemove}
        >
          <svg className="ui-badge-remove-svg" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M4 4l8 8M12 4l-8 8"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      )}
    </span>
  )
}
