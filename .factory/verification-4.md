# Independent product verification — FAIL

**Candidate:** `517b06cc73e52198fa3fa3d9042298745f6959aceba`

**Live URL:** <https://invoice-approval-gate.sociobot.in>

**Verified:** 2026-08-30 UTC

**Work order:** `invoice-approval-gate-verify-4`

## Verdict

**FAIL.** The live deployment matches the candidate byte-for-byte, and the
core approval workflow, local encryption, offline PWA, accessibility scans,
privacy behavior, rate limiting, build, tests, and performance checks pass.
The candidate is nevertheless not releasable under the supplied contract:

1. `.factory/claims.json` is missing. There were therefore no claim tests to
   run through the required demo entry point. This is an explicit release
   blocker regardless of other test results.
2. The cold first screen has no one-click **Try it with sample data** action.
   `/demo` is merely the ordinary empty app, with no sample, banner, reset,
   separate storage namespace, or start-for-real control. The headline is a
   metaphor and the screen does not name the intended small agency/trade team.
3. The advertised **Buy Pro securely** link is broken in production. Its GET
   endpoint returns HTTP 404 instead of hosted checkout.

No product code was modified during this verification.

## Mandatory claims and first-read gates

### Claims gate — FAIL

The first repository command checked `.factory/claims.json`; it did not exist.
This prevented execution of the required per-claim commands and is
release-blocking under the claims contract.

The site and README nevertheless make many claim-like statements, including:

- “works offline” and “offline creation/review”;
- “PDFs encrypted locally” and AES-GCM-before-storage;
- “No account, analytics, or remote document upload”;
- “Normal workflow data never leaves the browser”;
- five free active gates and unlimited Pro active gates;
- portable export/import and sealed sent state.

None can be mapped to a required `@claim:<id>` test because the claim registry
is absent. The supplied browser suite happens to cover several behaviors, but
that does not satisfy the mandatory registry/demo contract.

### Cold first-read — FAIL

Fresh desktop and 390×844 contexts opened the live root with empty storage.
The first screen says:

- headline: “Nothing leaves without a second look.”;
- explanation: a quote or invoice is held until a reviewer approves it;
- only action: **Create your first gate**.

The explanation makes the function understandable, but the headline is not
the job in the user's words and the screen does not say it is for a small
agency or trade team. More importantly, there is no one-click sample-data
action. Opening `/demo` returns HTTP 200 but renders the same empty real app:
zero sample records, zero demo banner, and zero reset/start-for-real controls.
`.factory/demo.md` is also absent. The app uses the normal
`send-gate-local` IndexedDB namespace on this route.

## Candidate and deployment identity

- Local `HEAD`, `origin/main`, and the requested candidate all resolved to
  `517b06cc73e52198fa3fa3d9042298745f6959aceba`.
- A fresh production build generated the same live assets,
  `assets/index-DuZYIqB5.js` and `assets/index-B1k-Z448.css`.
- All 17 checked public artifacts matched live bytes exactly: HTML, JS, CSS,
  asset manifest, service worker, web manifest, offline page, privacy and
  terms entry points, robots, sitemap, SVG/PNG icons, and both artwork sizes.

Representative SHA-256 values:

| Artifact | Candidate/live SHA-256 |
| --- | --- |
| `index.html` | `b27e2ba75834f1293f542544afba78924197d9ea14b57e9731a2310e266a8bce` |
| JavaScript | `1c0da7a843ee59376c83f5f52be4eed42c38dd66ba67f9ea5ce466073338f082` |
| CSS | `19c9c664e4df480765c24cd17d89fc01bc167b0c1be32251d428c445e3ea716d` |
| Service worker | `43f06bf36d90541d91d50cd59cb1e9f74fb9b1808165b35c60cd0ad80588e6f9` |
| Manifest | `c8cf3996fcec119bdef15699798f38c6ec4b161b1b09381b093dc2e3aa65898d` |

The prior deployment-only concern does not reproduce for the static app. The
broken checkout is a separate live product-registration/integration defect.

## Clean local quality gates

Environment: Node `v22.23.2`, npm `10.9.8`, Playwright `1.58.2`.

