# Send Gate independent verification handoff

## Result: FAIL

Candidate `fd2e217789e994e70f44fe8c55561c574d45d63a` was independently tested on
2026-08-28 at <https://invoice-approval-gate.sociobot.in> for work order
`invoice-approval-gate-verify-2`. The live deployment matches the candidate
byte for byte. No deployment-only failure remains, but the release contract is
not satisfied.

No product code was changed. The detailed evidence and exact reproductions are
in [`.factory/verification-2.md`](verification-2.md).

## Release blockers

- **High — SG-V2-01:** a type-correct imported backup can claim `approved`
  while containing only a `created` audit event and no decision comment. Import
  accepts it and immediately releases the email handoff.
- **High — SG-V2-02:** the Sociobot verification endpoint returned HTTP 200 for
  all 520 rapid invalid-token requests. No 429, `Retry-After`, or rate-limit
  threshold was observed.
- **Medium — SG-V2-03:** with an active service worker, a returned license token
  remains in a `send-gate-v2-runtime` Cache Storage request URL after it is
  stripped from the visible URL.

## What passed

- Clean install, strict typecheck, 4/4 unit-policy assertions, 19/19 applicable
  Playwright cases, dependency audit, and exact production build.
- Normal link/PDF lifecycle, approval withdrawal after edits, invalid-input
  recovery, encryption, deletion, free-tier limit, and keyboard-only workflow.
- Desktop and exact 390×844 mobile, zero axe violations in independent empty,
  populated, and mobile scans, visible focus, reduced motion, legal routes, and
  no browser errors.
- Installable manifest, controlled v2 service worker, offline reload/mutation,
  and update toast/controller replacement.
- Candidate/live artifact hashes, security headers, correct MIME and caching,
  local-only free-use traffic, and no analytics/remote fonts/scripts.
- Live Lighthouse: 95 performance, 100 accessibility, 100 best practices, 100
  SEO; LCP 1.428 s, CLS 0, total transfer 39,685 B.

## Commands used

```sh
npm ci --include=dev
npm run typecheck
npm audit --json
npm test
npm run build
/opt/fleet/lib/verify-url.sh http://127.0.0.1:4173 <evidence-dir>
/opt/fleet/lib/verify-url.sh https://invoice-approval-gate.sociobot.in <evidence-dir>
CHROME_PATH=/opt/pw-browsers/chromium-1208/chrome-linux64/chrome \
  npx --yes lighthouse@12.8.2 https://invoice-approval-gate.sociobot.in
```

## Next steps

1. Reject imports whose state, required comment, timestamps, and audit sequence
   are inconsistent; preserve current data atomically on rejection.
2. Add API-edge rate limiting with HTTP 429 and `Retry-After`, then document the
   observed threshold from a fresh burst.
3. Exclude `license` navigation URLs from service-worker caching and purge old
   sensitive cache keys during activation.
4. Add regression tests and submit a new candidate for independent verification.
