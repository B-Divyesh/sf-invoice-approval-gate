# Independent product verification — FAIL

**Candidate:** `fd2e217789e994e70f44fe8c55561c574d45d63a`

**Live URL:** <https://invoice-approval-gate.sociobot.in>

**Verified:** 2026-08-28 UTC

**Work order:** `invoice-approval-gate-verify-2`

## Verdict

**FAIL.** The candidate is deployed byte for byte, its normal approval flow and
offline PWA behavior work, all supplied tests pass, and the live page clears
the accessibility, response-policy, bundle, and Lighthouse category gates.
It is not releasable under the supplied acceptance contract for two high-
severity reasons:

1. Import accepts a record that says it is approved even though its audit
   history contains no submission or approval and it has no required decision
   comment. The app immediately releases the client email handoff.
2. The product's Sociobot license-verification endpoint did not rate-limit any
   of 520 rapid requests. Every response was HTTP 200; no HTTP 429 or
   `Retry-After` was observed.

An additional privacy defect leaves a returned bearer license token in a
service-worker Cache Storage request URL after the address bar is cleaned.

No product code was modified during verification.

## Candidate and deployment identity

- The checkout began clean on `main` at the full requested SHA. `origin/main`
  resolved to the same SHA after a fresh fetch.
- The live HTML names the candidate's generated assets,
  `index-GjlLtyE8.js` and `index-B-aD2WJj.css`.
- Fresh candidate/live SHA-256 comparisons matched for `index.html`, JS, CSS,
  `sw.js`, the manifest, offline page, both legal routes, both artwork sizes,
  and every PWA icon.

| Artifact | Candidate and live SHA-256 |
| --- | --- |
| `index.html` | `dc07550444998921c936af2387bef80e27f38c8b582dcaff0b695c37220a588a` |
| JavaScript | `cc86f4106dc14968c7041f3454d35e921dc28ad742d1e6e5d2574c0e203e8f64` |
| CSS | `d2c5dc5c1787262c05e751cbc91dab9dbaf1996b93b6cc5aacd2a2387de90ec5` |
| Service worker | `3b22a1b08337b50150ef4f4c6a77a67dd2acfd2f59cb27312677c129c22972f5` |
| Manifest | `c8cf3996fcec119bdef15699798f38c6ec4b161b1b09381b093dc2e3aa65898d` |

This is fresh evidence that the deployment matches the candidate. The prior
deployment-only concern does not reproduce.

## Clean local quality gates

Environment: Node `v22.23.2`, npm `10.9.8`, Playwright `1.58.2`.

| Check | Result | Evidence |
| --- | --- | --- |
| Clean install | PASS | `npm ci --include=dev`; 60 packages added, 0 vulnerabilities |
| Dependency audit | PASS | `npm audit --json`; 0 findings at every severity |
| Strict types | PASS | `npm run typecheck`; no diagnostics |
| Unit/policy tests | PASS | 4/4 Vitest assertions |
| Browser tests | PASS | 19/19 applicable Playwright cases across desktop and exact 390×844 mobile; 3 intentional duplicate mobile crypto/large-file cases skipped |
| Exact production build | PASS | `npm run build`; `dist/` produced at the repository root |
| Lint | N/A | no lint script or linter is configured |

Production output:

- JavaScript: 46,868 B raw / 15.01 kB gzip
- CSS: 20,917 B raw / 5.55 kB gzip
- mobile artwork: 14,878 B
- desktop artwork: 51,364 B
- fonts: 0 B; no runtime dependencies

The JavaScript, CSS, font, and mobile-image budgets pass.

## Product behavior and input recovery

### Passed

- Full link workflow: create, persist/reload, submit, require a return comment,
  edit, resubmit, require an approval comment, approve, release a recipient-
  specific `mailto:`, and seal the record as sent.
- Editing an approved recipient/source/amount withdraws approval, clears the
  released handoff, and requires another review.
- PDF bytes are AES-GCM encrypted before IndexedDB storage; the key is kept
  separately in local storage. Approved bytes download with the original
  filename.
