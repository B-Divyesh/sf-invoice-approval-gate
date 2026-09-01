# Independent product verification — FAIL

**Candidate:** `a20dd743b2590c485f46d974fe51b5a7a32a63fe`
**Live URL:** <https://invoice-approval-gate.sociobot.in>
**Verified:** 2026-09-01 UTC
**Work order:** `invoice-approval-gate-verify-6`

## Verdict

**FAIL.** The candidate and deployment match, all registered claim commands
pass after the clean install, the full repository suite is green, and the
direct `/demo` workflow is usable, private, accessible, fast, and available
offline. Two release requirements are not met:

1. The mandatory first-screen **Try it with sample data** action does not load
   the demo in one click. It changes the address to `/demo` while leaving the
   empty landing screen rendered.
2. The advertised `$29 once` Pro purchase cannot be completed because the
   hosted checkout endpoint returns 404.

## Mandatory opening checks

### Claims registry

`.factory/claims.json` exists with 15 entries. In the untouched clone, invoking
the listed commands before dependency installation stopped at module loading
because `@playwright/test` was not installed. After the required clean
`npm ci`, I ran every listed command separately through its `/demo` sandbox.
Every command passed in both configured projects:

| Claim | Result |
| --- | --- |
| `checkout-fail-soft` | PASS — 2/2 |
| `demo-sandbox` | PASS — 2/2 |
| `approval-handoff` | PASS — 2/2 |
| `sealed-handoff` | PASS — 2/2 |
| `local-encryption` | PASS — 2/2 |
| `pdf-size-limit` | PASS — 2/2 |
| `private-free-workflow` | PASS — 2/2 |
| `offline-reload` | PASS — 2/2 |
| `portable-export` | PASS — 2/2 |
| `portable-import` | PASS — 2/2 |
| `deletion` | PASS — 2/2 |
| `free-active-limit` | PASS — 2/2 |
| `license-restore` | PASS — 2/2 |
| `license-revocation` | PASS — 2/2 |
| `pwa-shell` | PASS — 2/2 |

The repaired encryption boundary was also repeated independently:
`npm run test:claims -- --grep '@claim:local-encryption' --repeat-each=10
--workers=2 --reporter=line` passed 20/20.

There is a coverage mismatch in `demo-sandbox`: its test opens `/demo`
directly. It does not click the landing action even though the registry names
the landing primary action and the README says “Try it in one click.” The
direct-entry behavior passes while the advertised one-click behavior fails.

### Cold first-read

The words themselves pass. A clean desktop and 390×844 load say:

- what it does: “Approve quotes and invoices before they go out”;
- who it is for: small agencies and trade teams needing a second reviewer;
- what to click: **Try it with sample data**;
- what should happen: “Loads three sample gates. Nothing is saved.”

The action does not fulfill that stated result. Fresh browser evidence after
one click was:

```json
{
  "url": "https://invoice-approval-gate.sociobot.in/demo",
  "h1": "Approve quotes and invoices before they go out.",
  "demoBanner": 0,
  "sampleButtons": 0
}
```

The landing screen was still present after one second. A cold navigation to
the same `/demo` URL immediately showed the demo banner and three sample gates.
See [one-click-demo-failure.png](verification-6-artifacts/one-click-demo-failure.png)
and [direct-demo-pass.png](verification-6-artifacts/direct-demo-pass.png).

## Candidate and deployment identity

- Local `HEAD`: `a20dd743b2590c485f46d974fe51b5a7a32a63fe`.
- `origin/main`: the same commit.
- The worktree was clean before evidence files were added.
- A fresh production build and the live site matched byte-for-byte for all 23
  published files. `staticwebapp.config.json` is deployment configuration and
  is not publicly served.

| Artifact | SHA-256 in candidate and live |
| --- | --- |
| `index.html` | `864c32f56d627a7ab3981a64621ada741c468215e8f991abcdbf9115ab2bdb4a` |
| `assets/index-E-P2oyP4.js` | `4bd952a84f371a4508da2893987d95d9eba9bcc6539b11db6dbf5e76ead68ca5` |
| `assets/index-DOWL4q5D.css` | `839ea0271e8e58b881aa121b981f3bf72b8fd99561ab514c848c3d2a1374540e` |
| `sw.js` | `41623361d416d1c52dd795b26278be1f19ed20e1c7fbcfcefabb254241c35744` |

The visible footer identifies `v1.0.2 · build repair-5`.

## Clean-clone quality gates

| Check | Result |
| --- | --- |
| `npm ci` | PASS — 60 packages, 0 reported vulnerabilities |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS; this script currently repeats `tsc --noEmit` |
| `npm test` | PASS — 6 Vitest tests; 59 Playwright tests; 3 intentional project skips |
| all 15 claim commands separately | PASS — 30 browser executions |
| encryption repeat check | PASS — 20/20 |
| `npm run build` | PASS — `dist/` produced |

The production payload is within budget: JavaScript is 55,155 bytes raw /
17.27 KB gzip; CSS is 21,766 bytes raw / 5.74 KB gzip; the 640 px hero is
14,878 bytes and the 1280 px hero is 51,364 bytes. There are no runtime fonts,
third-party scripts, or analytics.

## End-to-end product checks

Using a cold direct `/demo` entry:

- all three realistic samples loaded in `demo:` IndexedDB storage;
- Reset demo and Start for real were visible;
- approval without a comment kept the handoff closed, announced the error,
  and focused the comment field;
- adding a review comment released a `mailto:` draft;
- offline reload retained the demo desk and showed the offline state;
- export, import, deletion, 5-active-gate limit, exact 15 MiB PDF acceptance,
  15 MiB plus one-byte rejection, and encrypted storage passed their registered
  observable tests.

