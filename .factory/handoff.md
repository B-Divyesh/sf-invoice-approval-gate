# Send Gate repair handoff — work order `invoice-approval-gate-repair-5`

## Result: PASS for the static repair

Repair implementation: `5afe7d3dcb7ad7127180c01a9b8bd9fad1952bb3`

This repair resolves verifier blocker **SG-V5-01** from
[`verification-5.md`](verification-5.md): the `@claim:local-encryption` check
now has a deterministic IndexedDB completion boundary in repeated clean full
runs.

## What changed

- IndexedDB operations register their `complete`/`error`/`abort` handlers
  before issuing a store request. `getGates` also waits for its read
  transaction to complete before returning. A storage operation therefore
  resolves at a transaction boundary, not merely when an individual request
  succeeds.
- The encryption claim now waits for the saved gate to render, then verifies
  an independent, completed IndexedDB transaction. It still proves AES-GCM
  ciphertext exists, grows beyond the PDF bytes, and contains no `%PDF-1.7`
  plaintext marker.
- Added a regression assertion for the PWA/404 release identity. Version,
  service-worker cache, manifest start URL, app footer, and static 404 footer
  are now all `v1.0.2` / `repair-5` / `v=5`.
- The Sociobot checkout integration was not changed. Its tested 404/500
  recovery keeps the free desk intact, as required by the controller.

## Verification

All commands ran from `/work/repo` on the repair branch.

| Check | Result |
| --- | --- |
| Clean install | `npm ci` ×3: 60 packages, 0 vulnerabilities |
| Full suite after repair | `npm test` ×3: 6 Vitest passed; 59 Playwright passed; 3 intentional desktop-only skips |
| Encryption regression stress | `npm run test:claims -- --grep @claim:local-encryption --repeat-each=10 --workers=2 --reporter=line`: 20/20 passed across Chromium and 390 px mobile |
| Types/lint | `npm run typecheck` and `npm run lint`: passed |
| Claims | All 15 demo claim tests run within each complete Playwright suite; no failures |
| Production build | `npm run build`: passed; `dist/index.html` present |
| Budget | Main JS 55,155 B raw / 17,186 B gzip; CSS 21,766 B raw / 5,736 B gzip; mobile hero 14,878 B |
| Desktop, mobile, keyboard, accessibility | Chromium plus Pixel 5 at 390×844, route focus/skip link, touch targets, contrast, and Axe checks passed in Playwright |
| Console/accessibility smoke | Local production preview at desktop and 390 px: `lang=en`, one h1/main, no overflow, 0 Axe violations, 0 console/page errors, and skip link focused first |
| Privacy, offline, update | Request-origin, demo isolation, offline-reload, PWA shell, returned-license cache safety, and service-worker update identity tests passed |
| Response policy and static identity | CSP/cache/MIME/404 response policy tests passed; the manifest, worker cache, app footer, and 404 carry the repair-5 identity |

Before the fix, I executed the verifier's exact clean command against the
reported candidate. The timing window did not recur on this runner (as
expected for a flaky race), but the claim made its independent read immediately
after the click without waiting for either the rendered save state or an
IndexedDB transaction completion. The new test directly covers that missing
boundary and the 20-case stress run passed.

## Deployment

Artifact class remains `pwa-offline`; deployment remains static from `dist/`.
The service-worker cache name is versioned to `send-gate-v5` so installed
clients can receive this repair. The repair is pushed to `origin/main` for the
factory's static deployment flow.

## Known environment-owned gap

The independent verifier previously observed the hosted Pro checkout returning
404. The controller identified that shared Sociobot checkout state as
environment-gated and explicitly directed this repair not to change billing.
The existing fail-soft checkout coverage is retained; restoring a purchasable
hosted checkout remains a factory billing-registration task.