| Check | Result | Evidence |
| --- | --- | --- |
| Clean install | PASS | `npm ci --include=dev`; 60 packages installed |
| Dependency audit | PASS | 0 vulnerabilities at every severity |
| Strict types | PASS | `npm run typecheck`; no diagnostics |
| Unit tests | PASS | 4/4 Vitest tests |
| Full supplied tests | PASS | 25 Playwright tests passed across desktop and exact 390×844 mobile; 3 documented duplicate cases skipped |
| Exact production build | PASS | `npm run build`; root `dist/` produced |
| Lint | N/A | no lint script or linter is configured |
| Claims tests | **FAIL** | `.factory/claims.json` is missing |

Production budgets pass:

- JavaScript: 48,262 B raw / 15.30 kB gzip (budget 200 kB)
- CSS: 20,970 B raw / 5.57 kB gzip (budget 50 kB)
- mobile artwork: 14,878 B; desktop artwork: 51,364 B
- runtime fonts: 0 B; runtime dependencies: 0

## Independent end-to-end behavior

### Passed

- A live link gate rejected whitespace identity values, an invalid URL/email,
  and a negative amount, focused the first bad field, and recovered after all
  fields were corrected.
- The `$0.00` boundary was accepted. The gate persisted across reload, moved
  through submit and approval, and released a recipient-specific `mailto:`.
- An empty approval comment was rejected and focused. A real comment released
  the handoff.
- Editing the approved recipient and amount to `$0.01` removed the handoff and
  required a fresh submission and approval. IndexedDB recorded
  `created → submitted → approved → edited → submitted → approved → sent`.
- Sent state had no second-send action and offered a new revision gate.
- An exact 15 MiB PDF was accepted: 15,728,640 plaintext bytes became
  15,728,656 AES-GCM ciphertext bytes. The local key was stored separately.
- A portable export contained the original 15,728,640 PDF bytes and the
  explicit readable-backup warning. Deletion named the record, respected
  cancel, and removed it after confirmation.
- Supplied cases also passed for 15 MiB + 1 B rejection, fake-PDF rejection,
  link recovery, atomic malformed-import rejection, workflow-consistent
  imports, approval withdrawal, and license-cache protection.

No page errors or console errors occurred in the independent normal, invalid,
PDF, settings, legal, offline, update, and license-return runs.

## Accessibility, responsive behavior, and motion

- Independent axe 4.10.2 scans found zero violations (therefore zero
  serious/critical findings) in empty, form, draft, approved, sent, Settings,
  Privacy, Terms, desktop, and 390 px states.
- Keyboard-only activation covered the source radio with ArrowRight, form
  entry, create/submit with Enter, approval with Space, and the released
  handoff. The skip link is first and moves focus to `main`; no trap appeared.
- Focus uses a visible 3 px coral outline.
- At 390 px, empty and form pages had `scrollWidth == innerWidth == 390`; all
  visible interactive targets measured at least 44×44 px.
- At simulated 200% root text size, the approved mobile screen retained the
  handoff and had no document-level horizontal overflow.
- Reduced-motion emulation capped measured transitions/animations at 0.01 ms
  and changed document scrolling to `auto`.
- The product-specific paper checkpoint artwork and intrinsic image ratio are
  intact. The horizontally scrollable three-step strip does truncate labels
  in the initial desktop/mobile view; see SG-V4-07.

One navigation accessibility defect remains: choosing Settings or using Back
leaves focus on `<body>`, not the new `<h1>`, and no populated route-change live
region announces the new page. See SG-V4-05.

## PWA, offline, and updates

- Chromium accepted the manifest. It includes standalone display, versioned
  start URL, scope, 192/512/maskable icons, and matching theme colors.
- The deployed `/sw.js` controlled the app with `send-gate-v3-shell` and
  `send-gate-v3-runtime` caches.
- A newly created gate survived a 390 px offline reload and advanced from
  draft to awaiting review while still offline.
- Registering a changed worker activated it and changed the controller from
  `/sw.js` to `/sw.js?qa-update=…` without errors.
- A returned license URL was never stored in Cache Storage.

These passing behaviors are unregistered claims because `claims.json` and the
demo sandbox are missing.

## Privacy, requests, headers, and paid integration

- Cold load and complete free workflows contacted only the product origin.
  No analytics, trackers, remote fonts, third-party scripts, or document
  uploads were observed.
- Link/PDF gate data stayed in IndexedDB. The PDF run made four same-origin
  requests and no cross-origin request.
- An invalid returned license was stripped from the address bar and was not
  cached. Only the supplied token was sent to the required Sociobot product
  verification endpoint; no recipient, amount, source, comment, or PDF data
  accompanied it.
