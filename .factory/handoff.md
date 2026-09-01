# Send Gate repair handoff

**Work order:** `invoice-approval-gate-repair-6`
**Base verified:** `a20dd743b2590c485f46d974fe51b5a7a32a63fe`
**Repair date:** 2026-09-01 UTC
**Artifact:** static local-first PWA; build output is `dist/`.

## What changed

- Fixed **SG-V6-01**. Clicking the first-screen **Try it with sample data**
  action now changes the active application namespace before rendering: it
  enters `demo:`, seeds the three shipped gates when needed, and immediately
  renders the demo desk. It is an in-place History API transition, not a
  document refresh. Browser back/forward now changes the namespace too when it
  crosses between the real desk and `/demo`.
- Reworked the registered `demo-sandbox` claim to begin at `/`, click the
  visible landing action, assert the demo banner and Harbour House sample, keep
  a same-document sentinel, and confirm the real desk still has zero gates.
  The claim runs in both configured desktop and 390 px mobile projects.
- Bumped the PWA shell/cache and display identity to repair 6 (`v1.0.3`,
  `send-gate-v6`, manifest `v=6`) so deployed clients receive the repaired
  shell rather than an old cached one.

## Operator-gated checkout finding

**SG-V6-02** is not a product-code defect. The shared hosted checkout returned
the documented 404 in the verifier report. Per this work order, no shared
billing service was contacted or changed. The free five-gate desk remains
usable, and the existing deterministic claim covers both a checkout 404 and
500: it stays on the desk and shows the honest recovery message. A factory
operator must enable/register the checkout product before the paid offer can be
advertised as purchasable.

## Verification

Executed locally after the repair:

```sh
npm ci --include=dev
npm run typecheck
npm run lint
npm run test:claims -- --grep @claim:demo-sandbox
npm test
npm run build
VERIFY_NODE_MODULES=/work/repo/node_modules /opt/fleet/lib/verify-url.sh http://127.0.0.1:4173/ <temporary-evidence-dir>
```

Results:

- Clean install: 60 packages; npm reported 0 vulnerabilities.
- Typecheck and lint: passed (`tsc --noEmit`).
- Exact one-click regression: passed **2/2** (Chromium desktop and 390 px
  mobile). It verifies the URL, demo banner, three sample desk, `demo:`
  storage, an unchanged real gate count, reset, and Start for real.
- Full suite: passed. Vitest: **6/6**. Playwright: **62 configured** across
  desktop and mobile; `test-results/.last-run.json` records `"status":"passed"`.
  It includes material-edit withdrawal, malformed-backup atomicity, trim and
  approval-comment validation, PDF recovery/type validation, licensing,
  keyboard focus, 390 px target geometry, and direct route coverage.
- Accessibility: the Playwright `@axe-core/playwright` checks in the suite
  reported zero violations for empty/populated desks and legal routes. The
  local URL verifier also passed: title present, `lang=en`, one `h1`, `main`,
  zero missing image alternatives, zero unlabeled buttons, and no console or
  page errors.
- Privacy: the normal demo request claim permits only the local origin. The
  static deployment test verifies the restrictive CSP, anti-framing,
  Permissions-Policy, manifest MIME type, HSTS declaration, and immutable
  hashed-asset cache policy.
- PWA: offline reload and service-worker-control claims pass in isolated
  contexts. The new versioned cache is `send-gate-v6`; the worker retains
  `SKIP_WAITING`/`clients.claim` update behavior.
- Production build: `dist/index.html` exists. Main JavaScript is **55,824 B
  raw / 17,321 B gzip**; CSS is **21,766 B raw / 5,753 B gzip**; the mobile
  hero is **14,878 B**. These are within the static-PWA budgets.
- No Lighthouse executable is installed in this isolated repair image, so no
  new Lighthouse score is claimed. The local verifier measured a 557 ms
  unthrottled desktop load; the bundle and accessibility checks above were run
  on this repaired build.

## Deployment

Build exactly with `npm run build` and deploy the contents of `dist/` using the
repository's static deployment path. `dist/staticwebapp.config.json` carries
the response-policy and cache configuration. This repository has no direct
cloud deployment command or credentials; the repair is pushed to `main` for
the factory static deployment job.

## Known gap / next step

The only remaining release dependency is the factory-side checkout product
registration described above. Until that operator action succeeds, keep the
free desk and its recovery message; do not bypass Sociobot billing or embed a
separate payment provider.
