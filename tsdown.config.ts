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
      // infer mode (the default): every component is auto-memoized. The compiler's
      // memoization is itself a hook (useMemoCache), which throws in RSC, so
      // server-renderable components opt out with a file-level "use no memo"
      // directive and ship hook-free. assert-use-client fails the build if a
      // non-"use client" file is compiled. See ARCHITECTURE.md § "Server and
      // client boundary".
      plugins: [['babel-plugin-react-compiler', { target: '19' }]],
    }),
  ],
})
