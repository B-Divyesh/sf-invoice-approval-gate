# Independent verification 8 — FAIL

**Implementation candidate:** `7495578975b826e2e29870f7a2a907ccc45cc853`
**Documentation SHA:** `11aa196c980302a7bc2b4857a291ae4bf859b3e2`
**Live URL:** <https://invoice-approval-gate.sociobot.in>
**Verified:** 2026-09-06 UTC
**Work order:** `invoice-approval-gate-verify-8`

## Verdict

**FAIL.** Send Gate's product-contained implementation passes independent
verification. All 15 registered claims were run from a clean clone, the full
suite and production build passed, the live deployment matches the implementation
candidate, and fresh desktop and phone runs completed the real approval job.

One release-blocking acceptance item remains unverified: hosted checkout,
purchase-return entitlement, and the billing host's HTTP 429 with
`Retry-After`. The required service is on `api.sociobot.in`, which this work
order expressly excludes. I did not contact it. This is one blocker finding,
not evidence of a product-code fault. There are **zero untested registry
claims**; the unverified hosted checks are separate release-acceptance checks.

No product code was modified.

## Job, audience, and first action

The job is to hold a quote or invoice until a second reviewer records an
approval, then open a user-controlled email draft. It is for small agencies
and trade teams needing a second pair of eyes before a client receives a
document. On fresh desktop and 390×844 phone views, the first action was
**Try it with sample data**; one click loaded the isolated three-gate sample.

In both fresh contexts I confirmed the persistent “Demo — sample data, nothing
is saved” label, no email draft before approval, the required decision-comment
error and focus recovery, a realistic Harbour House approval and `mailto:`
handoff, Reset demo, Start for real, and a real IndexedDB count of zero both
before and after. Normal sample-review traffic used only the product origin.

## Clean-clone quality gates

A clean clone at documentation SHA `11aa196c` was installed with
`npm ci --include=dev` (60 packages; npm reported zero vulnerabilities).

| Check | Result |
| --- | --- |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm run test:unit` | PASS — 6/6 |
| Each command declared in `.factory/claims.json` | PASS — 15/15 commands, 30 browser executions |
| `npm test` | PASS — 6 unit tests and 63 browser tests; 3 documented mobile duplicates skipped |
| `npm run build` | PASS — `dist/` produced |

The declared claims all passed: checkout fail-soft, demo sandbox, approval
handoff, sealed handoff, local encryption, PDF size boundary, private free
workflow, offline reload, export, import, deletion, free limit/Pro display,
license restore, license revocation, and PWA shell. This leaves no untested
claim command and no unlisted claim finding from the public product copy.

The fresh build produced 56,160 B JavaScript (17,296 B gzip) and 21,999 B CSS
(5,775 B gzip). The 640 px hero is 14,878 B. These are within the static-PWA
budgets and no third-party runtime scripts or fonts were observed.

## Live deployment and product checks

- The candidate build's 24 public files, including the JavaScript source map,
  matched live SHA-256 bytes exactly. `staticwebapp.config.json` is correctly
  not public.
- `verify-url.sh` passed on the live root: HTTP 200, `lang="en"`, one title,
  one h1, main landmark, complete image alternatives, labeled buttons, and no
  console or page errors. Its cold load measurement was 1,034 ms.
- Axe 4.10.2 found zero violations on desktop and phone root, demo, Settings,
  Privacy, Terms, offline page, and designed missing page (14 scans total).
  Keyboard Tab reached the skip link first; Enter focused `main` with the
  designed 3 px focus ring. Reduced motion set transition duration to
  `0.00001s` and scroll behavior to `auto`.
- Phone width had no page overflow (`390 == scrollWidth == innerWidth`). The
  current regression checks also passed all visible 44 px target checks and
  200% text reflow.
- After service-worker control, a live offline reload retained the approved
  demo gate, displayed the offline state, and retained the email-draft
  handoff. The invalid empty-comment path stayed locked, announced its error,
  and focused the comment field; entering a comment recovered normally.
- Root, Settings, demo, Privacy, Terms, offline, manifest, robots, and sitemap
  returned HTTP 200. The unknown route returned HTTP 404 and rendered the
  designed page with a way back; this deliberate 404 is expected evidence, not
  a defect.
- Live headers include CSP, HSTS, `nosniff`, denied framing, Referrer-Policy,
  Permissions-Policy, and same-origin opener policy. Hashed JavaScript uses
  one-year immutable caching and the service worker is `no-cache, no-store`.

A Lighthouse rerun could not complete because the local Chromium tab crashed
while the runner captured its screenshot. That is runner-environment evidence,
not a product failure or a new performance pass; the prior deployed 100/100/
100/100 result is retained as historical evidence only.

## Earlier finding disposition

| Earlier finding | Current disposition |
| --- | --- |
| SG-V01 material edits retained approval | PASS — regression confirms a material edit withdraws approval and removes the handoff. |
| SG-V02 / SG-V2-01 invalid or forged import could release a handoff | PASS — timestamp and workflow-invariant imports reject atomically and preserve the existing desk. |
| SG-V03 whitespace identity, SG-V04 empty approval comment | PASS — trimmed identities and both decisions require meaningful input and focus recovery. |
| SG-V05 artwork ratio, SG-V06 file-to-link recovery, SG-V07 fake PDF | PASS — regression coverage confirms intrinsic ratio, link recovery, and PDF validation. |
| SG-V08 skip focus and phone targets; SG-V3-01 contrast | PASS — live keyboard, 44 px target, phone reflow, axe, and focus checks pass. |
| SG-V09 response policy/cache; SG-V2-03 returned-license cache | PASS — live policy/cache headers and service-worker license-cache regression pass. |
| SG-V10 returned-license feedback | PASS — deterministic invalid-license test resolves the notice and restores free controls. |
| SG-V4-01 claims registry, SG-V4-02 / SG-V6-01 one-click demo | PASS — registry is present, every command passed, and fresh root-to-demo transition works. |
| SG-V4-04 404, SG-V4-05 route focus, SG-V4-06 metadata, SG-V4-07 labels | PASS — direct routes, route focus/announcement, titles/canonical metadata, and untruncated labels pass. |
| SG-V5-01 encryption full-run flake | PASS — local-encryption passed as its declared command and within the full suite. |
| SG-V2-02, SG-V4-03, SG-V5-02, SG-V6-02, SG-V7-01 hosted billing | Still unverified; superseded by SG-V8-01 below. |

## Finding

### Blocker — SG-V8-01: hosted billing acceptance checks remain untested

The site advertises the $29 one-time Pro offer. Full acceptance requires the
authorised billing operator to verify hosted checkout, a real purchase return
and entitlement activation, and the single-client rate limit returning HTTP
429 with `Retry-After`. Those endpoints are on the excluded billing host, so
this verifier did not make the requests. Local deterministic tests prove
fail-soft checkout UI and restore/revocation behavior only; they cannot prove
the live billing service.

**Required next step:** an authorised operator must test those three billing
paths and append the result. Until then, do not mark the release PASS.

## Applicability and evidence

Send Gate is a static, local-first PWA. It has no product backend, product
database, account system, CLI, or library artifact, so tenant isolation,
backend health/restart persistence, and clean-consumer installation checks do
not apply. Evidence includes the clean clone, `/work/.evidence/verify-8-live-url/`,
and `/work/.evidence/verify-8-lighthouse.json` (the latter is incomplete due
to the documented browser crash).
