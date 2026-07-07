export type BadgeIntent =
  /** Quiet status — the default. */
  | 'neutral'
  /** Brand-colored emphasis. */
  | 'primary'
  /** Destructive or error status. */
  | 'danger'
  /** Positive or confirming status. */
  | 'success'

export type BadgeSize =
  /** Compact — MUI Chip small metrics (24px). */
  | 'small'
  /** Default — MUI Chip medium metrics (32px). */
  | 'medium'

// Literal class names per variant. The Record<…> types force a class per
// BadgeIntent/BadgeSize: add a variant and TS makes you add its class — and
// scripts/assert-css-imports.mjs plus the story tests confirm the CSS side
// ships. Literal strings keep the class ↔ stylesheet pairing searchable.
const intentClass: Record<BadgeIntent, string> = {
  neutral: 'ui-badge-neutral',
  primary: 'ui-badge-primary',
  danger: 'ui-badge-danger',
  success: 'ui-badge-success',
}

const sizeClass: Record<BadgeSize, string> = {
  small: 'ui-badge-small',
  medium: 'ui-badge-medium',
}

/** Resolve the class string for a Badge variant. Pure → unit-testable. */
export function badgeClasses(intent: BadgeIntent, size: BadgeSize): string {
  return `ui-badge ${intentClass[intent]} ${sizeClass[size]}`
}
