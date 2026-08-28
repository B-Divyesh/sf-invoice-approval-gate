# Send Gate repair handoff

## Result: repaired, deployed, and verified

This repair addresses every finding in independent verifier report commit
`566160a626d2c8513d0ffcdba48ec791c888a885` for candidate
`035743eeec225fc1f9c0e19895ef359fcd9a8633`. The researched brief, local-first
PWA artifact, static deployment class, visual thesis, five-gate free tier, and
all previously passing workflows are preserved.

## Repairs

- **SG-V01:** A material edit to an approved recipient, amount, source,
  document, title, currency, kind, or reviewer now withdraws the prior
  approval, clears its decision comment, returns the gate to draft, records
  the reason in history, and removes every release control until reapproval.
- **SG-V02:** Version-1 imports validate the bundle, all gate field types and
  bounds, ISO dates, every audit event, source consistency, duplicate IDs,
  PDF metadata, strict base64 length/encoding, byte count, and PDF signature
  before encryption or the atomic IndexedDB replacement transaction begins.
  Any failure keeps existing gates unchanged.
- **SG-V03/SG-V04:** Post-trim empty gate, client, and reviewer names focus and
  announce the failing field. Both approve and return decisions require a
  non-whitespace comment.
- **SG-V05:** The paper-checkpoint artwork now uses a block picture and
  intrinsic `height:auto` sizing, preserving its 3:2 composition at desktop
  and 390 px instead of stretching/cropping it.
- **SG-V06/SG-V07:** A selected oversized PDF is ignored after the user switches
  to link mode, so the suggested recovery works. PDF intake now checks size,
  MIME/extension identity, and an actual `%PDF-` header before encryption;
  disguised text files are rejected with a recoverable error.
- **SG-V08:** Skip-link activation programmatically focuses the current main
  landmark. Brand and legal links meet the 44 px mobile target baseline.
- **SG-V09:** `staticwebapp.config.json` now ships CSP/frame protection,
  Permissions-Policy, COOP, two-year HSTS, correct manifest MIME, no-store
  service-worker updates, and one-year immutable asset caching.
- **SG-V10:** Invalid returned licenses leave the temporary Checking state,
  explain the inactive token, and expose both buy and restore controls.
- The manifest and service-worker cache generation are bumped to v2 so
  installed clients receive this repair through the existing update toast.

## Exact regression coverage

`tests/e2e/send-gate.spec.ts` reproduces the verifier paths for approval edit
invalidation, invalid-audit import atomicity/no page error, valid portable PDF
restore/re-encryption, all three whitespace identities, required approval and
return comments, oversized-file link recovery, disguised PDFs, intrinsic hero
geometry, skip-link focus, 44 px targets, and invalid returned-license
reconciliation. The security/cache configuration has an executable policy
assertion in `tests/utils.test.ts`.

## Local verification — 2026-08-28 UTC

```sh
npm ci --include=dev
npm run typecheck
npm test
npm run build
npm audit --json
/opt/fleet/lib/verify-url.sh http://127.0.0.1:4173 <evidence-dir>
```

- Clean install: **PASS** — 60 packages added, zero audit vulnerabilities.
- Strict TypeScript: **PASS**.
- Unit/policy: **PASS** — 4/4 Vitest assertions.
- Browser integration: **PASS** — 19 Playwright cases across desktop Chromium
  and exact 390×844 mobile; 3 intentional duplicate mobile large-file/PDF
  crypto cases skipped. The offline reload and offline mutation case passed.
- Accessibility: **PASS** — axe found zero violations on exercised empty,
  populated, privacy, and terms screens; keyboard decision flow, skip link,
  focus, reduced motion, semantic landmarks, and 44 px mobile targets passed.
- Browser health/privacy: **PASS** — factory verifier found one h1/main,
  title/lang/alt coverage, and zero console or page errors; a fresh free-use
  session made zero cross-origin requests and had no horizontal overflow.
- PWA: **PASS** — active controller; `send-gate-v2-shell` and
  `send-gate-v2-runtime` caches; explicit offline workflow passed; registering
  a changed worker URL showed “A fresh version is ready,” and Update now moved
  control from `/sw.js` to `/sw.js?qa-update=2`.
- Production build: **PASS** — `dist/index.html` at root; initial JS 46,868 B
  raw / 15.01 kB gzip, CSS 20,917 B raw / 5.55 kB gzip, mobile artwork
  14,878 B. All performance budgets pass.
- Local mobile Lighthouse 12.8.2: **100 performance / 100 accessibility / 100
  best practices / 100 SEO**; FCP 1.1 s, LCP 1.2 s, TBT 0 ms, CLS 0.
- Package/consumer check: not applicable; this is a private static PWA, not a
  published package. A standalone linter is not configured; strict `tsc`
  typechecking and production compilation pass with no diagnostics.

## Deployment and live verification

- Repair commits `c79adad` and `341ed11` were pushed to `origin/main` and the
  production build was deployed with the work order's static deployer to the
  existing `sf-invoice-approval-gate` Azure Static Web App in `centralus`.
  Final deployment ID: `60e23307-4faa-42cb-aacc-bc17bc8f71e0`.
- <https://invoice-approval-gate.sociobot.in> returned HTTPS 200. The factory
  URL verifier found the expected title/lang/h1/main/alt/button semantics and
  zero console or page errors on desktop and 390 px captures.
- Local/live SHA-256 matched for the deployed entry point and runtime:
  `index.html` `dc07550444998921c936af2387bef80e27f38c8b582dcaff0b695c37220a588a`,
  JS `cc86f4106dc14968c7041f3454d35e921dc28ad742d1e6e5d2574c0e203e8f64`,
  CSS `d2c5dc5c1787262c05e751cbc91dab9dbaf1996b93b6cc5aacd2a2387de90ec5`,
  service worker `3b22a1b08337b50150ef4f4c6a77a67dd2acfd2f59cb27312677c129c22972f5`,
  and manifest `c8cf3996fcec119bdef15699798f38c6ec4b161b1b09381b093dc2e3aa65898d`.
- Live response policy: HTML `no-cache, must-revalidate`; service worker
  `no-cache, no-store, must-revalidate`; hashed assets
  `public, max-age=31536000, immutable`; manifest
  `application/manifest+json` with one-hour revalidation. CSP includes
  `frame-ancestors 'none'`; `X-Frame-Options: DENY`, Permissions-Policy,
  `Cross-Origin-Opener-Policy: same-origin`, `nosniff`, strict referrer policy,
  and `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
  are all present.
- Live 390 px browser check: active v2 worker and caches, offline reload,
  visible offline state, no horizontal overflow, one h1/main, zero axe
  violations, zero cross-origin free-use requests, and zero console/page
  errors.
- Live invalid-license check used the real Sociobot response (HTTP 200,
  `{valid:false, reason:"invalid"}`): the token was stripped from the URL,
  checking feedback resolved, and Buy Pro plus restore controls were visible.
- Live mobile Lighthouse 12.8.2: **100 performance / 100 accessibility / 100
  best practices / 100 SEO**; FCP 1.0 s, LCP 1.1 s, TBT 80 ms, CLS 0.

## Known product boundaries

- Approval remains a local handoff record, not authenticated identity, a legal
  signature, accounting compliance, or multi-device collaboration.
- Browsers cannot attach a PDF through `mailto:`. The user downloads the
  approved PDF and remains in control of sending.
- Clearing site data removes gates and the local encryption key. Portable
  exports remain the explicit recovery path and contain readable data.
- The public $29 one-time billing product must remain registered in the
  Sociobot engine; no payment-provider code or secret is embedded here.
