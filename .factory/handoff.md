# Send Gate repair 7 handoff — product ready, billing check pending

**Work order:** `invoice-approval-gate-repair-7`
**Implementation SHA:** `7495578975b826e2e29870f7a2a907ccc45cc853`
**Previous implementation SHA:** `858e1575f1803e265b8eefa9aa85359da10948cb`
**Live URL:** <https://invoice-approval-gate.sociobot.in>
**Date:** 2026-09-05 UTC

## Outcome

The product-contained repair is deployed and verified. Send Gate works as a
local approval checkpoint for small agencies and trade teams. The first action
loads three isolated sample gates in one click. Desktop and phone checks both
approved the awaiting sample, released its email draft, kept the demo label
visible, reset the sample, and returned to zero real gates.

Release acceptance still needs the separate factory billing operator. This
work order forbids contact with `api.sociobot.in`, so checkout availability,
purchase return, live entitlement, and the HTTP 429 plus `Retry-After` allowance
were not tested here. The product keeps its paid deliverable and its safe free
workflow. Public registration metadata is in
`/work/.evidence/billing-offer.json`; no credential is present.

## Changes

- Added distinct titles, descriptions, and canonical URLs for Settings and the
  new/edit approval views. Browser checks now assert the rendered route results.
- Rebuilt the standalone offline fallback with the standard header, main, and
  footer structure. Its CSS is external, so the production self-only style CSP
  does not block it. The fallback is precached and verified while offline.
- Replaced metaphorical and mood headings with direct task names across the
  approval list, form, Settings, Privacy, offline, and 404 views.
- Raised demo controls, source links, legal links, and Settings links to the
  44 px touch-target baseline. A route-wide browser regression checks the
  populated app and supporting pages, plus 200% text reflow on a phone.
- Kept the exact offer: Send Gate Pro costs $29 once and adds unlimited active
  gates. The free plan still allows five active gates.
- Bumped the app to `v1.0.5`, cache identity to `send-gate-v8`, and manifest
  start version to `v=8`.
- Added the required verb-first catalog description and copied it to
  `/work/.evidence/catalog-description.txt`.

## Clean verification

From the documented setup:

```sh
npm ci --include=dev
npm run typecheck
npm run lint
npm run test:unit
npm run test:claims
npm test
npm run build
```

Results:

- Clean install: 60 packages; npm reported 0 vulnerabilities.
- All 15 declared claim commands passed separately in desktop and 390 px
  projects: 30/30 browser executions.
- Complete suite: 6/6 Vitest tests and 63/63 applicable Playwright tests passed;
  3 intentional duplicate mobile file tests were skipped.
- The suite covers normal, invalid, boundary, recovery, import isolation,
  approval withdrawal, keyboard focus, route titles, axe, phone layout,
  service-worker control, and offline fallback behavior.
- Production build: `dist/index.html` exists. Main JavaScript is 56,160 B raw /
  17,296 B gzip. Main CSS is 21,999 B raw / 5,775 B gzip. The mobile hero is
  14,878 B. No runtime font or third-party script is loaded.
- Local URL verification passed with one h1, `lang=en`, a main landmark,
  complete alternatives and labels, and no console or page errors.
- Local Lighthouse mobile: Performance 100, Accessibility 100, Best Practices
  100, SEO 100; FCP 1.1 s, LCP 1.3 s, TBT 0 ms, CLS 0.

## Deployment and live evidence

The exact `7495578` build was uploaded to the existing
`sf-invoice-approval-gate` Static Web App. The custom HTTPS domain returned 200.
All 24 public files matched `dist/` byte-for-byte after deployment.

Fresh live checks found:

- Desktop and 390×844 phone: correct job, audience, first action, three sample
  gates, required approval comment, released `mailto:` draft, persistent demo
  banner, reset, Start for real, and zero changes to real IndexedDB data.
- Free workflow requests used only
  `https://invoice-approval-gate.sociobot.in`. No analytics or remote assets
  appeared. The out-of-scope billing host was not contacted.
- Root and populated demo axe scans had zero violations. Settings, New,
  Privacy, Terms, Offline, and the designed 404 also had zero violations.
- Keyboard skip-link focus, 44 px phone targets, no phone overflow, and reduced
  motion (`0.01ms`, automatic scrolling) passed.
- The service worker controlled `/demo`; an offline reload retained all three
  samples and released the email draft after an offline approval.
- The deliberate unknown route returned HTTP 404 with the designed page. Its
  browser failed-resource message is expected 404 evidence, not a defect.
- Live response policy includes CSP, HSTS, `nosniff`, denied framing,
  Permissions-Policy, Referrer-Policy, and same-origin opener policy. Hashed
  assets are immutable for one year; HTML revalidates; the worker is no-store;
  the manifest has the correct MIME type.
- Live Lighthouse mobile: Performance 100, Accessibility 100, Best Practices
  100, SEO 100; FCP/LCP 1.1 s, TBT 0 ms, CLS 0, total transfer 46 KiB.

Evidence is under `/work/.evidence/repair-7-local/` and
`/work/.evidence/repair-7-live/`.

## Earlier finding disposition

| Finding group | Current disposition |
| --- | --- |
| Approved edits released changed data | Material edits withdraw approval; regression passes. |
| Invalid or forged imports | Field, date, source, and workflow invariants reject atomically; regressions pass. |
| Trim, comment, PDF, and recovery validation | Whitespace, empty comments, fake PDFs, exact 15 MiB, over-limit files, and link recovery pass. |
| Duplicate send and deletion | Sent gates have no second-send action; named deletion removes the record. |
| Focus, touch, contrast, routing, and metadata | Current desktop/phone browser and axe checks pass, including route titles and 404. |
| Security headers, MIME, and caching | Current live responses pass. |
| Returned-license feedback and cache privacy | Deterministic restore/revocation checks pass; license-bearing URLs are not cached. |
| Encryption commit race | Storage resolves at the IndexedDB commit boundary; isolated and full-suite claims pass. |
| One-click demo transition | Root-to-demo in-place transition, namespace isolation, reset, and exit pass. |
| Hosted checkout and unlock allowance | Still requires the authorised factory billing operator; not tested from this scope. |

## Remaining factory action

Register or confirm the offer from `/work/.evidence/billing-offer.json`, then
verify the hosted checkout redirect, a real purchase return and license
activation, and the single-client 429 response with `Retry-After`. Do not mark
the release fully accepted until that evidence exists.

This is a static local-first PWA. It has no product backend, sign-in, server
database, CLI, or library package, so tenant, health, restart persistence,
Entra, and clean-consumer checks do not apply.
