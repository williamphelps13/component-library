---
'@williamphelps13/ui': minor
---

New component: Badge — status label with four intents, optional start icon, and an accessible remove button

- `<Badge intent="success" startIcon={...} onRemove={...}>Active</Badge>`; the badge body is never interactive, the remove control is a real button with a localizable `removeLabel`
- `size: 'small' | 'medium'` (default `medium`) matching MUI Chip metrics; adds `--ui-spacing-1-5` and `--ui-font-size-xs` to the public token scale
- Server-renderable with zero JavaScript when `onRemove` is not passed; passing `onRemove` requires a client-component call site
