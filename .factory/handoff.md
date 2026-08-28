# Send Gate repair handoff — work order `invoice-approval-gate-repair-2`

## Result: product-code repairs complete; shared API edge remains a release blocker

This repair is based on verifier report commit `72f03d2881cd5b50097b1ee5067bcf5946ac476c` for candidate `fd2e217789e994e70f44fe8c55561c574d45d63a`.

Two repository-owned findings are repaired and covered by browser regressions:

- **SG-V2-01 (resolved):** import now validates audit ordering, unique audit IDs, timestamps, required decision comments, and the actual draft → awaiting → approved/rejected → sent transition graph before any IndexedDB replacement. A forged `approved` backup with only `created` is rejected, preserves the existing desk, and exposes no email handoff.
- **SG-V2-03 (resolved):** service-worker cache version is `send-gate-v3`. A navigation containing `license` is fetched but never cached, and activation deletes any cached request whose URL contains `license`, including stale cache entries from earlier workers.

**SG-V2-02 remains externally blocked:** this static PWA has no product-owned API, edge rule, proxy, or backend; verification is the required shared Sociobot endpoint. On 2026-08-28, a fresh 520-request invalid-token burst to `https://api.sociobot.in/api/v1/products/invoice-approval-gate/verify` returned **520 × HTTP 200**, with no HTTP 429 or `Retry-After`. The required origin/IP-aware limit must be added to the Sociobot API edge. It cannot be honestly repaired from this repository without changing the artifact/deployment class and bypassing the required billing API. Do not mark the product release-cleared until that shared service is fixed and independently retested.

## Exact regression coverage

`tests/e2e/send-gate.spec.ts` now covers, on Chromium desktop and exact 390×844 mobile:

1. Create a valid local gate, attempt to import the verifier’s crafted approved-but-unreviewed link backup, assert the semantic import error, assert the local gate remains, assert the forged gate is absent, and assert no `mailto:` handoff is available.
2. Establish an active service worker, return with `?license=qa-secret-must-not-cache`, wait for address-bar cleanup, enumerate Cache Storage, and assert no cached request URL contains `license=`.

## Verification evidence

Environment: Node 22 / npm 10 / Playwright 1.58.2.

| Check | Result |
| --- | --- |
| Clean install | `npm ci --include=dev`: 60 packages added |
| Dependency audit | `npm audit --json`: 0 vulnerabilities |
| Strict types | `npm run typecheck`: pass |
| Unit/policy | 4/4 Vitest tests pass |
| Browser integration | `npm test`: 23 Playwright tests pass across desktop and 390 px mobile; 3 intentional duplicate mobile PDF/large-file cases skipped |
| Production build | `npm run build`: pass; root `dist/index.html` produced |
| Production bundle | JS 48.26 kB raw / 15.39 kB gzip; CSS 20.92 kB raw / 5.55 kB gzip; both within static-PWA budgets |
| Local browser smoke | `verify-url.sh`: HTTP 200, title, `lang=en`, one h1, main landmark, image alt text, labeled buttons, and no console/page errors |
| Local Lighthouse | Performance 100, Accessibility 100, Best Practices 100, SEO 100; FCP 1.1 s, LCP 1.2 s, CLS 0, 44 KiB transfer |
| Keyboard/accessibility | Existing desktop/mobile tests cover skip-link focus, Tab/Enter/Space workflow, visible focus, axe scans, target geometry, reduced motion, and direct legal routes |
| PWA/offline/update | Existing desktop/mobile tests verify controlled-worker offline reload and offline draft-to-awaiting mutation. The v3 worker preserves the existing update/`SKIP_WAITING` flow while invalidating v2 caches. |
| Privacy/response policy | Static policy test passes for CSP, anti-framing, HSTS, Permissions-Policy, COOP, manifest MIME, immutable assets, and no-store service worker. Normal local use has no third-party assets; explicit billing verification is the only allowed cross-origin request. |
| Package/consumer | Not applicable: this is a private static PWA, not a package or CLI. |

## Run locally

```sh
npm ci --include=dev
npm run typecheck
npm audit --json
npm test
npm run build
npm run preview
```

For the local browser smoke and Lighthouse checks used here:

```sh
/opt/fleet/lib/verify-url.sh http://127.0.0.1:4173 /tmp/send-gate-verify
CHROME_PATH=/opt/pw-browsers/chromium-1208/chrome-linux64/chrome \
  npx --yes lighthouse@12.8.2 http://127.0.0.1:4173 \
  --only-categories=performance,accessibility,best-practices,seo \
  --chrome-flags='--headless=new --no-sandbox --disable-dev-shm-usage --disable-gpu'
```

## Deployment and follow-up

The work order retains the original static-PWA deployment class: deploy the `dist/` directory using the configured static deployment. After the deployment edge has switched, verify the live URL, its response headers, worker `send-gate-v3` cache behavior, and candidate asset identity.

Before release, the Sociobot API owner must implement and verify a per-origin/IP verification limit that returns HTTP 429 and a meaningful `Retry-After`; then repeat the invalid-token burst against a fresh limit window and record the threshold. No product data, document bytes, or gate details should be sent to that API check.
