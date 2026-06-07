import { readFileSync } from 'node:fs'

// A semantic added to one theme set but forgotten in the other silently inherits
// :root under the unmodified theme. SD's `brokenReferences:'throw'` doesn't catch
// missing tokens — only unresolved `{...}` references.

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
