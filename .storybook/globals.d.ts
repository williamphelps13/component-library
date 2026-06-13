// preview.tsx imports the precompiled stylesheet as a side effect; give the
// `*.css` module a (typeless) declaration so the broad tsconfig accepts it.
declare module '*.css'
