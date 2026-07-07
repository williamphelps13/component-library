export type ButtonIntent =
  /** Main action — most important on the screen. */
  | 'primary'
  /** Secondary or default action. */
  | 'neutral'
  /** Destructive action. */
  | 'danger'
  /** Positive or confirming action. */
  | 'success'

export type ButtonSize =
  /** Compact. */
  | 'small'
  /** Default. */
  | 'medium'
  /** Prominent. */
  | 'large'

// Literal class names per variant. The Record<…> types force a class per
// ButtonIntent/ButtonSize: add a variant and TS makes you add its class — and
// scripts/assert-css-imports.mjs plus the story tests confirm the CSS side
// ships. Literal strings (not `ui-button-${intent}`) keep the class ↔
// stylesheet pairing searchable in both directions.
const intentClass: Record<ButtonIntent, string> = {
  primary: 'ui-button-primary',
  neutral: 'ui-button-neutral',
  danger: 'ui-button-danger',
  success: 'ui-button-success',
}

const sizeClass: Record<ButtonSize, string> = {
  small: 'ui-button-small',
  medium: 'ui-button-medium',
  large: 'ui-button-large',
}

/** Resolve the class string for a Button variant. Pure → unit-testable. */
export function buttonClasses(intent: ButtonIntent, size: ButtonSize): string {
  return `ui-button ${intentClass[intent]} ${sizeClass[size]}`
}
