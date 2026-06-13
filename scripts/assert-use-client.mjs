import { readFileSync, existsSync, globSync } from 'node:fs'

const DIST = 'dist'
const BARREL = 'dist/index.mjs'

// Allowlist of dist files that MUST carry "use client". Symmetric — strip on
// an allowlisted file AND directive on a non-allowlisted file both fail.
const ALLOWED_CLIENT_ENTRIES = new Set()

// ESM directive prologue allows leading whitespace and comments; a bundler
// banner would otherwise hide or mis-flag the directive.
const DIRECTIVE_RE = /^(?:\s*(?:\/\*[\s\S]*?\*\/|\/\/[^\n]*)\s*)*['"]use client['"]/

if (!existsSync(DIST)) {
  console.error(`FAIL: ${DIST}/ is missing — run \`pnpm build\` first`)
  process.exit(1)
}
if (!existsSync(BARREL)) {
  console.error(`FAIL: ${BARREL} is missing — barrel emit failed`)
  process.exit(1)
}

let failed = false

const barrelSrc = readFileSync(BARREL, 'utf8')

// Barrel must NOT carry "use client" — would force the whole library client-side.
if (DIRECTIVE_RE.test(barrelSrc)) {
  console.error(`FAIL: ${BARREL} must not carry "use client" (kills RSC server rendering)`)
  failed = true
}

// Barrel must emit at least one value export — verbatimModuleSyntax would erase
// type-only re-exports and trivialize the directive check above.
if (!/\bexport\s/.test(barrelSrc)) {
  console.error(`FAIL: ${BARREL} has no export keyword — barrel emitted as type-only?`)
  failed = true
}

const distFiles = globSync('dist/**/*.mjs').sort()
const actualClientEntries = new Set(
  distFiles.filter((f) => DIRECTIVE_RE.test(readFileSync(f, 'utf8'))),
)

for (const file of ALLOWED_CLIENT_ENTRIES) {
  if (!actualClientEntries.has(file)) {
    console.error(`FAIL: ${file} expected "use client" but is missing it (directive stripped?)`)
    failed = true
  }
}
for (const file of actualClientEntries) {
  if (!ALLOWED_CLIENT_ENTRIES.has(file)) {
    console.error(
      `FAIL: ${file} unexpectedly carries "use client" — add to ALLOWED_CLIENT_ENTRIES in this script if intentional`,
    )
    failed = true
  }
}

if (failed) process.exit(1)
console.log(
  `OK: "use client" invariants hold (${distFiles.length} dist files scanned, ${actualClientEntries.size} client entries match allowlist)`,
)
