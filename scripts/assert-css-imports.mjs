import { readFileSync, readdirSync } from 'node:fs'

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
