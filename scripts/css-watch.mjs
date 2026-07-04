import { watch, existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

// build/ only exists after `pnpm tokens` — fail with guidance, not ENOENT.
if (!existsSync('build')) {
  console.error('build/ missing — run `pnpm build` (or `pnpm tokens`) once before css:watch')
  process.exit(1)
}

// Dev loop: Storybook consumes the precompiled dist/styles.css, so CSS edits
// are invisible until a rebuild. Watch the CSS sources and rebuild on change.

const rebuild = () => {
  try {
    execFileSync('pnpm', ['css'], { stdio: 'inherit' })
  } catch {
    // Keep watching — the error is already on screen from the child.
  }
}

rebuild()
let timer = null
for (const dir of ['src/components', 'src/styles', 'build']) {
  watch(dir, { recursive: true }, (_event, file) => {
    if (!file?.endsWith('.css')) return
    clearTimeout(timer)
    timer = setTimeout(rebuild, 100)
  })
}
console.log('watching src/**/*.css and build/*.css — Ctrl-C to stop')
