// Server-renderable: opts out of React Compiler, whose memoization injects hooks that throw in RSC.
'use no memo'

import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ComponentType,
  ReactElement,
  ReactNode,
  Ref,
} from 'react'

import { buttonClasses, type ButtonIntent, type ButtonSize } from './variants'

interface ButtonOwnProps {
  /**
   * Semantic role of the action. Pair `danger` with an explicit destructive
   * label — color alone is not enough to convey destructive intent to users
   * who can't see color.
   */
  intent?: ButtonIntent
  /** Visual size. */
  size?: ButtonSize
  /** When true, the button stretches to fill the width of its container. */
  fullWidth?: boolean
  /** Element rendered before the label (8px gap; decorative). */
  startIcon?: ReactNode
  /** Element rendered after the label (8px gap; decorative). */
  endIcon?: ReactNode
}

/** Props when the Button renders a native `<button>` (no `href`). */
export interface ButtonAsButtonProps
  extends ButtonOwnProps, ButtonHTMLAttributes<HTMLButtonElement> {
  /** When true, shows a spinner, disables interaction, and sets `aria-busy="true"`. */
  loading?: boolean
  /** Optional override for the default 16px spinner. */
  loadingIndicator?: ReactNode
  href?: undefined
  component?: undefined
  // React 19: ref is a plain prop (no forwardRef). Hidden from controls/autodocs
  // via the global `propFilter` in .storybook/main.ts (it's a React-implementation
  // detail, not a public API surface).
  ref?: Ref<HTMLButtonElement>
}

/** What a custom link component receives from the Button, e.g. Next.js `Link`. */
export type ButtonLinkComponentProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string
  ref?: Ref<HTMLAnchorElement>
}

/** Props when the Button renders a link (`href` set). */
export interface ButtonAsLinkProps
  extends ButtonOwnProps, Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'type'> {
  /** Destination. Setting it renders a link with the button's look instead of a `<button>`. */
  href: string
  /**
   * Component that renders the link, for router-aware navigation — pass
   * Next.js `Link` to keep client-side navigation and prefetching. Defaults
   * to a plain `<a>`.
   */
  component?: ComponentType<ButtonLinkComponentProps>
  // Excluded so converting a <button> to a link fails type-checking instead of
  // silently rendering <a type="submit"> or a link that only looks disabled.
  type?: never
  loading?: never
  loadingIndicator?: never
  disabled?: never
  ref?: Ref<HTMLAnchorElement>
}

/** A native `<button>`, or a link styled as a button when `href` is set. */
export type ButtonProps = ButtonAsButtonProps | ButtonAsLinkProps

function DefaultSpinner(): ReactElement {
  return (
    <svg viewBox="0 0 24 24" className="ui-button-spinner-svg" aria-hidden="true">
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

function rootClasses(
  intent: ButtonIntent,
  size: ButtonSize,
  fullWidth: boolean,
  className: string | undefined,
): string {
  return [buttonClasses(intent, size), fullWidth && 'ui-button-full-width', className]
    .filter(Boolean)
    .join(' ')
}

function ButtonContent({
  loading,
  startIcon,
  endIcon,
  children,
}: {
  loading: boolean
  startIcon: ReactNode
  endIcon: ReactNode
  children: ReactNode
}): ReactElement {
  return (
    <span className={loading ? 'ui-button-content ui-button-content-loading' : 'ui-button-content'}>
      {startIcon && (
        <span className="ui-button-icon-start" aria-hidden="true">
          {startIcon}
        </span>
      )}
      {children}
      {endIcon && (
        <span className="ui-button-icon-end" aria-hidden="true">
          {endIcon}
        </span>
      )}
    </span>
  )
}

function ButtonLink({
  intent = 'primary',
  size = 'medium',
  fullWidth = false,
  startIcon,
  endIcon,
  component: LinkComponent,
  className,
  children,
  ...rest
}: ButtonAsLinkProps): ReactElement {
  const classes = rootClasses(intent, size, fullWidth, className)
  const content = (
    <ButtonContent loading={false} startIcon={startIcon} endIcon={endIcon}>
      {children}
    </ButtonContent>
  )
  return LinkComponent ? (
    <LinkComponent className={classes} {...rest}>
      {content}
    </LinkComponent>
  ) : (
    <a className={classes} {...rest}>
      {content}
    </a>
  )
}

function NativeButton({
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
}: ButtonAsButtonProps): ReactElement {
  return (
    <button
      ref={ref}
      type={type}
      className={rootClasses(intent, size, fullWidth, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      <span className="ui-button-spinner" aria-hidden={!loading}>
        {loading && (loadingIndicator ?? <DefaultSpinner />)}
      </span>
      <ButtonContent loading={loading} startIcon={startIcon} endIcon={endIcon}>
        {children}
      </ButtonContent>
    </button>
  )
}

/**
 * Presentational button. Renders a native `<button>`, or a link with the same
 * look when `href` is set (pass `component` for a router link such as Next.js
 * `Link`). Re-skin at runtime by overriding semantic CSS variables (e.g.
 * `--ui-color-primary-bg`, `--ui-spacing-2`, `--ui-radius-md`) on any ancestor
 * — no rebuild required.
 */
export function Button(props: ButtonProps): ReactElement {
  return props.href === undefined ? <NativeButton {...props} /> : <ButtonLink {...props} />
}
