import { existsSync, readFileSync, readdirSync } from 'node:fs'

// Fresh clones hit this via `pnpm test` (which builds CSS first) before any
// full build has produced the gitignored token output — say so plainly
// instead of letting Lightning CSS fail on an unresolvable @import.
if (!existsSync('build/tokens.light.css')) {
  console.error('FAIL: build/tokens.light.css is missing — run `pnpm build` first (fresh clone?)')
  process.exit(1)
}

// A component CSS file that isn't @imported in src/styles/index.css ships the
// component unstyled while every gate stays green — unknown ui-* classes are
// simply absent from dist/styles.css. Same silent-failure shape as
// assert-theme-parity.mjs, same defense: fail the build.

const entry = readFileSync('src/styles/index.css', 'utf8')
const missing = []

for (const dirent of readdirSync('src/components', { withFileTypes: true })) {
  if (!dirent.isDirectory()) continue
  for (const file of readdirSync(`src/components/${dirent.name}`)) {
    if (!file.endsWith('.css')) continue
    if (!entry.includes(`components/${dirent.name}/${file}`)) {
      missing.push(`src/components/${dirent.name}/${file}`)
    }
  }
}

if (missing.length) {
  console.error('FAIL: component CSS not imported in src/styles/index.css:')
  for (const m of missing) console.error(`  ${m}`)
  process.exit(1)
}

console.log('OK: every component CSS file is imported in src/styles/index.css')