In a separate clean real-mode context, a link gate with the boundary amount
`0` was created, submitted, approved, and marked sent. A whitespace-only gate
name was rejected with the documented message and focus moved to that field;
after correction the flow completed. Once marked sent, the email-draft action
was absent.

## Privacy and response policy

The full normal demo review recorded 14 requests and one origin only:
`https://invoice-approval-gate.sociobot.in`. No gate, recipient, amount, PDF,
or comment was sent elsewhere. The only external runtime request observed was
the explicit Buy Pro action to the documented Sociobot billing host.

The root response includes HSTS, `X-Content-Type-Options: nosniff`, DENY
framing, strict-origin referrer policy, a restrictive Permissions-Policy,
same-origin opener policy, and a CSP limited to self plus the documented
Sociobot billing hosts. HTML uses `no-cache, must-revalidate`; hashed JS/CSS
use `public, max-age=31536000, immutable`; `sw.js` uses `no-cache, no-store,
must-revalidate`; the manifest has the correct manifest MIME type.

Normal root, demo, mobile, reduced-motion, Settings, Privacy, and Terms loads
had no page errors. They had no console errors before the deliberately checked
404 checkout response and designed missing-page response; Chromium logged one
failed-resource message for each expected 404.

## Accessibility, responsive behavior, and navigation

- Axe 4.10.2 found zero violations, including zero serious/critical findings,
  on root, direct demo, Settings, Privacy, and Terms. The 390 px root also had
  zero violations.
- The supplied `/opt/fleet/lib/verify-url.sh` passed. Its report confirms title,
  `lang=en`, one h1, a main landmark, zero missing image alternatives, zero
  unlabeled buttons, and zero load console/page errors.
- Keyboard Tab reaches the skip link first. Its computed focus treatment is a
  3 px coral outline, and Enter moves focus to `main`.
- At 390 px, `scrollWidth` equals `innerWidth` (390), no visible interactive
  target measured below 44×44 CSS pixels, and the inspected layout had no
  clipping or overlap.
- With `prefers-reduced-motion: reduce`, the maximum computed transition or
  animation duration was 0.00001 seconds.
- Internal links discovered on root, demo, Settings, Privacy, and Terms all
  returned 200. The designed unknown route returned 404 with a way back.

Screenshots and the URL-verifier output are in
[`verification-6-artifacts/`](verification-6-artifacts/).

## PWA and performance

The manifest declares standalone display and 192/512/maskable icons. The live
worker controlled `/demo`; its current update check completed against
`/sw.js`, with active caches `send-gate-v5-shell` and
`send-gate-v5-runtime`. No newer waiting worker existed during the check.
After switching the browser context offline and reloading, the saved demo desk
rendered with the offline notice. The worker implements waiting-worker notice,
`SKIP_WAITING`, client claiming, versioned cache cleanup, and excludes returned
license URLs from cache; the related repository checks pass.

Lighthouse mobile results from the live URL:

| Category/metric | Result |
| --- | ---: |
| Performance | 99 |
| Accessibility | 100 |
| Best practices | 100 |
| SEO | 100 |
| FCP | 1.0 s |
| LCP | 1.1 s |
| TBT | 120 ms |
| CLS | 0 |
| Initial transfer | 41 KiB |

Lighthouse did not emit an INP value for the navigation-only lab run. A
separate 390 px interaction trace measured the create-gate click at 88 ms
maximum Event Timing duration and 103 ms from click to rendered form.

## Billing allowance and sign-in applicability

Fresh hosted checkout evidence:

```text
GET https://api.sociobot.in/api/v1/products/invoice-approval-gate/checkout
HTTP/2 404
{"error":"enabled factory product","status":404}
```

The UI handles this cleanly: it stays on the free desk and explains that
checkout is temporarily unavailable. That recovery does not make the advertised
one-time purchase available.

The documented verify endpoint was checked sequentially from one client with
distinct invalid tokens. Requests 1–30 returned 200; request 31 returned 429
with `Retry-After: 2`. Observed allowance: **30 verification requests per
client burst**, followed by a standards-compliant limited response.

Send Gate has no sign-in and no product-owned server or database. Entra tenant,
backend health/build identity, concurrency, and SQLite persistence checks are
therefore not applicable. It is not a library or CLI.

## Defects

### Blocker — SG-V6-01: first-screen sample action does not enter the demo

From a cold `/` load, click **Try it with sample data** once. The address
changes to `/demo`, but the page keeps the landing h1, shows no demo banner,
and has zero sample-gate buttons. Refreshing or directly opening `/demo` works.
This fails the explicit one-click demo acceptance gate. The registered
`demo-sandbox` test starts at `/demo`, so it does not detect the transition
failure. Confirm the landing action performs a full demo initialization and
add a claim test that begins at `/` and clicks the action.

### High — SG-V6-02: advertised one-time Pro checkout returns 404

The live page offers unlimited active gates for `$29 once`, but its only
allowed checkout URL returns 404. Confirm factory product registration and the
hosted redirect, then verify purchase return and license activation. The
existing free-desk recovery behavior should remain.

## Scope and product assessment

No product code or infrastructure was modified. The candidate otherwise fits
the researched brief well: it is a focused local approval checkpoint rather
than an accounting package, keeps sending user-controlled, records approve or
return comments, protects local PDFs, supports explicit deletion and portable
backup, and avoids unsupported legal or compliance claims. No additional AI
feature is needed for the smallest useful job described by the brief.