- The verification response was HTTP 200, `Cache-Control: no-store`, with
  CORS restricted to the live product origin.
- Live HTML/legal responses use `no-cache, must-revalidate`; `/sw.js` uses
  `no-cache, no-store, must-revalidate`; hashed assets use one-year immutable
  caching; the manifest uses its correct MIME type and one-hour revalidation.
- Responses include CSP with `frame-ancestors 'none'`, two-year HSTS with
  subdomains/preload, `DENY` framing, `nosniff`, strict referrer policy,
  Permissions-Policy, and same-origin opener policy.

### Required API allowance — PASS

A fresh burst of 50 unique invalid-license requests completed in 563 ms:

- 30 returned HTTP 200;
- 20 returned HTTP 429;
- all limited responses included `Retry-After: 4`.

Observed burst allowance: **30 requests per client before limiting**.

### Paid checkout — FAIL

The visible **Buy Pro securely** link points to the documented production URL,
but an actual GET (without following redirects) returned:

```text
HTTP/2 404
{"error":"enabled factory product","status":404}
```

The advertised `$29 once` purchase cannot be completed. Verification rate
limiting does not mitigate this separate checkout failure.

The product has no product-owned backend, server persistence, or sign-in.
Backend concurrency/health and Entra authority checks are not applicable. It
is not a library or CLI, so consumer pack/install checks are not applicable.

## Performance

Fresh Lighthouse 13.4.1 mobile-default run against the live deployment:

| Category/metric | Result |
| --- | ---: |
| Performance | 100 |
| Accessibility | 100 |
| Best Practices | 100 |
| SEO | 100 |
| FCP | 1,054 ms |
| LCP | 1,054 ms |
| TBT | 63 ms |
| CLS | 0 |
| Total transfer | 37,960 B |

The static bundle, LCP, blocking-time proxy, layout-shift, and transfer budgets
pass. A one-off lab run cannot provide field INP.

## Defect register

### Blocker — SG-V4-01: required claims registry and claim tests are absent

`.factory/claims.json` does not exist. Multiple public claims therefore have
no registry entry, exact `@claim:<id>` test, demo-only sandbox execution, or
evidence path. The acceptance contract explicitly says a missing file is
release-blocking.

### Blocker — SG-V4-02: first screen and demo sandbox fail the mandatory gate

There is no **Try it with sample data** action. `/demo` is the ordinary empty
app and normal data namespace, with no sample, banner, Reset demo, or Start for
real. The metaphorical headline and explanation also omit the intended team.
`.factory/demo.md` and `.factory/copy-audit.md` are absent.

### High — SG-V4-03: advertised one-time purchase returns HTTP 404

Open Settings and choose **Buy Pro securely**. The production checkout GET for
`invoice-approval-gate` returns JSON 404 instead of redirecting to hosted
checkout. Expected: an enabled factory product and a working hosted checkout.

### Medium — SG-V4-04: unknown routes are a soft-404 home screen

`/does-not-exist-qa` returns HTTP 200 and renders the landing page. There is no
`404.html` and no Static Web Apps 404 response override. Expected: a designed
404 route with a way home and an actual 404 response.

### Medium — SG-V4-05: SPA route changes lose focus and are not announced

Choose Settings with the keyboard or use browser Back. The replaced focused
link disappears and focus falls to `<body>`; the new `<h1>` is not focused and
the only live region is empty. Expected: focus the new `<h1>` and announce the
route title while preserving Back/Forward behavior.

### Medium — SG-V4-06: required metadata and handoff identity are incomplete

The document has a good title, language, and description, but lacks canonical,
Open Graph, Twitter-card, 1200×630 social image, and apple-touch metadata. The
footer also omits the required “Built by Param Factory” and version/build ID.

### Low — SG-V4-07: the three-step preview truncates its useful labels

At 1440 px, “Approve or return” and “Open the email draft” render as ellipses.
At 390 px, the third step begins off-screen in a horizontal scroller without a
scroll cue. The screen remains operable, but the concise onboarding preview is
less clear than its source copy.

## Release recommendation

Do not release this candidate as PASS. Add an isolated, one-click sample demo;
create and run the mandatory claims registry/tests through it; rewrite the
first screen in plain words for the target team; enable the production paid
product; and repair routing/focus/metadata. Preserve the passing workflow,
encryption, privacy, accessibility, offline, response-policy, rate-limit, and
performance behavior, then run independent verification again.
