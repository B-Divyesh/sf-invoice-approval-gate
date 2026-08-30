# Independent product verification — FAIL

**Candidate:** `9ecdce585bf7b86e2b2058affa3482dd0f95c03d`  
**Live URL:** <https://invoice-approval-gate.sociobot.in>  
**Verified:** 2026-08-30 UTC  
**Work order:** `invoice-approval-gate-verify-5`

## Verdict

**FAIL.** The live static deployment exactly matches the candidate and the
first-read/demo requirements, core local workflow, accessibility, offline
shell, privacy behavior, headers, and bundle budgets are in good shape.
It is not releasable under the supplied contract because a claimed encryption
test fails in the normal complete test run, and the advertised one-time Pro
checkout is unavailable in production.

## Mandatory first gates

### Claims registry and sandbox

`.factory/claims.json` exists and contains 15 entries. From a clean `npm ci`
install, I ran every command recorded there against the local `/demo` entry
point, one claim at a time. All passed in Chromium and the 390 px project
(two cases per command):

- `checkout-fail-soft`, `demo-sandbox`, `approval-handoff`,
  `sealed-handoff`, `local-encryption`, `pdf-size-limit`,
  `private-free-workflow`, `offline-reload`, `portable-export`,
  `portable-import`, `deletion`, `free-active-limit`, `license-restore`,
  `license-revocation`, and `pwa-shell`.

However, the clean complete command `npm test` failed its included
`@claim:local-encryption` Chromium case while 58 tests passed and 3 were
skipped. The failing assertion queried IndexedDB immediately after the UI had
reported “Draft gate created and encrypted on this device”; the expected record
was not yet returned and the test threw `Cannot read properties of undefined
(reading 'document')` at `tests/e2e/claims.spec.ts:91`. Rerunning that one
claim immediately afterward passed 2/2. This is a flaky claim/persistence
completion boundary, not a passing quality gate. The contract says any failing
claim test is release-blocking.

### Cold first-read — PASS

Fresh desktop and 390×844 browser contexts loaded the live root with empty
storage. The first screen says what it does (“Approve quotes and invoices
before they go out”), who it is for (“small agencies and trade teams”), and
what to do first. **Try it with sample data** is a visible one-click action
with the plain outcome “Loads three sample gates. Nothing is saved.” `/demo`
shows three realistic gates and the persistent, isolated demo banner with
Reset demo and Start for real controls.

## Candidate/deployment identity

`HEAD`, `origin/main`, and the requested candidate resolve to
`9ecdce585bf7b86e2b2058affa3482dd0f95c03d`. A fresh production build created
`dist/` successfully. The live root referenced the same hashed files:

| Artifact | SHA-256, candidate and live |
| --- | --- |
| `index.html` | `d68b20fa802848c728ee6a1f1d003d75b742dde719fd5114933e549024435a39` |
| `assets/index-D70eGyPE.js` | `67bac5dd7c495f50f748ce28f134e46cec47a4a5757050350f7c4da1af7e33cb` |
| `assets/index-DOWL4q5D.css` | `839ea0271e8e58b881aa121b981f3bf72b8fd99561ab514c848c3d2a1374540e` |
| `sw.js` | `1bd140a7d83a2d8a94782fb3915639327b5a24e93682e6ee2951191039b2be7e` |

All 22 deployed public build files matched byte-for-byte. The one build file
not publicly served, `staticwebapp.config.json`, correctly returned 404.

## Local quality gates

| Check | Result | Evidence |
| --- | --- | --- |
| Clean install | PASS | `npm ci`; 60 packages, audit reports 0 vulnerabilities |
| Types and lint | PASS | `npm run typecheck`, `npm run lint` |
| Unit tests | PASS | `npm run test:unit`: 5/5 |
| All registry commands | PASS individually | 15 claim commands, 2/2 each |
| Complete supplied suite | **FAIL** | `npm test`: 1 failed (`@claim:local-encryption`), 58 passed, 3 skipped |
| Production build | PASS | `npm run build`; `dist/index.html` produced |

