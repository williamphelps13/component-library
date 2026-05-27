// Chromatic snapshot modes — single source of truth.
// The `theme` value is consumed by the addon-themes `withThemeByDataAttribute`
// decorator (see .storybook/preview.tsx), which propagates it to `data-theme`
// on <html>. Chromatic applies these per-story via `parameters.chromatic.modes`
// (addon-themes does NOT auto-feed Chromatic — modes must be declared per-story).
export const allModes = {
  light: { theme: 'light' },
  dark: { theme: 'dark' },
} as const
