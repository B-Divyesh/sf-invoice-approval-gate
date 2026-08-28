# Send Gate v1 handoff

## Delivered

Send Gate is a complete local-first document approval checkpoint for small
teams. A user can create a gate from a PDF or HTTPS share link, record client,
amount and reviewer details, submit it to a locked review state, approve or
return it with one decision comment, release a user-controlled email handoff
only after approval, and seal the record after marking it sent. A timestamped
history remains visible throughout and a sent record cannot accidentally send
again; revisions start as a separate draft.

PDF bytes are AES-GCM encrypted before IndexedDB storage. Decryption occurs only
for local review, download, or an explicit portable backup. The app includes
named deletion confirmation, JSON export/import with re-encryption on restore,
empty/error/offline states, a hand-written service worker and install manifest,
update notification, direct `/privacy/` and `/terms/` pages, and responsive
keyboard-accessible layouts down to 390 px.

The free tier supports five active gates. The $29 one-time Pro unlock adds
unlimited active gates through the required Sociobot checkout, returned-license
storage, once-daily verification cache, offline optimistic verdict, revoked
license handling, and paste-to-restore flow. No product ID or payment provider
is embedded; the public product slug is used.

The paper-cut diorama system, image prompt, visual review, and provenance are in
`.factory/design.md`. Generated source and prompt metadata are retained in
`assets/src/`; optimized WebP variants are 15 KB and 51 KB.

## Run and verify

```sh
npm install
npm test
npm run build
npm run preview
```

Production build command: `npm run build`

Static output: `./dist/` (`dist/index.html` is at its root)

Verification completed 2026-08-28:

- `npm test`: 3 Vitest assertions and 7 Playwright cases passed; one duplicate
  mobile PDF case intentionally skipped because Chromium covers file crypto,
  while both desktop and Pixel-sized projects cover the full link workflow.
- Playwright covers create, reload, approve, email release, sent sealing,
  AES-GCM ciphertext presence, PDF download, direct legal routes, 390 px
  overflow, and explicit `context.setOffline(true)` reload plus mutation.
- Axe integration: zero violations on empty, populated desk, privacy, and terms
  screens in desktop/mobile projects.
- Factory `verify-url.sh`: HTTP 200, title/lang/main present, exactly one h1,
  no missing image alt text, no unlabeled buttons, and zero console errors.
- Lighthouse 12.8.2 mobile: Performance **99**, Accessibility **100**, Best
  Practices **100**, SEO **100**. FCP 0.9 s, LCP 1.2 s, TBT 90 ms, CLS 0.
- Production payload: initial JS 41.9 KB raw / 13.4 KB gzip; CSS 20.8 KB raw /
  5.5 KB gzip; mobile hero 15 KB. All are below the required budgets.
- `npm audit`: zero known dependency vulnerabilities.

## Known gaps and operational next steps

- Approval is a local handoff record, not authenticated identity, a legal
  signature, accounting compliance, or multi-device collaboration. This is
  disclosed in the form, privacy page, terms, and README.
- A PDF cannot be attached automatically through `mailto:`. The release step
  downloads the approved PDF and clearly asks the user to attach it; sending
  remains intentionally under user control.
- Clearing browser site data removes both encrypted documents and their local
  key. Users should keep normal business records and explicit exports.
- Before public launch, the factory must register the
  `invoice-approval-gate` product at the stated $29 one-time price and confirm
  the return URL. Staging can set `VITE_BILLING_API_BASE` to the pilot API.
- Deployment/DNS/infra were not changed from this repository, per the work
  order.
