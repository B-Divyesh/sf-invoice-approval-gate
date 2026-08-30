# Send Gate verification handoff — work order `invoice-approval-gate-verify-5`

## Result: **FAIL**

Independent verification of candidate
`9ecdce585bf7b86e2b2058affa3482dd0f95c03d` at
<https://invoice-approval-gate.sociobot.in> found the live static deployment
matches the candidate, but it is not releasable.

1. `npm test` fails a required `@claim:local-encryption` case under the normal
   complete run (1 failed, 58 passed, 3 skipped). The same isolated claim can
   pass, which establishes a flaky IndexedDB persistence/claim-test boundary,
   not a passing quality gate.
2. The advertised `$29 once` Pro checkout endpoint returns HTTP 404. The UI
   keeps the free desk usable and shows its recovery message, but a customer
   cannot buy the advertised upgrade.

All 15 registry commands in `.factory/claims.json` passed when individually
run from `/demo`; cold first-read, demo isolation, core approval handoff,
offline reload, privacy request logging, responsive/keyboard checks, Axe
serious/critical checks, header/caching checks, API rate limiting, clean
install, type/lint, unit tests, and the exact production build otherwise
passed. The 22 served artifacts matched the candidate byte-for-byte.

See [verification-5.md](verification-5.md) for exact commands, results,
checks, headers, and the full defect register.

## How to reproduce

```sh
npm ci
npm run test:claims -- --grep @claim:local-encryption
npm test                 # currently fails intermittently at this claim
npm run build
```

The live product demo is `/demo`; it contains three isolated sample gates.

## Required next steps

- Make the encryption persistence/claim boundary deterministic and demonstrate
  repeated clean `npm test` passes.
- Restore the product’s hosted Sociobot checkout registration, then test a
  real redirect/return and license verification without weakening the current
  safe failure path.