Build payloads are within the static limits: JavaScript is 55,125 B raw /
17,263 B gzip and CSS is 21,766 B raw / 5,736 B gzip. The largest hero image
is 51,364 B and the mobile image is 14,878 B. No runtime fonts or third-party
scripts are loaded.

## Independent live checks

- Free demo review traffic used only the product origin; no document, client,
  amount, or review data left the browser. Clicking Buy Pro was the sole
  observed flow that contacted `api.sociobot.in`.
- Axe 4.10.2 found zero violations, including zero serious/critical findings,
  on root, demo, Settings, Privacy, and Terms (desktop plus 390 px legal
  routes). Those pages produced no browser console or page errors.
- At 390 px, `scrollWidth` equaled `innerWidth` (390). The initial keyboard
  target is the skip link; `:focus-visible` has the designed 3 px coral ring.
  Reduced-motion transitions measured 0.00001 s. Visual inspection of desktop
  and 390 px screenshots found a clear, intact layout; the mobile view
  deliberately drops the decorative hero image rather than squeezing it.
- An installed live service worker controlled `/demo`. After setting the
  context offline and reloading, the demo desk and its three samples loaded;
  an awaiting review could be approved, revealing its email draft. The app
  showed its Offline status and no errors.
- Root, demo, Privacy, Terms, manifest, worker, robots, sitemap, 404, and
  hashed assets returned the expected statuses. HTML is revalidated; the
  worker is `no-cache, no-store`; hashed JS/CSS use one-year immutable caching.
  The live CSP restricts scripts/styles to self and has `frame-ancestors
  'none'`, with HSTS, nosniff, DENY framing, strict referrer policy,
  Permissions-Policy, and same-origin opener policy.
- The PWA manifest is served as `application/manifest+json`; the current
  page has a title, language, a single h1, main landmark, alt text, legal
  routes, and a real 404.

## Billing and request allowance

The documented product verification endpoint was exercised with 36 distinct
invalid tokens from one client. 31 requests returned 200 and the next 5
returned **429**, each carrying `Retry-After: 1`. Observed allowance: **31
requests per client burst** before limiting. The product has no sign-in or
product-owned backend; Entra, backend health/concurrency, and database checks
do not apply.

The live checkout path is still unavailable:

```text
GET https://api.sociobot.in/api/v1/products/invoice-approval-gate/checkout
HTTP/2 404
{"error":"enabled factory product","status":404}
```

The product handles this safely: pressing **Buy Pro securely** stays on the
free desk and displays “Checkout is temporarily unavailable. Your free desk is
unchanged…”. That is good failure handling, but it does not make the advertised
`$29 once` unlimited-gates offer purchasable.

## Defects

### Blocker — SG-V5-01: AES-GCM claim is flaky in the required full run

`npm test` is not green. Its `@claim:local-encryption` test can observe the
newly rendered, encrypted draft before a separate IndexedDB read sees the
record. A later isolated rerun passing does not satisfy the quality gate or
the claim contract. Make the persistence operation resolve only after its
transaction commits (and/or make the observable claim test wait for the
committed record), then prove `npm test` repeatedly from a clean install.

### High — SG-V5-02: Pro checkout is advertised but returns 404

The live product offers `$29 once` Pro but the only allowed hosted checkout
endpoint returns 404. Factory billing registration/deployment must make the
checkout redirect available, followed by a live purchase-return and license
verification check. The static UI must retain its current fail-soft behavior.

## Scope notes

No product source was modified. The attached PWA, accessibility, claims,
plain-language, privacy, and paid-unlock requirements were used as the
acceptance criteria. This is a PWA, not a library, CLI, or backend service, so
consumer pack/install and server persistence/concurrency checks are not
applicable.
