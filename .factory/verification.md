# Independent product verification — FAIL

**Candidate:** `035743eeec225fc1f9c0e19895ef359fcd9a8633`

**Live URL:** <https://invoice-approval-gate.sociobot.in>

**Verified:** 2026-08-28 UTC

**Work order:** `invoice-approval-gate-verify-1`

## Verdict

**FAIL.** The candidate builds, passes its supplied tests, is deployed byte for
byte, works offline, meets its performance budgets, and has no axe serious or
critical findings in the tested normal screens. It is not releasable because a
normal approved-record edit keeps the record approved and immediately updates
the released email handoff. That defeats the product's central promise that the
final recipient, amount, and source are checked before send.

A second high-severity recovery defect allows a structurally incomplete backup
to replace the user's current gates and then makes the approval desk render
blank with an uncaught `Invalid time value` error.

No product code was modified during verification.

## Candidate and deployment identity

- The source checkout was clean and detached at the full candidate SHA.
- Clean install used Node `22.23.2`, npm `10.9.8`, and
  `npm ci --include=dev` against the committed lockfile.
- The live HTML referenced the candidate's exact generated asset names:
  `index-CMGEe7I4.js` and `index-DSq7CtSe.css`.
- Candidate and live SHA-256 digests matched for every checked artifact:
  `index.html`, JS, CSS, `sw.js`, manifest, offline page, both legal entry
  points, SVG/PNG icons, and both WebP artwork sizes.

| Artifact | Candidate and live SHA-256 |
| --- | --- |
| `index.html` | `e05a5ce5a8a5b8a0ebf1fd011ea6028db0d1f022db5036045f13f9b8fae870d8` |
| JS | `42cbc8270aeaf9d8e01b93babb78b6611d5989f622cbf8661af154184281ddf0` |
| CSS | `8d33415d6e7f027bd69c33e87ea03625436ae68f209cf587603924235dc2034b` |
| `sw.js` | `24bc8621c30ecfd0f679a343678403a8b54683afda9cf106b6a84dd6723db595` |
| manifest | `9525a497a32ffa191fcab6564a893e997e1346e8e47ce88598af2f893cc193ab` |

This is fresh evidence that the deployment is the candidate; there is no
deployment-only blocker.

## Local quality gates

| Check | Result | Evidence |
| --- | --- | --- |
| Install | PASS | `npm ci --include=dev`; 60 packages installed; audit found 0 vulnerabilities |
| Unit/integration/e2e | PASS | `npm test`; 3 Vitest assertions and 7 Playwright cases passed; 1 intentional duplicate mobile PDF case skipped |
| Types | PASS | strict `tsc --noEmit` runs inside the build |
| Lint | N/A | no lint command or linter is present in the repository |
| Exact production build | PASS | `npm run build`; `dist/` produced successfully |
| Dependency audit | PASS | `npm audit --json`; 0 findings at every severity |
| Diff hygiene | PASS | candidate worktree remained free of tracked changes |

Production build output:

- JS: 42,556 B raw / 13.72 kB gzip
- CSS: 20,775 B raw / 5.52 kB gzip
- mobile artwork: 14,878 B
- desktop artwork: 51,364 B
- no downloaded fonts and no runtime dependencies

## End-to-end and input coverage

### Passed behavior

- Link workflow: create draft, persist/reload, submit, return with required
  comment, edit, resubmit, approve, expose `mailto:`, and seal as sent.
- PDF workflow: a PDF was encrypted to an IndexedDB `ArrayBuffer`, the local
  key was stored separately, and the approved bytes downloaded with the
  original filename.
- Before approval there was no email-draft link; after approval the draft was
  recipient-specific and remained user-controlled.
- Amount `0` rendered as `$0.00`; negative amount was rejected by form
  validity and could be corrected.
- The sixth active gate was blocked at the free limit of five.
- A PDF of 15 MiB + 1 B produced the documented size error and re-enabled the
  submit control.
- Blank required fields, invalid email/number values, and invalid links showed
  errors without a console error on the normal recovery path.
