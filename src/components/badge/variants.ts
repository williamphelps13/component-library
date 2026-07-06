export type BadgeIntent =
  /** Quiet status — the default. */
  | 'neutral'
  /** Brand-colored emphasis. */
  | 'primary'
  /** Destructive or error status. */
  | 'danger'
  /** Positive or confirming status. */
  | 'success'

// Literal class names per variant. The Record<…> type forces a class per
// BadgeIntent: add a variant and TS makes you add its class — and
// scripts/assert-css-imports.mjs plus the story tests confirm the CSS side
// ships. Literal strings keep the class ↔ stylesheet pairing searchable.
const intentClass: Record<BadgeIntent, string> = {
  neutral: 'ui-badge-neutral',
  primary: 'ui-badge-primary',
  danger: 'ui-badge-danger',
  success: 'ui-badge-success',
}

/** Resolve the class string for a Badge variant. Pure → unit-testable. */
export function badgeClasses(intent: BadgeIntent): string {
  return `ui-badge ${intentClass[intent]}`
}
