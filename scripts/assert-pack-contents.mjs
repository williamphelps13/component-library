import { execSync } from 'node:child_process'
import { existsSync, readFileSync, unlinkSync } from 'node:fs'

// publint validates exports metadata, not tarball contents. This script packs,
// walks the entries, and fails on paths that wouldn't resolve in a consumer install.

const DISALLOWED = [
  { pattern: /\.stories\.(ts|tsx|js|jsx|mjs)$/, why: 'story files import storybook/test' },
  { pattern: /\.test\.(ts|tsx|js|jsx|mjs)$/, why: 'test files import vitest' },
  {
    pattern: /^package\/src\/styles\//,
    why: 'src/styles/* uses build-time @import/@source that only resolves in this repo',
  },
]

const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
const tarballName = `${pkg.name.replace(/^@/, '').replace(/\//g, '-')}-${pkg.version}.tgz`

execSync('pnpm pack', { stdio: 'pipe' })

let entries
try {
  entries = execSync(`tar -tzf ${tarballName}`, { encoding: 'utf8' }).split('\n').filter(Boolean)
} finally {
  if (existsSync(tarballName)) unlinkSync(tarballName)
}

const offenders = []
for (const entry of entries) {
  for (const { pattern, why } of DISALLOWED) {
    if (pattern.test(entry)) offenders.push({ entry, why })
  }
}

if (offenders.length > 0) {
  console.error(`FAIL: ${offenders.length} disallowed file(s) in published tarball`)
  for (const { entry, why } of offenders) {
    console.error(`  ${entry}  (${why})`)
  }
  console.error('Narrow package.json `files` or relocate the offending files.')
  process.exit(1)
}

console.log(`OK: tarball contents pass content checks (${entries.length} entries)`)