- Deletion confirmation could be cancelled; accepting deletion removed the
  gate.
- A valid portable PDF backup exported readable bytes with the promised
  warning, restored after deletion, and produced different ciphertext after
  device re-encryption.
- Direct `/privacy/` and `/terms/` loads returned 200 and rendered one `h1` and
  one `main` each.

### Failed behavior

See the defect register below. In addition to the release blocker, independent
checks confirmed empty trimmed required values, incomplete file validation,
an unusable oversized-file recovery choice, and incomplete invalid-license
feedback.

## PWA, persistence, and update checks

- Manifest parsed through Chromium with no manifest parser errors and includes
  192/512/maskable icons, standalone display, versioned start URL, and matching
  colors.
- Service worker activated and controlled the page. Cache names were
  `send-gate-v1-shell` and `send-gate-v1-runtime`.
- Live 390 px check: a saved gate survived an explicit offline reload and
  could move from draft to awaiting review while offline.
- Live update check: registering a changed service-worker URL produced the
  in-app “A fresh version is ready” toast; “Update now” activated the waiting
  worker and changed the controller without a page error.
- Valid user data survived normal refresh/tab lifecycle checks. Clearing site
  data remains intentionally destructive and is disclosed.

## Accessibility and responsive checks

- Playwright axe: zero violations on supplied empty, populated, privacy, and
  terms screens in desktop/mobile projects.
- Independent axe run on the live desktop and 390 px empty screen: zero total
  violations, therefore zero serious/critical findings.
- Factory `verify-url.sh`: PASS; HTTP 200, title, `lang=en`, one `h1`, main
  landmark, complete image alt text, labeled buttons, and zero console/page
  errors on load.
- Keyboard-only create/submit/approve flow passed with Enter/Space and no
  keyboard trap. Focus was visibly rendered as a 3 px coral outline.
- Reduced-motion emulation changed animation and transition duration to
  `0.01ms` and document scroll behavior to `auto`.
- Both empty and form screens had `scrollWidth == innerWidth == 390`.
- Manual/geometry checks found the skip-link and touch-target issues listed
  below.

## Privacy, requests, and browser policies

- A fresh free-use load made no cross-origin requests. No analytics, remote
  fonts, third-party scripts, or trackers were found in source or runtime
  traffic.
- Normal document/link data stayed in IndexedDB. The only tested cross-origin
  request was an explicit license verification to the required Sociobot API;
  it contained the license token but no gate/document fields.
- The checkout link correctly targets
  `https://api.sociobot.in/api/v1/products/invoice-approval-gate/checkout`.
- Live responses provide HTTPS, HSTS, `nosniff`, and
  `strict-origin-when-cross-origin`.
- Live responses do not provide Content-Security-Policy,
  frame-embedding protection (`frame-ancestors` or `X-Frame-Options`),
  Permissions-Policy, or COOP. The HSTS `preload` declaration uses
  `max-age=10886400`, below the normal preload-list minimum.
- All tested files, including hashed JS/CSS/images, used
  `Cache-Control: public, must-revalidate, max-age=30`; hashed assets are not
  long-lived immutable as required by the performance contract.
- `manifest.webmanifest` is served as `application/octet-stream`; Chromium did
  still parse it without errors.

## Performance

Lighthouse 12.8.2 against the live URL with its mobile defaults:

| Category/metric | Result |
| --- | ---: |
| Performance | 100 |
| Accessibility | 100 |
| Best Practices | 100 |
| SEO | 100 |
| FCP | 952 ms |
| LCP | 1,004 ms |
| TBT | 28.5 ms |
| CLS | 0 |
| Max potential FID | 110 ms |
| Initial transfer | 37,412 B |
| JS transfer | 14,040 B |
| CSS transfer | 5,888 B |
| Image transfer | 14,944 B |

The static bundle, LCP, blocking-time proxy, and layout-shift budgets pass.
Field INP is not available from a one-off lab run.

## Defect register

### Critical — SG-V01: editing an approved gate does not require reapproval

