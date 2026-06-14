---
'@williamphelps13/ui': patch
---

Fix `Button` throwing in React Server Components. The React Compiler runs in `infer` mode (auto-memoizing every component), which compiled the hookless Button to import `useMemoCache` from `react/compiler-runtime` — a hook with no dispatcher in RSC. Server-renderable components now opt out with a file-level `"use no memo"` directive and ship hook-free. The Button renders in a Server Component with zero client JS, as documented.
