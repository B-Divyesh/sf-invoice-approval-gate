# Independent product verification — FAIL

**Candidate:** `aaf6065aa9a7dc30fd461a5b130301333264ce21`

**Live URL:** <https://invoice-approval-gate.sociobot.in>

**Verified:** 2026-08-28 UTC

**Work order:** `invoice-approval-gate-verify-3`

## Verdict

**FAIL.** The requested candidate is deployed, the core send-gate workflow works
end to end, the repaired import and license-cache cases pass, and the shared
Sociobot verification API now rate-limits correctly. The release still fails
the explicit accessibility contract because axe reports two serious color-
contrast failures in reachable product states:

- Settings: the `One-time` Pro ribbon is white `#fff` on coral `#d9573f`,
  **3.89:1** at 11 px (required 4.5:1).
- Sent state: the explanatory paragraph is muted ink `#4e5d55` on sage
  `#c8d4b4`, **4.47:1** at 16 px (required 4.5:1).

No product code was modified during this verification.

## Candidate and deployment identity

- A fresh `git fetch origin main` resolved `origin/main`, the detached QA
  worktree, and the requested candidate to the same full SHA.
- The clean production build generated `index-Dw8nKFTE.js` and
  `index-B-aD2WJj.css`; the live HTML references those exact files.
- All 18 public build artifacts matched the live response byte-for-byte,
  including HTML, JS and source map, CSS, service worker, manifest, offline
  page, legal routes, icons, artwork, robots file, sitemap, and Vite asset
  manifest. `staticwebapp.config.json` correctly acts as host configuration
  and is not publicly served.

Representative SHA-256 evidence:

| Artifact | Candidate/live SHA-256 |
| --- | --- |
| `index.html` | `2bf1ba497997918c81ec89809b562ca26ff0967a296814b5e91637ee428f74eb` |
| JavaScript | `211285d2db8934d735d20960181b37c144c0724713b1bb7bf73bdace994cf14e` |
| CSS | `d2c5dc5c1787262c05e751cbc91dab9dbaf1996b93b6cc5aacd2a2387de90ec5` |
| Service worker | `43f06bf36d90541d91d50cd59cb1e9f74fb9b1808165b35c60cd0ad80588e6f9` |
| Manifest | `c8cf3996fcec119bdef15699798f38c6ec4b161b1b09381b093dc2e3aa65898d` |

The prior deployment-only concern does not reproduce.

## Clean local quality gates

The candidate was checked in detached worktree `/tmp/send-gate-qa-aaf6065`.
Environment: Node `v22.23.2`, npm `10.9.8`, Playwright `1.58.2`.

| Check | Result | Evidence |
| --- | --- | --- |
| Clean install | PASS | `npm ci --include=dev`; 60 packages added |
| Dependency audit | PASS | 0 vulnerabilities at every severity |
| Strict types | PASS | `npm run typecheck`; no diagnostics |
| Unit tests | PASS | 4/4 Vitest tests |
| Browser integration | PASS | 23 Playwright tests across desktop and exact 390×844 mobile; 3 intentional duplicate mobile file cases skipped |
| Exact production build | PASS | `npm run build`; root `dist/` produced |
| Lint | N/A | no lint script or linter is configured |
| Worktree hygiene | PASS | detached candidate remained free of tracked changes |

Production assets remain below the static-PWA budgets:

- JS: 48,262 B raw / 15.39 kB gzip (budget 200 kB)
- CSS: 20,917 B raw / 5.55 kB gzip (budget 50 kB)
- mobile artwork: 14,878 B; desktop artwork: 51,364 B
- runtime fonts: 0 B; runtime npm dependencies: 0

## End-to-end product behavior

### Passed

- Created a representative link gate, persisted it across reload, submitted
  it, returned it with a required comment, corrected the amount, resubmitted,
  approved it with a required comment, opened a recipient-specific `mailto:`,
  and marked the handoff sent. IndexedDB recorded
  `created → submitted → rejected → edited → submitted → approved → sent`.
- Invalid URL, invalid email, and negative amount were blocked together. After
  correction, the `$0.00` boundary was accepted; editing it to `$0.01` and
  completing review worked without stale errors.
- Both blank return and blank approval comments remained locked and focused
  their error path; no pre-approval handoff existed.
- After marking sent, the email handoff was removed and the UI explicitly
  offered a new revision gate instead of a duplicate-send action.
- The exact 15 MiB PDF boundary was accepted. IndexedDB contained 15,728,640 B
  plaintext-size metadata and a 15,728,656 B AES-GCM ciphertext, with the key
  stored separately. The supplied suite also rejects 15 MiB + 1 B and a fake
  PDF, and confirms recovery by switching to a valid HTTPS link.
- Portable PDF export produced a dated JSON backup with the explicit readable-
  data warning and the original PDF bytes. Valid import re-encrypted the PDF;
  malformed timestamps, source metadata, and impossible approval histories
  were rejected atomically without replacing local data or releasing a handoff.
- Five active gates filled the free desk; a sixth form was replaced with the
  explicit “All five active slots are in use” recovery choice. Individual
  deletion named the gate and respected cancel before permanent deletion.
- Material edits after approval withdrew approval and removed the handoff until
  a fresh review, on both supplied desktop and mobile cases.
- Keyboard activation worked for the source radio group with Arrow keys and
  for create, submit, and approve with Enter. The skip link was first in the
  Tab order, Enter moved focus to `main`, and focus rendered as a 3 px coral
  outline. No keyboard trap was found.

### Browser health and responsive behavior

- Factory `verify-url.sh` passed locally and live: HTTP 200, title, `lang=en`,
  one `h1`, one `main`, image alt text, labeled buttons, and no console/page
  errors on initial load.
