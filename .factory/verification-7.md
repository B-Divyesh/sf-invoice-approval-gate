# Independent product verification — FAIL

**Candidate:** `858e1575f1803e265b8eefa9aa85359da10948cb`
**Live URL:** <https://invoice-approval-gate.sociobot.in>
**Verified:** 2026-09-01 UTC
**Work order:** `invoice-approval-gate-verify-7`

## Verdict

**FAIL.** All product-contained checks pass: every registered claim check, the
complete local suite, production build, live product flow, accessibility,
privacy traffic, headers, responsive layout, and offline PWA behavior. The
deployment is the candidate byte-for-byte.

Release acceptance remains incomplete because two required hosted-product
checks cannot be confirmed within the work-order resource scope. Checkout and
license verification are on `api.sociobot.in`, while this work order permits
connections only to the product resource. I did not contact that host.
Therefore I could not confirm that the advertised $29 purchase is available or
observe the required HTTP 429 plus `Retry-After` request-limit response for
product-unlock calls. An unverified paid purchase and allowance check cannot
receive a PASS.

No product code was changed.

## Mandatory opening checks

### Claims registry — PASS

`.factory/claims.json` is present and defines 15 claims. After `npm ci` in the
clean candidate checkout, I ran each listed command separately through the
browser demo harness. Each passed in both configured projects:

| Claim | Result |
| --- | --- |
| checkout-fail-soft | PASS, 2/2 |
| demo-sandbox | PASS, 2/2 |
| approval-handoff | PASS, 2/2 |
| sealed-handoff | PASS, 2/2 |
| local-encryption | PASS, 2/2 |
| pdf-size-limit | PASS, 2/2 |
| private-free-workflow | PASS, 2/2 |
| offline-reload | PASS, 2/2 |
| portable-export | PASS, 2/2 |
| portable-import | PASS, 2/2 |
| deletion | PASS, 2/2 |
| free-active-limit | PASS, 2/2 |
| license-restore | PASS, 2/2 |
| license-revocation | PASS, 2/2 |
| pwa-shell | PASS, 2/2 |

The final complete-suite result file records `status: passed` with no failed
tests.

### Cold first read — PASS

In a fresh browser context, the live first screen says what it does (“Approve
quotes and invoices before they go out”), who it is for (small agencies and
trade teams needing a second reviewer), and what to do first (**Try it with
sample data**). The action says “Loads three sample gates. Nothing is saved.”
One click entered `/demo` in-place, loaded the three samples, and showed the
persistent demo banner with Reset demo and Start for real.

## Candidate and deployment identity — PASS

`HEAD` is the requested candidate. `npm run build` produced `dist/`; its
JavaScript and CSS asset names were `index-Htn45EU9.js` and
`index-DOWL4q5D.css`, which the cold live response also referenced.

I compared SHA-256 output for every publicly deployed candidate file against
its live response. All **23** published artifacts matched byte-for-byte,
including HTML, JS, CSS, service worker, manifest, legal/offline/404 pages,
icons, images, robots, sitemap, and asset manifest. The deployment
configuration file is correctly not public.

## Local quality checks — PASS

| Check | Result | Evidence |
| --- | --- | --- |
| Clean install | PASS | `npm ci`; 60 packages installed and npm reported 0 vulnerabilities |
| Type check | PASS | `npm run typecheck` |
| Lint command | PASS | `npm run lint` |
| Unit tests | PASS | `npm run test:unit`: 6/6 |
| Full suite | PASS | `npm test`: 6 unit tests plus 59 browser tests; 3 documented project skips |
| Production build | PASS | `npm run build`; `dist/` created |

Build payloads are within static-PWA limits: JavaScript is 55.82 kB raw /
17.38 kB gzip; CSS is 21.77 kB raw / 5.74 kB gzip; there are no downloaded
font files or third-party runtime scripts. No Lighthouse executable is in this
environment, so I do not state a new Lighthouse score.

## Workflow, privacy, accessibility, and PWA checks — PASS

- On live desktop and 390 px mobile, I selected the awaiting Harbour House
  quote, confirmed that an empty decision comment is rejected, entered a
  meaningful comment, and confirmed the resulting user-controlled `mailto:`
  draft. The demo banner, reset control, and Start for real control remained
  visible. The registered checks also cover encrypted PDFs, exact and
  over-limit PDF boundaries, export/import, deletion, five active free gates,
  material-edit reapproval, invalid input recovery, and sealed handoffs.
- Cold load and complete demo review traffic used only
  `https://invoice-approval-gate.sociobot.in`. No gate, client, amount, PDF,
  or comment left the browser during the free workflow.
- `verify-url.sh` passed against live: HTTP 200, title, `lang="en"`, one h1,
  main landmark, complete image alternatives, labeled buttons, and no load
  errors. Its measured cold load was 748 ms.
- Independent axe scans on the landing and populated demo found zero serious
  or critical findings on desktop and 390 px mobile. Keyboard checks confirmed
  that Tab reaches the skip link first and Enter moves focus to `main`; 390 px
  had no document-level horizontal overflow. Reduced-motion emulation was
  active and the stylesheet reduces animation and transition duration to
  `.01ms`.
- Live headers include CSP, HSTS, nosniff, DENY framing, restrictive
  Permissions-Policy, Referrer-Policy, and same-origin opener policy. HTML
  revalidates, hashed JS/CSS use one-year immutable caching, the worker uses
  `no-cache, no-store`, and the manifest MIME type is correct. Root, demo,
  Privacy, Terms, robots, sitemap, manifest, offline page, and 404 page
  return 200; an unknown path returns 404.
- The live worker controlled `/demo`, completed an update check with an active
  worker, and uses versioned `send-gate-v6` caches with `SKIP_WAITING` and
  client claim handling. After the first visit, an offline reload showed the
  demo desk and allowed approval through to the email-draft handoff.

## Release blocker

### Blocker — SG-V7-01: hosted paid-product checks are outside the permitted resource scope

The page advertises a `$29 once` Pro purchase and uses the documented factory
checkout and license-verification path. The acceptance contract requires a
live purchase availability check and confirmation that product-unlock requests
receive HTTP 429 with `Retry-After` after the documented single-client
allowance. These endpoints are on `api.sociobot.in`, not the scoped product
host. The work order expressly forbids connections to that host, so I did not
make those requests.

The local `checkout-fail-soft`, `license-restore`, and `license-revocation`
claims pass using deterministic browser responses. They confirm safe UI
recovery, not the hosted service's current availability or allowance.

**Required follow-up:** a permitted factory-side verifier must check the
registered checkout redirect, purchase return and license activation, and the
product-unlock request allowance from one client; record the observed
allowance and `Retry-After` value. Until then, the candidate remains FAIL.

## Applicability

Send Gate has no sign-in, product-owned backend, database, library package, or
CLI. Entra tenant, backend health/concurrency, SQLite deployment persistence,
and consumer package checks do not apply. The only remote product-related
calls are the scoped-out factory billing calls above.
