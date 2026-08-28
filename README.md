# Send Gate

Send Gate is a local-first approval checkpoint for small agencies and trade
businesses. Add a quote or invoice PDF (or a secure share link), name the
client and reviewer, and record an approve/return decision before the final
email handoff is released. It is deliberately not an invoice generator,
ledger, payment processor, e-signature tool, or CRM.

Live product: <https://invoice-approval-gate.sociobot.in>

## What v1 includes

- A complete draft → review → approved/returned → sent workflow.
- A user-controlled `mailto:` draft only after approval; PDFs are downloaded
  for the user to attach, never sent automatically.
- An immutable-style timestamped audit trail and sealed sent state to reduce
  duplicate sends.
- PDF encryption with browser Web Crypto (AES-GCM) before IndexedDB storage.
- Explicit per-gate deletion plus portable JSON export/import. Portable exports
  are intentionally readable so they can be restored elsewhere and must be
  kept private.
- Installable PWA shell, offline creation/review, and offline legal pages.
- A genuinely useful free desk with five active gates. The optional $29
  one-time Pro license unlocks unlimited active gates through the Sociobot
  billing API; no payment provider is embedded here.

## Run and verify

Requires Node.js 22 or a compatible current LTS release.

```sh
npm ci --include=dev
npm run dev
npm run typecheck
npm test
npm run build
npm run preview
```

`npm test` runs Vitest and Playwright 1.58.2 in desktop and exact 390 px mobile
viewports. Coverage includes axe, the complete approval handoff, approval
withdrawal after edits, atomic import rejection, encrypted PDF persistence and
restore, input/file recovery, licensing feedback, keyboard/touch geometry,
direct legal routes, and an explicit offline reload/mutation test.

The exact production build command is:

```sh
npm run build
```

It writes the static deployment to `./dist/`, with `dist/index.html` at the
root and direct `privacy/` and `terms/` entry points.

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
in this origin’s local storage, separate from encrypted PDF bytes in IndexedDB;
clearing site data removes both. Reviewer names are a handoff record, not
identity verification or legal approval. Keep normal business records and make
backups where appropriate. See the in-product `/privacy` and `/terms` pages.

The visual direction and generated-asset provenance are in
[`.factory/design.md`](.factory/design.md). Release verification and known gaps
are in [`.factory/handoff.md`](.factory/handoff.md).

## License

MIT — see [LICENSE](LICENSE).
