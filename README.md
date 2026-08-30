# Send Gate

Approve quotes and invoices before they go out. Send Gate is for small agencies
and trade teams that need a recorded second review before a client handoff.
Try it in one click at [`/demo`](https://invoice-approval-gate.sociobot.in/demo):
three sample gates load in an isolated browser namespace, and nothing is saved
to a real desk.

Live product: <https://invoice-approval-gate.sociobot.in>

## What it does

- The email draft appears only after a reviewer records an approval.
- A sent handoff cannot be sent again from the same gate.
- PDFs use browser AES-GCM encryption before local IndexedDB storage.
- Free workflow data stays in the browser and makes same-origin requests only.
- The free desk has five active gates. Pro is $29 once for unlimited active
  gates.
- Export creates a portable JSON backup. It can contain readable PDF data, so
  keep the downloaded file private.
- The installable PWA works offline after its first visit.

Every statement above has an executable sandbox check in
[`.factory/claims.json`](.factory/claims.json). Run all of them with
`npm run test:claims`.

## Run and verify

Requires Node.js 22 or a compatible current LTS release.

```sh
npm ci --include=dev
npm run dev
npm run typecheck
npm run test:unit
npm run test:claims
npm test
npm run build
npm run preview
```

`npm test` runs Vitest and Playwright 1.58.2 in desktop and exact 390 px mobile
viewports. It covers accessibility, the approval handoff, import protection,
encryption, keyboard/mobile behavior, legal routes, metadata, and offline
reload. `npm run test:claims` runs the complete one-click demo claim suite.

The exact production build command is:

```sh
npm run build
```

It writes the static deployment to `./dist/`, with `dist/index.html` at the
root and direct `demo/`, `privacy/`, `terms/`, and designed `404.html` entry
points.

## Configuration and deployment

The production billing API defaults to `https://api.sociobot.in/api/v1`. For a
registered staging product, set this at build time:

```sh
VITE_BILLING_API_BASE=https://pilot-api.sociobot.in/api/v1 npm run build
```

No product ID or secret is stored in the repository; billing uses the public
`invoice-approval-gate` slug. Deploy only the contents of `dist/`. The included
`staticwebapp.config.json` applies the product's CSP, anti-framing, permissions,
manifest MIME, update, and immutable-asset cache policy on Azure Static Web
Apps. The host must serve HTTPS so Web Crypto and service workers are available.

## Privacy and limitations

Normal workflow data never leaves the browser. The local encryption key lives
in this origin’s local storage, separate from encrypted PDF bytes in IndexedDB.
Clearing site data removes both. Do not treat a reviewer name as identity
verification or legal approval. Keep normal business records and make backups
where appropriate. See the in-product `/privacy` and `/terms` pages.

The visual direction and generated-asset provenance are in
[`.factory/design.md`](.factory/design.md). The demo contract is in
[`.factory/demo.md`](.factory/demo.md), and release evidence is in
[`.factory/handoff.md`](.factory/handoff.md).

## License

MIT — see [LICENSE](LICENSE).
