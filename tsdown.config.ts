import { defineConfig } from 'tsdown'
import babel from '@rolldown/plugin-babel'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'es2022',
  unbundle: true,
  dts: { sourcemap: true },
  sourcemap: true,
  deps: {
    neverBundle: [/^react($|\/)/, /^react-dom($|\/)/, /^radix-ui($|\/)/, /^@radix-ui\//],
  },
  plugins: [
    babel({
      plugins: [['babel-plugin-react-compiler', { target: '19' }]],
    }),
  ],
})
