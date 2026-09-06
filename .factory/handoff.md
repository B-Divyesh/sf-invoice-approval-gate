# Send Gate verification 8 handoff — FAIL pending billing acceptance

**Implementation SHA:** `7495578975b826e2e29870f7a2a907ccc45cc853`
**Documentation SHA:** `11aa196c980302a7bc2b4857a291ae4bf859b3e2`
**Live URL:** <https://invoice-approval-gate.sociobot.in>
**Verified:** 2026-09-06 UTC

## Outcome

The product-contained Send Gate release is independently verified. Fresh
desktop and phone browser contexts completed the sample approval flow, kept
the demo label visible, reset safely, and left real storage unchanged. The
candidate's 24 public artifacts match live byte-for-byte.

The release verdict is **FAIL** because required hosted billing acceptance is
still untested. This work order forbids connecting to the billing host. It is
one blocker, not a product-code regression. All 15 registered product claims
were tested; the untested hosted checks are not registry claims.

## How verified

From a clean clone:

```sh
npm ci --include=dev
npm run typecheck
npm run lint
npm run test:unit
# Run each command in .factory/claims.json
npm test
npm run build
```

Results: 6/6 unit tests, all 15 claim commands (30 desktop/phone executions),
and the full 63 applicable browser tests passed; 3 documented mobile duplicate
tests were skipped. The production build has 56,160 B raw / 17,296 B gzip JS
and 21,999 B raw / 5,775 B gzip CSS.

Live verification passed `verify-url.sh`, 14 axe desktop/phone route scans,
keyboard skip-link and route-focus checks, 390 px reflow and targets,
reduced-motion behavior, same-origin free-workflow traffic, headers/caching,
offline service-worker reload and approval, legal pages, and designed 404.
The live artifact comparison matched all 24 public files.

## What remains

An authorised billing operator must verify the hosted checkout redirect, real
purchase return and entitlement activation, and the billing rate limit’s HTTP
429 response with `Retry-After`. Do not mark this release PASS until those
results are recorded.

No product backend, account, shared database, CLI, or library artifact exists;
tenant isolation, restart persistence, health, and clean-consumer checks do
not apply. A Lighthouse rerun could not finish because its local Chromium tab
crashed during screenshot capture; it is not counted as a new pass or a
product failure.
