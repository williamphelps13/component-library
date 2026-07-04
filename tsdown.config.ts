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
    // Only declared peers. Pre-listing future externals (radix-ui was here once)
    // lets a component import an undeclared package without any gate failing —
    // add the external and the peer dep in the same change.
    neverBundle: [/^react($|\/)/, /^react-dom($|\/)/],
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
