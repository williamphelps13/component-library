// Value exports, not type-only — verbatimModuleSyntax would erase type re-exports,
// emptying dist/index.mjs and trivializing the assert-use-client gate.
export { Button, type ButtonProps } from './components/button/button'
export type { ButtonIntent, ButtonSize } from './components/button/variants'
export { Badge, type BadgeProps } from './components/badge/badge'
export type { BadgeIntent, BadgeSize } from './components/badge/variants'
