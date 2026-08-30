# Send Gate repair handoff — work order `invoice-approval-gate-repair-3`

## Result: PASS

The release blocker in independent verification report
`.factory/verification-3.md` for candidate
`aaf6065aa9a7dc30fd461a5b130301333264ce21` is repaired and deployed.

Repair commits:

- `82e3934 fix: meet contrast requirements in settings and sent state`
- `74e23af fix: preserve contrast during sheet transition`

The deployed product is <https://invoice-approval-gate.sociobot.in>. Static
deployment `c1f172f6-e68e-4b52-a7fc-be52f0397ec3` completed successfully on
2026-08-30 UTC.

## What changed

**SG-V3-01 — serious axe contrast failures in reachable states**

- The Settings `One-time` ribbon now uses `coral-deep` (`#A93625`) behind white
  text: **6.48:1** contrast.
- The sent-state explanation now uses `forest-deep` (`#0D352A`) on sage:
  **8.68:1** contrast.
- The document-sheet entrance no longer fades the entire sheet to partial
  opacity. That temporary compositing could make otherwise compliant sent-state
  copy fail axe while the sheet settled. The 6 px transform movement remains,
  with the existing reduced-motion override.
- The visual-system record documents both safe pairings in
  `.factory/design.md`.

`tests/e2e/send-gate.spec.ts` now reaches Settings and a real completed sent
handoff, asserts the computed color pairings, and runs axe's `color-contrast`
rule in both states. The regression was repeated three times in both Playwright
projects (6/6 passes) to cover the former transition timing failure.

## Verification evidence

Commands run from a clean dependency install:

```sh
npm ci --include=dev
npm run typecheck
npm audit --json
npm test
npm run build
npx playwright test --grep 'settings Pro ribbon' --repeat-each=3
```

Results:

- `npm ci --include=dev`: 60 packages installed; audit reported 0
  vulnerabilities.
- `npm run typecheck`: passed with no diagnostics. There is no configured lint
  command/linter in this static TypeScript project.
- `npm test`: 4/4 Vitest tests and 25 Playwright tests passed across desktop
  Chromium and the exact 390×844 mobile project; 3 documented duplicate mobile
  PDF cases were skipped.
- `npm run build`: passed; `dist/index.html` exists. Initial JS is 48,262 B
  raw / 15.39 kB gzip and CSS is 20,970 B raw / 5.55 kB gzip.
- Local `verify-url.sh` reported title, `lang=en`, one h1, main landmark,
  complete image alt text, labeled buttons, and zero page/console errors.
- Live `verify-url.sh` reported the same checks with HTTP 200 and zero
  page/console errors. Live desktop and 390×844 browser checks reported zero
  Settings/sent axe contrast violations, no horizontal overflow, and no page
  errors.
- A live normal create-draft flow made four same-origin requests and **zero**
  cross-origin requests.
- The local PWA browser suite covers first-visit install, saved-gate offline
  reload and offline submit. On the deployed artifact, an explicit update
  registration changed the service-worker controller from `/sw.js` to a fresh
  `/sw.js?qa-update=…` worker without errors.
- Live Lighthouse 13.4.1 mobile: Performance 100, Accessibility 100, Best
  Practices 100, SEO 100; FCP 1.0 s, LCP 1.0 s, TBT 0 ms, CLS 0, transfer
  37 KiB.

## Deployment and policy checks

The live HTML references the exact new files
`assets/index-DuZYIqB5.js` and `assets/index-B1k-Z448.css`. SHA-256 comparison
matched the deployed and local `index.html`, JS, CSS, `sw.js`, manifest,
offline page, and both legal routes.

Live responses provide the intended CSP with `frame-ancestors 'none'`, HSTS
preload, `X-Frame-Options: DENY`, `nosniff`, strict referrer policy,
Permissions-Policy, and same-origin opener policy. Hashed assets are immutable
for one year; the manifest is `application/manifest+json` with one-hour
revalidation; `sw.js` is `no-cache, no-store, must-revalidate`.

## Known gaps and next steps

No release-blocking gaps remain from the verifier report. The product retains
its explicit non-goals: it is not accounting software, payment processing,
e-signature, or identity verification. Future product changes should keep the
state-specific axe regression and verify the service-worker update path before
release.
