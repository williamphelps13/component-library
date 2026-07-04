import { readFileSync } from 'node:fs'
import StyleDictionary from 'style-dictionary'
import { formattedVariables } from 'style-dictionary/utils'
import { propertyFormatNames } from 'style-dictionary/enums'
import { register } from '@tokens-studio/sd-transforms'

// Wire up Tokens Studio transforms (DTCG support + reference resolution).
register(StyleDictionary)

// Single-file Tokens Studio source (free-tier Git sync). Sets: core / light / dark.
const { core, light, dark } = JSON.parse(readFileSync('tokens/tokens.json', 'utf8'))

// Deep-merge token sets into one tree (a token is an object with a `$value`).
// Set names (core/light/dark) are dropped, so token paths stay `color.*` and
// references like `{color.blue.500}` resolve against the merged tree.
function mergeSets(...sets) {
  const out = {}
  const merge = (dst, src) => {
    for (const [k, v] of Object.entries(src)) {
      if (v && typeof v === 'object' && !Array.isArray(v) && !('$value' in v)) {
        dst[k] ??= {}
        merge(dst[k], v)
      } else {
        dst[k] = v
      }
    }
  }
  for (const s of sets) merge(out, s)
  return out
}

// Semantic tokens are the ones whose value is a reference (`{core…}`).
const isSemantic = (token) =>
  typeof token.original?.$value === 'string' && token.original.$value.startsWith('{')

// Every published variable carries the ui- prefix (--ui-color-primary-bg).
// Unprefixed names collide with consumer theme systems — Tailwind v4 reserves
// --color-*/--radius-*/--spacing-* for its own theme, so an unprefixed token
// silently overrides the consumer's utilities app-wide.
StyleDictionary.registerTransform({
  name: 'name/ui-prefix',
  type: 'name',
  transform: (token) => `ui-${token.name}`,
})

// CSS custom properties under a configurable selector (SD v5 pattern).
StyleDictionary.registerFormat({
  name: 'css/themed',
  format: ({ dictionary, options }) => {
    const { selector = ':root', outputReferences = true, prepend = '' } = options
    const vars = formattedVariables({
      format: propertyFormatNames.css,
      dictionary,
      outputReferences,
      usesDtcg: true,
    })
    return `${selector} {\n${prepend}${vars}\n}\n`
  },
})

function makeSD(tokens, files, config = {}) {
  return new StyleDictionary({
    tokens,
    preprocessors: ['tokens-studio'],
    usesDtcg: true,
    ...config,
    platforms: {
      css: {
        transformGroup: 'tokens-studio',
        transforms: ['name/kebab', 'name/ui-prefix'],
        buildPath: 'build/',
        files,
      },
    },
  })
}

// :where() keeps token-selector specificity at zero so consumer `:root` overrides
// win regardless of bundler hoist order. Bare selectors at (0,1,0) silently invert.

// Light: :root with all primitives (raw) + semantic vars (as var() references).
const lightSD = makeSD(mergeSets(core, light), [
  { destination: 'tokens.light.css', format: 'css/themed', options: { selector: ':where(:root)' } },
])

// Dark: re-bind the semantic vars only (primitives stay defined in :root).
// Those semantics reference primitives intentionally NOT in this file (they
// live in :root / tokens.light.css). We keep the var() references (NOT
// `outputReferencesFilter`, which would resolve them to raw values and kill the
// primitive→semantic ripple in dark mode); they resolve fine at runtime because
// :root defines them globally. SD can't see across files, so it emits a
// "filtered references" WARNING — an expected false positive here. Silence that
// one warning, but keep genuinely broken references FATAL so real mistakes still
// fail the build (errors are not affected by `warnings: 'disabled'`).
// color-scheme: dark makes native form controls/scrollbars match the theme.
const darkSD = makeSD(
  mergeSets(core, dark),
  [
    {
      destination: 'tokens.dark.css',
      format: 'css/themed',
      options: {
        selector: ':where([data-theme="dark"])',
        prepend: '  color-scheme: dark;\n',
      },
      filter: isSemantic,
    },
  ],
  { log: { warnings: 'disabled', errors: { brokenReferences: 'throw' } } },
)

await lightSD.buildAllPlatforms()
await darkSD.buildAllPlatforms()