1. Create a link gate for `one@example.test`, amount `100`, source `/one`.
2. Submit and approve it.
3. Choose **Edit details** and change the recipient to `two@example.test`, the
   amount to `200`, and the source to `/two`.
4. Save.

Observed IndexedDB state was `status: approved` with history
`created → submitted → approved → edited`. The released `mailto:` immediately
used `two@example.test`, `$200.00`, and `/two`. Expected: any material edit
after approval returns the gate to draft/awaiting and removes the send handoff
until the changed values are reviewed. This violates the core acceptance job.

### High — SG-V02: incomplete backup validation can replace data and blank the desk

1. Create an existing local gate.
2. Import a correctly identified version-1 backup whose gate-level fields are
   present but whose history event has `at: "not-a-date"`.
3. Confirm replacement and return to **Approval desk**.

Observed: the original gate was replaced in IndexedDB, the route changed to
`/`, the settings screen remained stale, and `pageerror` reported
`Invalid time value`. Loading `/` directly left `#app` empty with the same
error. Expected: validate every imported audit/document field before the
replacement transaction; reject the file and preserve existing data.

### Medium — SG-V03: whitespace-only required identity fields are accepted

Gate name, client name, and reviewer name containing only spaces passed HTML
validity, were trimmed to empty strings, and persisted. The desk then rendered
an unnamed gate with an empty document heading, client, and reviewer. Expected:
reject post-trim empty values and focus/announce the first affected field.

### Medium — SG-V04: approval comment is optional despite the brief

The candidate accepts **Approve to send** with an empty decision comment and
records “Approved with no additional comment.” The researched contract calls
for one approve/reject comment. Return comments are correctly required.

### Medium — SG-V05: flagship artwork is stretched and cropped into an unclear blank sheet

The image has 1280×853 intrinsic/HTML dimensions while CSS sets only
`width:100%` plus `aspect-ratio`, without `height:auto`. At 1440 px the live
rendered box measured about 655×853; at 390 px it measured about 364×864 even
though the mobile source is 640×427. `object-fit: cover` consequently crops to
the mostly blank center and creates a very tall empty region. This does not
match the design thesis's explanatory checkpoint scene.

### Medium — SG-V06: suggested oversized-PDF recovery remains blocked

After selecting a 15 MiB + 1 B PDF, the error says to use a smaller PDF or a
secure link. Switching to **Copied share link** and entering a valid HTTPS URL
repeats the same PDF-size error because the hidden file input is still processed
for link gates. Cancelling/reloading or choosing another file is required.

### Medium — SG-V07: a non-PDF payload named `.pdf` is accepted

A `text/plain` file named `not-a-pdf.pdf` was accepted, encrypted, and stored
with MIME `text/plain`. Expected: confirm PDF content/type before treating the
file as a reviewable PDF, with a clear recoverable error.

### Medium — SG-V08: skip-link focus and mobile target baseline are incomplete

The skip link receives a visible focus ring and changes the URL to `#main`, but
focus becomes `BODY` instead of moving to `main`. On 390 px the brand link is
32 px high and footer Privacy/Terms links are 20 px high, below the attached
44×44 target baseline.

### Medium — SG-V09: response policy and immutable cache baseline is incomplete

The live host lacks CSP/frame embedding controls and serves all hashed assets
with a 30-second revalidating policy rather than long-lived immutable caching.
This is deployment evidence, but it remains part of the shipped product's
acceptance contract.

### Low — SG-V10: invalid returned license never leaves “Checking” state

Visiting with `?license=qa-verification-invalid-token` stripped the token from
the URL and received HTTP 200 `{valid:false, reason:"invalid"}` from the
Sociobot API, but the page continued to say “License received. Checking your
unlock…”. Expected: show the inactive-license recovery message and restore
purchase control after the response.

## Release recommendation

Do not release this candidate. At minimum, fix SG-V01 and SG-V02, add regression
coverage for both, then address the remaining product-contract issues and run a
fresh independent verification against the new candidate and deployment.
