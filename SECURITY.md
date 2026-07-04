# Security policy

## Supported versions

The latest published minor receives fixes. Pre-1.0, older minors are not patched — update to the newest release.

## Reporting a vulnerability

Use [GitHub private vulnerability reporting](https://github.com/williamphelps13/component-library/security/advisories/new) — do not open a public issue for security reports. You can expect an initial response within a week.

## Supply-chain posture

- Published via npm trusted publishing (OIDC) with provenance attestations — no long-lived npm tokens exist
- All GitHub Actions are pinned to full commit SHAs
- Dependency updates are automated via Renovate with a one-day minimum release age, matching pnpm's install-time supply-chain gate
