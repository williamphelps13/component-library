# @williamphelps13/ui

## 0.3.0

### Minor Changes

- [#28](https://github.com/williamphelps13/component-library/pull/28) [`d98163a`](https://github.com/williamphelps13/component-library/commit/d98163ab917c25fc0409cab65ee58df7b9ad3b26) Thanks [@williamphelps13](https://github.com/williamphelps13)! - Add `success` intent to `Button` — a positive/confirming action variant, themed via new `--color-success` / `--color-success-fg` tokens.

## 0.2.0

### Minor Changes

- [#22](https://github.com/williamphelps13/component-library/pull/22) [`e9cc573`](https://github.com/williamphelps13/component-library/commit/e9cc5730a21b0151e4898c32a6921cfe944fd66e) Thanks [@williamphelps13](https://github.com/williamphelps13)! - Add `fullWidth` prop to `Button` — stretches the button to fill its container.

## 0.1.1

### Patch Changes

- [#16](https://github.com/williamphelps13/component-library/pull/16) [`91961b7`](https://github.com/williamphelps13/component-library/commit/91961b713079333afa274f35f183d6bdbacb1509) Thanks [@williamphelps13](https://github.com/williamphelps13)! - Fix `Button` throwing in React Server Components. The React Compiler runs in `infer` mode (auto-memoizing every component), which compiled the hookless Button to import `useMemoCache` from `react/compiler-runtime` — a hook with no dispatcher in RSC. Server-renderable components now opt out with a file-level `"use no memo"` directive and ship hook-free. The Button renders in a Server Component with zero client JS, as documented.

## 0.1.0

### Minor Changes

- [#12](https://github.com/williamphelps13/component-library/pull/12) [`8c216c9`](https://github.com/williamphelps13/component-library/commit/8c216c9f22a922e0356229bcc5add01c5ee9b77c) Thanks [@williamphelps13](https://github.com/williamphelps13)! - Initial public release. Adds the `Button` component: six interactive states (idle, hover, active, focus-visible, disabled, loading), `loading`/`loadingIndicator`/`startIcon`/`endIcon` props, three sizes and three intents, and CSS-variable theming through the zero-specificity override contract. Server-renderable — no `"use client"`. Ships a precompiled `styles.css`.
