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
const fileSrc = new Map(distFiles.map((f) => [f, readFileSync(f, 'utf8')]))
const actualClientEntries = new Set(distFiles.filter((f) => DIRECTIVE_RE.test(fileSrc.get(f))))

// A file without "use client" must be genuinely server-renderable — no hooks.
// The React Compiler is the realistic offender: in `infer` mode (the build
// default) it rewrites even hookless components to import `c` (useMemoCache) from
// `react/compiler-runtime`, which reads React's dispatcher and throws in RSC.
// Server components opt out with a file-level "use no memo". The absence of a
// "use client" directive does NOT prove server-renderability — these checks
// catch what the directive check can't.
const COMPILER_RUNTIME_RE = /\bfrom\s*['"]react\/compiler-runtime['"]/
// Match hook *call-sites* (`useX(`, and member form `React.useX(` via the `\b`),
// not imports — so namespace/default React imports can't smuggle a hook past the
// gate. Bare `use(` (the React 19 `use` API, valid in RSC) is intentionally not
// matched: the call must start `use` + an uppercase letter.
const HOOK_CALL_RE = /\buse[A-Z]\w*(?=\s*\()/g
for (const file of distFiles) {
  if (actualClientEntries.has(file)) continue
  const src = fileSrc.get(file)
  if (COMPILER_RUNTIME_RE.test(src)) {
    console.error(
      `FAIL: ${file} imports react/compiler-runtime but carries no "use client" — a compiled (hook-using) component cannot render in RSC. If it's server-renderable, add a file-level "use no memo" to opt out of the compiler; if it's interactive, add "use client" (and to the allowlist).`,
    )
    failed = true
  }
  const hooks = [...new Set([...src.matchAll(HOOK_CALL_RE)].map((m) => m[0]))]
  if (hooks.length) {
    console.error(
      `FAIL: ${file} calls React hook(s) [${hooks.join(', ')}] but carries no "use client" — hooks don't run in RSC. Add "use client" (and to the allowlist) or remove the hook.`,
    )
    failed = true
  }
}

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
