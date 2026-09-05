# Repair verification 8 — product checks pass, billing check pending

**Implementation candidate:** `7495578975b826e2e29870f7a2a907ccc45cc853`
**Previous independent candidate:** `858e1575f1803e265b8eefa9aa85359da10948cb`
**Live URL:** <https://invoice-approval-gate.sociobot.in>
**Verified:** 2026-09-05 UTC
**Work order:** `invoice-approval-gate-repair-7`

## Verdict

**Product-contained PASS; full release acceptance remains pending.** The repair
build is deployed, all 24 public artifacts match, all claim and repository
checks pass, and fresh desktop, phone, accessibility, privacy, route, offline,
header, cache, and Lighthouse checks pass.

The only remaining check is outside this work order's permitted resources. The
hosted checkout and license verification service are on `api.sociobot.in`.
That host was not contacted. A separate authorised billing operator must prove
checkout, purchase return, license activation, and HTTP 429 with `Retry-After`.

## Results

| Check | Result |
| --- | --- |
| `npm ci --include=dev` | PASS — 60 packages, 0 reported vulnerabilities |
| Every command in `.factory/claims.json` | PASS — 15 commands, 30 browser executions |
| `npm run typecheck` and `npm run lint` | PASS |
| `npm test` | PASS — 6 unit + 63 browser, 3 intentional skips |
| `npm run build` | PASS — `dist/` produced |
| Local URL verifier | PASS — no load errors, required semantics present |
| Local Lighthouse mobile | PASS — 100/100/100/100; LCP 1.3 s; TBT 0 ms; CLS 0 |
| Deployment | PASS — existing product Static Web App, HTTPS 200 |
| Candidate/live artifact comparison | PASS — 24/24 byte-for-byte |
| Fresh desktop and 390 px sample workflows | PASS |
| Demo namespace, reset, and real-data isolation | PASS — real count remained zero |
| Axe across root, demo, app routes, legal, offline, 404 | PASS — zero violations |
| Privacy traffic during free workflow | PASS — product origin only |
| Offline controlled reload and approval | PASS |
| Live Lighthouse mobile | PASS — 100/100/100/100; LCP 1.1 s; TBT 0 ms; CLS 0; 46 KiB |
| Hosted checkout, entitlement, and 429 allowance | NOT RUN — prohibited external host |

## Repair evidence

The new browser regressions check observable outcomes:

- Settings and New show distinct titles, canonical URLs, focused headings, and
  route announcements.
- The standalone offline page loads from the service-worker cache without a
  connection, renders its external stylesheet, has the expected title and
  heading, and has zero axe findings or console errors.
- Existing claims were updated only where public wording changed; their
  behavioral assertions still exercise checkout recovery, license restore,
  license revocation, the five-active-gate boundary, and all other promises.

The deployed main bundle is 56,160 B raw / 17,296 B gzip; CSS is 21,999 B raw /
5,775 B gzip; the mobile hero is 14,878 B. These remain within the static PWA
budgets.

## Billing handoff

`/work/.evidence/billing-offer.json` contains the public offer metadata: slug,
name, USD 2,900 one-time price, exact product-origin return URL, price evidence,
unlimited-active-gates feature, and verification path. It contains no secret.
The free five-gate plan and all safety, export, deletion, privacy, and
accessibility behavior remain available without Pro.
