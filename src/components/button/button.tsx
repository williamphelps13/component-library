import type { ButtonHTMLAttributes, ReactElement, Ref } from 'react'

import { buttonClasses, type Intent, type Size } from './variants'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  intent?: Intent
  size?: Size
  /** React 19: ref is a plain prop (no forwardRef). */
  ref?: Ref<HTMLButtonElement>
}

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
