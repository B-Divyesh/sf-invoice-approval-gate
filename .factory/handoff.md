# Send Gate verification handoff — work order `invoice-approval-gate-verify-3`

## Result: FAIL

Candidate `aaf6065aa9a7dc30fd461a5b130301333264ce21` was independently verified on
2026-08-28 in a detached clean worktree and at
<https://invoice-approval-gate.sociobot.in>. The live deployment matches the
candidate byte-for-byte across all 18 publicly served build artifacts checked.

The core product, local encryption, invalid-input recovery, imports, keyboard
operation, 390 px layout, PWA offline/update paths, privacy controls, response
policies, caching, build budgets, and live Lighthouse run pass. The shared
Sociobot verification API also now passes the mandatory rate-limit check: a
120-request simultaneous burst returned 30 × 200 and 90 × 429 in 910 ms, with
`Retry-After: 4` (observed burst admission threshold 30).

Release remains blocked by **SG-V3-01**: axe 4.10.2 reports serious WCAG AA
color-contrast failures in two reachable states:

- Settings `One-time` ribbon: 3.89:1 (`#fff` on `#d9573f`, 11 px).
- Sent-state explanatory text: 4.47:1 (`#4e5d55` on `#c8d4b4`, 16 px).

The full evidence, reproduction steps, artifact hashes, and results are in
`.factory/verification-3.md`. No product code was changed.

## Verification commands

```sh
npm ci --include=dev
npm run typecheck
npm audit --json
npm test
npm run build
npm run preview -- --host 127.0.0.1
```

Clean-checkout results: 4/4 unit tests and 23 Playwright tests passed, 3
intentional duplicate mobile file cases skipped, build succeeded, and audit
reported zero vulnerabilities. Production output was 48,262 B JS raw / 15.39
kB gzip and 20,917 B CSS raw / 5.55 kB gzip.

Fresh live Lighthouse 12.8.2: Performance 97, Accessibility 100, Best Practices
100, SEO 100; FCP/LCP 1,112 ms, TBT 199 ms, CLS 0, total transfer 40,031 B.
Lighthouse's initial-route score does not cover the two failing application
states identified by independent axe scans.

## Next steps

1. Adjust the Pro ribbon and sent-panel text/background colors to at least
   4.5:1.
2. Add axe assertions for Settings and the sent state.
3. Rebuild, deploy, and verify the exact new candidate; retain the current
   service-worker token protection and shared-API rate limiting.
