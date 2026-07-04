---
'@williamphelps13/ui': patch
---

Packaging: add a `default` export condition (modern `require(esm)` consumers resolve instead of `ERR_PACKAGE_PATH_NOT_EXPORTED`) and a `./package.json` subpath for introspecting tools. Publishes are now guarded by `prepublishOnly` (fresh build + pack verification on every publish path).
