// Value exports, not type-only — verbatimModuleSyntax would erase type re-exports,
// emptying dist/index.mjs and trivializing the assert-use-client gate.
export { Button, type ButtonProps } from './components/button/button'
export type { Intent, Size } from './components/button/variants'