- Independent normal, invalid-input, persistence, PDF, export, mobile, offline,
  update, and license-return runs produced no uncaught page or console errors.
- At 390×844, `scrollWidth == innerWidth == 390`; all visible interactive
  targets measured at least 44×44 px. At 200% root text size the 390 px page
  still had no document-level horizontal overflow.
- Reduced-motion emulation reduced all measured animation/transition durations
  to 0.01 ms and changed document scrolling to `auto`.
- Visual inspection found the product-specific paper checkpoint treatment and
  correctly proportioned responsive artwork intact on desktop and mobile.

## Accessibility

Playwright axe was run independently over all meaningful states, not only the
supplied empty-state scan.

| State | Axe result |
| --- | --- |
| Empty desk, draft, awaiting, returned, approved | 0 violations |
| Privacy, terms | 0 violations |
| 390 px empty state | 0 violations |
| Settings | **1 serious `color-contrast` violation** |
| Sent | **1 serious `color-contrast` violation** |

See SG-V3-01. The explicit requirement of zero serious/critical findings is
not met.

## PWA, offline, and update behavior

- Chromium parsed `manifest.webmanifest` without errors. It contains the
  required 192/512/maskable icons, standalone display, versioned start URL,
  scope, and matching theme/background colors.
- The live `/sw.js` controlled the page with `send-gate-v3-shell` and
  `send-gate-v3-runtime` caches.
- A newly saved gate survived a live 390 px offline reload and moved from draft
  to awaiting review while still offline.
- Registering a changed worker URL produced the in-app “A fresh version is
  ready” toast. Choosing **Update now** changed the active controller from
  `/sw.js` to `/sw.js?qa-update=1787907313305` without errors.
- A return navigation containing `license=qa-verifier-aaf6065-sensitive` was
  stripped to `/?view=settings`; no Cache Storage request retained `license=`.
  This confirms the candidate repair for the prior sensitive-cache defect.

## Privacy, outbound requests, and response policy

- Fresh normal free-use flows contacted only the product origin. Static/runtime
  inspection found no analytics, trackers, remote fonts, or third-party scripts.
- Gate data and encrypted PDF bytes stayed in IndexedDB. Explicit Pro checking
  sent only the supplied token to the required Sociobot endpoint; no document,
  recipient, amount, or approval data was transmitted.
- The invalid-license response was HTTP 200 with `reason: "invalid"`; the app
  removed the token from the address bar, showed a resolved error and purchase
  controls, and kept the token only in the documented local restore storage.
  The API response was `no-store` and allowed the exact product origin by CORS.
- Checkout targets only
  `https://api.sociobot.in/api/v1/products/invoice-approval-gate/checkout`.
- HTTP redirects to HTTPS. Live HTML and legal routes use
  `no-cache, must-revalidate`; `sw.js` uses
  `no-cache, no-store, must-revalidate`; hashed JS/CSS/images/icons are
  `public, max-age=31536000, immutable`; the manifest has the correct
  `application/manifest+json` type and one-hour revalidation.
- Responses include a restrictive CSP with `frame-ancestors 'none'`, HSTS for
  two years with subdomains/preload, `X-Frame-Options: DENY`, `nosniff`, strict
  referrer policy, Permissions-Policy, and same-origin opener policy.

## Required API rate-limit result

The public read-only license verification endpoint was tested with unique,
invalid QA tokens and the product Origin header.

- 120 simultaneous requests completed in 910 ms.
- 30 returned HTTP 200; 90 returned HTTP 429.
- Limited responses included `Retry-After: 4`.
- Observed burst admission threshold: **30 requests** before limiting.

This is fresh evidence that prior SG-V2-02 no longer reproduces. The product is
a static PWA with no product-owned API, health endpoint, or server persistence;
other backend concurrency/persistence checks are not applicable. It requires no
sign-in, so the Entra authority check is not applicable. It is not a library or
CLI, so pack/consumer checks are not applicable.

## Performance

Fresh Lighthouse 12.8.2 mobile-default run against the live deployment:

| Category/metric | Result |
| --- | ---: |
| Performance | 97 |
| Accessibility | 100 |
| Best Practices | 100 |
| SEO | 100 |
| FCP | 1,112 ms |
| LCP | 1,112 ms |
| TBT | 199 ms |
| CLS | 0 |
| Total transfer | 40,031 B |

The live performance, LCP, TBT/INP proxy, layout-shift, and transfer budgets
pass. A local cold run scored 89 because of a 445 ms lab TBT outlier; an
immediate repeat on the same exact build scored 100 with 0 ms TBT. No field INP
is available from one-off lab tests.

## Defect register

### High — SG-V3-01: two reachable states fail the serious axe contrast gate

1. Open **Settings** while the free tier is active and run axe.
2. Complete any gate through **Mark handoff as sent** and run axe again.

Observed:

- `.pro-ribbon` (`One-time`) is `#ffffff` on `#d9573f`, 3.89:1 at 11 px.
- `.sent-block > p:nth-child(3)` is `#4e5d55` on `#c8d4b4`, 4.47:1 at 16 px.
- Axe 4.10.2 classifies both as `serious` WCAG 2 AA `color-contrast`
  violations.

Expected: normal-size text must be at least 4.5:1 in every reachable state,
and the acceptance contract requires all serious/critical axe findings fixed.
Darken the foreground or background tokens and add axe coverage for Settings
and the completed sent state.

## Release recommendation

Do not release this candidate as PASS. Preserve the now-working functional,
offline, privacy, deployment, and API-rate-limit behavior; repair both contrast
nodes, add state-specific axe regressions, redeploy, and independently verify
the new artifact.
