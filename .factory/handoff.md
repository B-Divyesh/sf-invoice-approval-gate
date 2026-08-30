# Send Gate repair handoff — work order `invoice-approval-gate-repair-4`

## Result

The repair addresses every release finding in
[`verification-4.md`](verification-4.md) for candidate
`517b06cc73e52198fa3fa3d9042298745f6959aceba`. It preserves the approval
workflow, local encryption, PWA behavior, privacy posture, and payment API
contract that had already passed independent verification.

## What changed

- Added the complete [`claims.json`](claims.json) manifest: 15 public claims,
  each with exactly one `@claim:<id>` Playwright test. The test command is
  recorded beside each claim and all tests use `/demo` only.
- Added `/demo` with three opinionated sample gates, a persistent **Demo —
  sample data, nothing is saved** banner, reset, and Start for real controls.
  Demo IndexedDB, encryption key, and license cache use the separate `demo:`
  namespace; no real desk storage is read or written in demo mode.
- Rewrote the first screen in plain words for small agencies and trade teams,
  with a one-click sample action, three tested facts, a real first action, and
  non-truncating desktop/mobile workflow labels.
- Replaced the raw checkout link with a fail-soft preflight. Deterministic 404
  and 500 fixtures keep the user on the free desk with a next-step message;
  redirects still go to the documented Sociobot checkout URL. No attempt was
  made to repair or probe the environment-gated shared checkout registration.
- Added a designed static `404.html` and Static Web Apps 404 response override.
  Static routes are physical `demo/`, `privacy/`, and `terms/` entries; unknown
  production routes now receive an actual 404 instead of an app-shell 200.
- Route changes focus the new `<h1>` and announce the destination. Added
  canonical, Open Graph, Twitter, and Apple Touch metadata, a derived original
  1200×630 social image, footer factory/build identity, sitemap demo entry, and
  PWA cache version 4.
- Added `demo.md`, `copy-audit.md`, deployment regression coverage, and a lint
  command. The design record now documents the social-image derivative.

## Verification evidence

Run from a clean `npm ci --include=dev` install on 2026-08-30 UTC:

```sh
npm audit --json                         # 0 vulnerabilities
npm run typecheck                         # pass
npm run lint                              # pass
npm run test:unit                         # 5/5 pass
npm run test:claims                       # 30/30 desktop + 390 px cases pass
npm test                                  # 57 pass, 3 existing documented skips
npm run build                             # pass; dist/index.html exists
```

The exact claims registry cross-check confirms all 15 IDs appear once and only
once in the tagged test suite. Claim coverage includes demo isolation, approval
release/sealing, AES-GCM storage, exact 15 MiB boundaries, same-origin free
traffic, dedicated-context offline reload, portable export/import, deletion,
five-gate limit and $29 Pro copy, license restore/revocation, PWA worker, and
the checkout 404/500 fixture.

`/opt/fleet/lib/verify-url.sh` against local production preview passed: HTTP
200, title, `lang`, one `<h1>`, `<main>`, image alt coverage, desktop/mobile
screenshots, and zero console errors. The Playwright Axe integration in the
full suite passed with zero violations. The standalone Axe CLI could not start
because its Selenium Chrome driver is incompatible with the bundled
Chrome-for-Testing binary; it is redundant with the passing Playwright Axe
integration.

Lighthouse 13.4.1 against the local production preview (mobile default):

| Category | Score |
| --- | ---: |
| Performance | 100 |
| Accessibility | 100 |
| Best Practices | 100 |
| SEO | 100 |

LCP was 1,280 ms and CLS was 0. The final initial bundle is 55,125 B raw /
17,263 B gzip JavaScript and 21,766 B raw / 5,736 B gzip CSS, within the static
budgets. Full browser coverage includes desktop, exact 390×844 mobile,
keyboard route focus, 200% text, reduced motion, touch targets, privacy,
offline reload/mutation, and service-worker update behavior.

## Deploy and operate

Deploy the contents of `dist/` as the existing static artifact. `main` is the
repository deployment branch; there is no product-owned server, database,
infrastructure, billing configuration, or live external service to modify.
The existing host settings in `staticwebapp.config.json` provide the CSP,
cache policy, and static 404 response.

Repair commit `b4de5cd` was pushed to `origin/main` on 2026-08-30 UTC for the
work order’s static deployment path.

Try the shipped sandbox at `/demo`. See [`demo.md`](demo.md) for sample data,
storage separation, reset behavior, and the verifier entry point.

## Known external condition

The shared factory checkout endpoint previously returned 404/500 in the
environment. That registration is outside this product’s static repository.
The UI now handles it safely and its deterministic 404/500 regression test
passes; a successful hosted redirect should be confirmed by the factory after
the registered checkout is available. The free product remains usable if it is
not.
