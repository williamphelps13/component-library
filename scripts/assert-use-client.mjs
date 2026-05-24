import { readFileSync, existsSync } from 'node:fs'

// The barrel must NEVER carry "use client" (it would force the whole library
// client-side and kill RSC server rendering). Per-component client entrypoints
// get added to CLIENT_ENTRIES from Phase 4+ and are asserted to KEEP theirs.
const BARREL = 'dist/index.mjs'
const CLIENT_ENTRIES = []

let failed = false

if (existsSync(BARREL)) {
  const src = readFileSync(BARREL, 'utf8')
  if (/^\s*['"]use client['"]/.test(src)) {
    console.error(`FAIL: ${BARREL} must not carry "use client" (kills RSC server rendering)`)
    failed = true
  }
}

for (const file of CLIENT_ENTRIES) {
  const src = readFileSync(file, 'utf8')
  if (!/^\s*['"]use client['"]/.test(src)) {
    console.error(`FAIL: ${file} lost its "use client" directive`)
    failed = true
  }
}

if (failed) process.exit(1)
console.log('OK: "use client" invariants hold')
