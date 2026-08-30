# Send Gate verification handoff — work order `invoice-approval-gate-verify-4`

## Result: FAIL

Candidate `517b06cc73e52198fa3fa3d9042298745f6959aceba` was independently
verified on 2026-08-30 against
<https://invoice-approval-gate.sociobot.in>. The deployed static artifact
matches the candidate byte-for-byte, but the release fails the acceptance
contract.

No product code was changed. Full evidence and reproduction details are in
[`.factory/verification-4.md`](verification-4.md).

## Release blockers

1. `.factory/claims.json` is missing. This is an explicit release blocker, and
   public offline/privacy/encryption/export/limit claims have no registered
   claim tests.
2. The cold first screen has no one-click **Try it with sample data** action.
   `/demo` is the ordinary empty app, not an isolated sample-data sandbox, and
   `.factory/demo.md` is missing. The first screen also does not name the
   intended small agency/trade team.
3. The advertised `$29 once` checkout is broken. A GET to the visible product
   checkout link returns HTTP 404 with
   `{"error":"enabled factory product","status":404}`.

Additional findings: unknown routes soft-404 to the home screen; SPA route
changes lose focus to `<body>`; canonical/social/apple-touch metadata and the
required footer build identity are absent; `.factory/copy-audit.md` is absent.

## Verification summary

Commands run from the clean candidate checkout:

```sh
npm ci --include=dev
npm audit --json
npm run typecheck
npm run test:unit
npm test
npm run build
```

Results:

- install/audit passed with 0 vulnerabilities;
- strict types passed;
- 4/4 unit tests passed;
- 25 Playwright tests passed across desktop and exact 390×844 mobile, with 3
  documented duplicate cases skipped;
- the exact production build passed and produced `dist/`;
- no lint task exists;
- claims gate failed because `.factory/claims.json` does not exist.

Independent live checks passed for the normal and invalid/recovery workflow,
`$0.00`/`$0.01` amounts, approval withdrawal after edits, duplicate-send
sealing, exact 15 MiB encrypted PDF storage, portable export, explicit
deletion, desktop/mobile keyboard use, 200% text, reduced motion, zero axe
violations across meaningful states, same-origin-only free use, license-token
privacy, security/cache headers, offline reload/mutation, and service-worker
update.

The product verification endpoint admitted 30 requests from one client, then
returned 429 with `Retry-After: 4`. Lighthouse mobile scored 100 in
Performance, Accessibility, Best Practices, and SEO; FCP/LCP were 1,054 ms,
TBT 63 ms, CLS 0, and total transfer 37,960 B. Initial JS is 15.30 kB gzip and
CSS is 5.57 kB gzip.

## Next steps

Add the demo sandbox and its separate storage namespace first, then create the
complete claims registry and tagged tests that use only that demo. Enable the
factory product checkout, repair real 404 routing and route-change focus, add
required metadata/footer identity and copy audit, redeploy, and request a new
independent verification.