- A 15 MiB PDF (the exact maximum) was accepted and stored as 15,728,640 B of
  plaintext metadata and 15,728,656 B of ciphertext. Empty, oversized, and
  disguised PDF inputs showed recoverable errors; switching an oversized file
  attempt to a valid link recovered successfully.
- Invalid URL, email, negative amount, whitespace identity, and blank decision
  inputs were blocked. Correcting all three fields created a `$0.00` boundary
  gate without stale errors.
- A sixth active gate was blocked at the five-gate free limit. Cancelling a
  named deletion preserved the record; confirming removed it and reopened a
  free slot.
- Valid PDF backup restore re-encrypted bytes locally. Invalid timestamps and
  source/document metadata were rejected atomically by supplied regression
  coverage.
- A complete create → submit → comment → approve path was repeated using only
  Tab, arrow keys, typing, Enter, and Space. There was no trap. Focus used a
  visible 3 px coral outline with a 3 px offset.
- Direct `/privacy/` and `/terms/` loads returned 200 with one `h1` and one
  `main` each.

### Failed

See SG-V2-01 in the defect register. Type-correct import validation does not
enforce workflow/audit invariants, allowing a false approval to release the
handoff.

## PWA, offline, and update behavior

- Chromium parsed `manifest.webmanifest` without errors. It has the required
  192/512/maskable icons, standalone display, versioned start URL, and matching
  theme/background colors.
- The live worker controlled the app with `send-gate-v2-shell` and
  `send-gate-v2-runtime` caches.
- A saved gate survived an explicit offline reload and remained operable
  offline; the supplied desktop/mobile offline mutation cases also passed.
- Registering a changed worker URL produced the in-app “A fresh version is
  ready” toast. Choosing **Update now** moved the controller from `/sw.js` to
  `/sw.js?qa-update=1787902112550` without a page error.
- The sensitive navigation-cache behavior in SG-V2-03 failed privacy review.

## Accessibility, responsive behavior, and browser health

- Factory `verify-url.sh` passed locally and live: HTTP 200, correct title and
  `lang=en`, one `h1`, one main landmark, complete image alt text, labeled
  buttons, and no console/page errors.
- Independent Playwright axe scans found zero violations on live empty,
  populated, and 390 px screens. Therefore there were zero serious or critical
  findings. The supplied tests also cover populated, privacy, and terms views.
- Skip-link activation focused `main`. Keyboard use and visible focus passed.
- At 390 px, `scrollWidth == innerWidth == 390`; brand, Privacy, and Terms
  targets were all at least 44 px high. The 320 px reflow smoke test did not
  create document-level horizontal overflow.
- Reduced-motion emulation changed animation and transition duration to
  `0.01ms` and scroll behavior to `auto`.
- No console error, uncaught page error, or unexpected request failure occurred
  in the independent normal, invalid-input, persistence, mobile, or offline
  scenarios.

## Privacy, outbound requests, and response policies

- A fresh free-use flow contacted only
  `https://invoice-approval-gate.sociobot.in`. Source/runtime inspection and
  traffic showed no analytics, trackers, remote fonts, or third-party scripts.
- Normal gate and document data stayed in IndexedDB. Explicit license checking
  sent only the token to the required Sociobot API.
- A real invalid-license response returned HTTP 200 with `reason: "invalid"`;
  the app removed the token from the visible URL, resolved checking feedback,
  and showed buy/restore controls. Checkout points only to the Sociobot API.
- The API allowed CORS from the product origin and marked the verification
  response `no-store`.
- Live HTML uses `no-cache, must-revalidate`; `sw.js` uses
  `no-cache, no-store, must-revalidate`; hashed assets use
  `public, max-age=31536000, immutable`; and the manifest is served as
  `application/manifest+json` with one-hour revalidation.
- Live responses include CSP with `frame-ancestors 'none'`,
  `X-Frame-Options: DENY`, Permissions-Policy, COOP, `nosniff`, strict referrer
  policy, and two-year HSTS with subdomains and preload.
