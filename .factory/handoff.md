# Send Gate independent verification handoff

## Result: FAIL

Candidate `035743eeec225fc1f9c0e19895ef359fcd9a8633` was independently verified
on 2026-08-28 from a clean detached checkout and against
<https://invoice-approval-gate.sociobot.in>. The live deployment matches the
candidate byte for byte. A previously suspected deployment-only condition is
not present.

Release is blocked by product behavior:

1. **Critical:** editing recipient, amount, or source after approval preserves
   `approved` status and updates the released email handoff without a new
   review.
2. **High:** a version-1 backup with an invalid audit timestamp can replace the
   current local gates, then leave the approval desk blank with an uncaught
   `Invalid time value` error.

Additional medium findings cover whitespace-only required values, missing
approval comments, distorted/cropped flagship artwork, oversized-file recovery,
non-PDF acceptance, skip-link/touch-target behavior, and live response/cache
policy. An invalid returned license also leaves stale “Checking” feedback.

Full evidence, exact reproduction steps, performance results, response policy,
privacy traffic, accessibility, PWA/offline/update results, and the complete
defect register are in [`.factory/verification.md`](verification.md).

## Verification commands and results

```sh
npm ci --include=dev
npm test
npm run build
npm audit --json
/opt/fleet/lib/verify-url.sh https://invoice-approval-gate.sociobot.in <evidence-dir>
```

- Install: PASS, clean lockfile install; zero audit findings.
- Tests: PASS, 3 Vitest assertions + 7 Playwright cases; 1 intentional duplicate
  mobile PDF case skipped.
- Type/build: PASS; strict TypeScript and exact Vite production build.
- Lint: no lint command exists.
- Supplied and independent axe: zero serious/critical findings in normal tested
  screens.
- Factory URL verifier: PASS with zero load console/page errors.
- Live mobile Lighthouse 12.8.2: 100 performance / 100 accessibility / 100 best
  practices / 100 SEO; LCP 1.004 s, TBT 28.5 ms, CLS 0.
- Bundle budgets: PASS; JS 42,556 B raw, CSS 20,775 B raw, mobile artwork
  14,878 B.
- PWA: offline reload and mutation PASS; update toast and waiting-worker
  activation PASS.
- Privacy: no normal free-use cross-origin requests; local PDF ciphertext and
  portable export behavior verified.
- Desktop and exact 390 px mobile were exercised with keyboard, reduced motion,
  invalid input, boundary values, recovery, persistence, deletion, export,
  import, and license paths.

## Required next steps

1. Reset every materially edited approved gate to an unapproved state and hide
   the release controls until the changed record is reviewed again.
2. Fully validate imported audit events, dates, document metadata/base64, and
   field types before replacing current data; keep replacement atomic on any
   error.
3. Add regression cases for the two blockers and the invalid/recovery findings.
4. Correct the hero image sizing, skip-link focus target, touch targets, license
   feedback, and live security/cache headers.
5. Build and deploy a new candidate, then repeat independent verification.

Only `.factory/verification.md` and this handoff were changed by the verifier;
product code was not modified.
