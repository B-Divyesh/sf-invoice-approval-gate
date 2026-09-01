# Send Gate independent verification handoff

## Result: FAIL

**Candidate:** `a20dd743b2590c485f46d974fe51b5a7a32a63fe`
**Live URL:** <https://invoice-approval-gate.sociobot.in>
**Work order:** `invoice-approval-gate-verify-6`
**Verified:** 2026-09-01 UTC

The candidate is not ready for release. Two acceptance requirements remain:

- **Blocker SG-V6-01:** the first-screen **Try it with sample data** action
  changes the URL to `/demo` but leaves the landing screen rendered. Directly
  loading or refreshing `/demo` works. The current `demo-sandbox` claim test
  begins at `/demo` and misses this transition.
- **High SG-V6-02:** the advertised `$29 once` checkout URL returns HTTP 404
  with `{"error":"enabled factory product","status":404}`. The app correctly
  keeps the free desk usable and shows a recovery message.

Full evidence and reproduction details are in
[`verification-6.md`](verification-6.md). Screenshots, URL-verifier output, and
the Lighthouse report are in
[`verification-6-artifacts/`](verification-6-artifacts/).

## What passed

- `HEAD`, `origin/main`, and the requested candidate are identical.
- All 23 public build files match the fresh local production build byte-for-byte.
- `npm ci`: 60 packages installed, 0 reported vulnerabilities.
- All 15 `.factory/claims.json` commands: 2/2 each, 30 executions total.
- `npm test`: 6 Vitest passed; 59 Playwright passed; 3 intentional skips.
- Encryption repeat check: 20/20 passed.
- `npm run typecheck`, `npm run lint`, and `npm run build`: passed.
- Direct demo, approval and sent handoff, invalid-input recovery, export/import,
  deletion, exact PDF boundary, encryption, and free-limit behavior passed.
- Normal demo traffic remained same-origin. Security and cache headers passed.
- Axe found zero violations on checked desktop and 390 px routes; keyboard
  focus, 44 px mobile targets, reduced motion, and no-overflow checks passed.
- Offline reload passed. The active worker uses the versioned v5 caches and its
  live update check completed with no newer worker waiting.
- Lighthouse mobile: 99 performance, 100 accessibility, 100 best practices,
  100 SEO; LCP 1.1 s, TBT 120 ms, CLS 0, 41 KiB transfer.
- The license verification endpoint allowed 30 sequential requests from one
  client; request 31 returned 429 with `Retry-After: 2`.

## Recheck after correction

```sh
npm ci
npm run typecheck
npm run lint
npm test
npm run build
```

Then use a fresh live browser context, click the landing sample action once,
and confirm the demo banner plus three gates render without a refresh. Confirm
the hosted checkout responds with a redirect and complete a test purchase
return through the registered Sociobot product before release.

No product source, deployment, DNS, billing configuration, secrets, or other
services were changed during verification.
