import { readFileSync } from 'node:fs'

// The override contract depends on the shipped bundle declaring the layers
// theme < base < components < utilities (see src/styles/index.css header).
// A Lightning CSS upgrade or an index.css edit that drops or reorders a layer
// ships green — only this check and a real two-stylesheet render catch it.
//
// Assert first-occurrence ORDER, not the source's single-declaration syntax:
// the minifier rewrites `@layer a, b, c, d;` into interleaved statements and
// blocks (`@layer a{…}@layer b;@layer c{…}@layer d;`), which is semantically
// identical — layer order is fixed by first mention, whatever the form.
const css = readFileSync('dist/styles.css', 'utf8')
const EXPECTED = ['theme', 'base', 'components', 'utilities']

const seen = []
for (const match of css.matchAll(/@layer\s+([^;{]+)[;{]/g)) {
  for (const name of match[1].split(',').map((n) => n.trim())) {
    if (name && !seen.includes(name)) seen.push(name)
  }
}

let failed = false
if (seen.join(',') !== EXPECTED.join(',')) {
  console.error(
    `FAIL: dist/styles.css declares layers [${seen.join(', ')}]; expected exactly [${EXPECTED.join(', ')}] in that order`,
  )
  failed = true
}
for (const layer of ['theme', 'components']) {
  if (!new RegExp(`@layer ${layer}\\s*\\{`).test(css)) {
    console.error(`FAIL: dist/styles.css has no populated @layer ${layer} block`)
    failed = true
  }
}
if (failed) process.exit(1)
console.log(`OK: dist/styles.css cascade-layer contract holds (${seen.join(' < ')})`)
