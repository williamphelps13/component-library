import { createElement } from 'react'
import { renderToString } from 'react-dom/server'

// Renders every export of the BUILT package. Static gates (greps, attw,
// publint) never execute dist JS; a tsdown/react-compiler upgrade that emits
// a broken import or miscompiled component passes them all. Every component
// export must be listed here — an unlisted one fails, so new components
// cannot skip the smoke render.
const PROPS = {
  Button: { children: 'smoke' },
  Badge: { children: 'smoke' },
}

const mod = await import('../dist/index.mjs')
let failed = false
for (const [name, value] of Object.entries(mod)) {
  if (typeof value !== 'function') continue
  const props = PROPS[name]
  if (!props) {
    console.error(`FAIL: dist export ${name} has no smoke props — add it to PROPS in this script`)
    failed = true
    continue
  }
  const html = renderToString(createElement(value, props))
  if (!html.includes('smoke')) {
    console.error(`FAIL: ${name} rendered without its children: ${html.slice(0, 120)}`)
    failed = true
  }
}
// Both directions: an export missing from the runtime bundle (tree-shaking or
// emit regression) is as fatal as an unlisted one — types alone would still
// declare it, so no other gate compares runtime export names.
for (const name of Object.keys(PROPS)) {
  if (!(name in mod)) {
    console.error(`FAIL: PROPS lists ${name} but dist/index.mjs does not export it at runtime`)
    failed = true
  }
}
if (failed) process.exit(1)
console.log(`OK: dist smoke render passed (${Object.keys(PROPS).length} components)`)
