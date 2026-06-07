export type Intent =
  /** Main action — most important on the screen. */
  | 'primary'
  /** Secondary or default action. */
  | 'neutral'
  /** Destructive action. */
  | 'danger'

export type Size =
  /** Compact. */
  | 'sm'
  /** Default. */
  | 'md'

// Literal class names per variant. Tailwind scans these statically, so the
// precompiled CSS ships every variant's classes — independent of which
// stories/tests happen to reference them. The Record<…> types force a class
// per Intent/Size: add a variant → TS makes you add its class → it ships.
// (Tailwind can't resolve dynamically-built names like `ui-btn-${intent}`.)
const intentClass: Record<Intent, string> = {
  primary: 'ui-btn-primary',
  neutral: 'ui-btn-neutral',
  danger: 'ui-btn-danger',
}

const sizeClass: Record<Size, string> = {
  sm: 'ui-btn-sm',
  md: 'ui-btn-md',
}

/** Resolve the `@utility` class string for a Button variant. Pure → unit-testable. */
export function buttonClasses(intent: Intent, size: Size): string {
  return `ui-btn ${intentClass[intent]} ${sizeClass[size]}`
}