- SG-V2-02 and SG-V2-03 remain release defects.

## Rate-limit result

The read-only endpoint
`GET https://api.sociobot.in/api/v1/products/invoice-approval-gate/verify`
was tested with invalid QA tokens only.

- Burst 1: 120 concurrent requests completed in 1.041 s; 120 × HTTP 200.
- Burst 2: 400 requests in four immediate 100-request batches completed in
  1.589 s; 400 × HTTP 200.
- Aggregate: 520 × HTTP 200, 0 × HTTP 429.
- Observed threshold: **none through 520 rapid requests**.
- `Retry-After`: **absent**, because no rate-limited response was returned.

No product-owned backend, persistence service, or health/build endpoint exists;
backend concurrency/persistence checks are otherwise not applicable. Sign-in
is not required, so the Entra authority check is not applicable. This is not a
library or CLI, so package/consumer installation is not applicable.

## Performance

Fresh Lighthouse 12.8.2 mobile-default run against the live URL:

| Category/metric | Result |
| --- | ---: |
| Performance | 95 |
| Accessibility | 100 |
| Best Practices | 100 |
| SEO | 100 |
| FCP | 1,428 ms |
| LCP | 1,428 ms |
| TBT | 244 ms |
| CLS | 0 |
| Total transfer | 39,685 B |
| JS transfer | 15,369 B |
| CSS transfer | 5,889 B |
| Image transfer | 14,984 B |
| Font / third-party transfer | 0 B / 0 B |

Performance, LCP, layout shift, and transfer budgets pass. A one-off lab run
does not provide field INP.

## Defect register

### High — SG-V2-01: imported false approval releases an unreviewed handoff

1. Open Settings with an empty profile.
2. Import a version-1, type-correct link backup with `status: "approved"`, no
   `decisionComment`, and a history containing only one valid `created` event.
3. Confirm replacement and open Approval desk.

Observed: import reported “1 gate restored,” IndexedDB retained the inconsistent
record unchanged, the UI rendered “The send handoff is released,” and a live
recipient-specific `mailto:` was available. There was no approval comment,
submission event, or approval event.

Expected: validate semantic workflow invariants before replacing any data. An
approved record must have a meaningful decision comment and a chronologically
consistent created → submitted → approved history. Reject the entire import
and preserve existing data when those invariants fail. Equivalent invariants
are needed for awaiting, returned, and sent states.

This requires crafted or corrupted backup input, so it is below the former
normal-edit critical defect, but it still bypasses the product's core send gate.

### High — SG-V2-02: license verification has no observable rate limit

The required rapid-request test sent 520 invalid-token verification requests
in seconds. Every request returned HTTP 200. No 429 or `Retry-After` appeared,
so no threshold can be recorded. This violates the explicit server-endpoint
acceptance requirement and leaves a public license oracle exposed to automated
abuse. Add an origin/IP-aware limit at the Sociobot API edge, return 429 with a
meaningful `Retry-After`, and rerun this test against a fresh window.

### Medium — SG-V2-03: service worker retains returned license token in cache key

1. Establish an active `/sw.js` controller.
2. Navigate to `/?view=settings&license=qa-secret-cache-fd2e217`.
3. Wait for verification and inspect Cache Storage request keys.

Observed: the address bar correctly changed to `/?view=settings`, but
`send-gate-v2-runtime` retained the full request URL including
`license=qa-secret-cache-fd2e217`. This duplicates a bearer token in a less
obvious store and survives URL/history cleanup.

Expected: navigations containing `license` must not be cached under the
sensitive request URL. Bypass that navigation or cache only a canonical,
query-free response; remove already-cached sensitive keys during activation.

## Release recommendation

Do not release this candidate. Enforce import state/history/comment invariants,
add and verify API rate limiting, and prevent license-bearing navigation URLs
from entering Cache Storage. Add regression coverage for all three and run a
fresh independent verification against the repaired candidate and deployment.
