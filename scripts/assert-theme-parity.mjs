import { readFileSync } from 'node:fs'

// A semantic added to one theme set but not the other silently inherits the
// :root binding under the unmodified theme. Style Dictionary's
// brokenReferences:'throw' only catches `{...}` references that fail to
// resolve — not missing tokens. This script catches the parity drift before
// Style Dictionary runs, so the failure mode is one the gate can describe
// (which key, where to add it) instead of a generic "looks fine in light,
// silently broken in dark" runtime bug.

const { light, dark } = JSON.parse(readFileSync('tokens/tokens.json', 'utf8'))

function flatKeys(node, prefix = '') {
  const out = []
  for (const [k, v] of Object.entries(node)) {
    const path = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object' && !Array.isArray(v) && !('$value' in v)) {
      out.push(...flatKeys(v, path))
    } else {
      out.push(path)
    }
  }
  return out
}

const lightKeys = new Set(flatKeys(light))
const darkKeys = new Set(flatKeys(dark))

const onlyInLight = [...lightKeys].filter((k) => !darkKeys.has(k))
const onlyInDark = [...darkKeys].filter((k) => !lightKeys.has(k))

if (onlyInLight.length || onlyInDark.length) {
  console.error('FAIL: light/dark semantic parity drift in tokens/tokens.json')
  if (onlyInLight.length) {
    console.error(`  Only in light (add to dark): ${onlyInLight.join(', ')}`)
  }
  if (onlyInDark.length) {
    console.error(`  Only in dark (add to light): ${onlyInDark.join(', ')}`)
  }
  process.exit(1)
}

console.log(`OK: light/dark semantic parity holds (${lightKeys.size} keys)`)
