# Send Gate visual system

## Thesis: the paper checkpoint

Send Gate is a **paper-cut diorama** of the moment a document stops at a desk
before it reaches a client. Sheets, tabs, a brass pin and a dark approval slot
make the workflow tangible: documents move through a physical gate, rather
than disappearing into generic accounting software. Decoration is used only
to reinforce the central promise — nothing leaves without a second look.

The interface is intentionally single-mode. A warm studio-paper background is
painted explicitly, with dark ink surfaces and a coral action tab. This focused
art direction avoids the false equivalence of a dark theme: the product is a
document desk, and the paper metaphor is the navigation aid.

## Palette

| Token | Value | Use |
| --- | --- | --- |
| `paper` | `#F4EEDC` | warm background, like recycled invoice stock |
| `paper-raised` | `#FFFDF6` | active sheets and fields |
| `ink` | `#17211D` | primary copy, ≥ 12:1 on paper |
| `ink-soft` | `#4E5D55` | secondary copy, ≥ 6:1 on paper |
| `forest` | `#174C3C` | primary controls and approved state |
| `forest-deep` | `#0D352A` | pressed controls and footer |
| `coral` | `#D9573F` | attention tabs, reject/destructive accent |
| `amber` | `#B66A08` | awaiting-review state; paired with label/icon |
| `sage` | `#C8D4B4` | approved paper layers |
| `rule` | `#C6BEA8` | dividers and inactive outlines |

Coral is never the only indicator of danger, and status always includes a word
and symbol. Focus uses a 3 px coral ring with a 2 px paper offset.

## Type

- Display: Georgia, `Times New Roman`, serif. The editorial shapes evoke a
  careful proofing desk without adding a font download.
- Utility/body: Inter-compatible system stack (`ui-sans-serif`, `system-ui`,
  Segoe UI, sans-serif). It keeps amounts and forms crisp and fast.
- Scale: 14 / 16 / 18 / 22 / 32 / clamp(40–64) px. Body is never below 16 px.
  Amounts and audit times use tabular figures.

No remote fonts or third-party runtime resources are used.

## Spacing and shape

An 8 px base rhythm with 4 px micro-spacing: 4, 8, 12, 16, 24, 32, 48, 64.
Sheets use slightly asymmetric 2–6 px corner radii, clipped corners and hard
offset shadows (no blurry dashboard-card soup). Content measure is 72ch. Touch
targets are at least 44 px with 8 px between targets.

Desktop is a two-column desk: a narrow workflow rail beside the active sheet.
At ≤760 px the rail becomes a horizontal state strip and secondary detail
stacks below the document. The hero illustration is dropped from the compact
workspace, preserving forms and actions at 390 px.

## Interaction grammar

- **Place:** creating a gate settles a new sheet onto the desk.
- **Pass:** approving moves the sheet through the green gate and reveals the
  send handoff.
- **Return:** rejecting adds a coral return tab and keeps the draft editable.
- **Seal:** marking sent stamps the audit record; it never sends by itself.
- Destructive deletion names the document and requires confirmation.

Errors live next to their fields and are announced. Toasts confirm persistence,
offline status and app updates. Empty and offline views always offer a next
step. Keyboard order follows the physical desk from navigation to document to
action.

## Motion policy

UI transitions last 180–240 ms and only animate opacity/transform. New sheets
rise 6 px from the document stack; status tabs slide from the edge; the hero
gate makes one short entrance and never loops. Under
`prefers-reduced-motion: reduce`, transforms and smooth scrolling are removed
and state changes are instant/opacity-only.

## Original asset plan and provenance

- Hero: an original generated still-life of a miniature paper invoice paused
  at a green paper gate, with a coral approval tab and layered studio shadows.
  It explains the product promise on the empty/landing state.
- Icons, status marks and the wordmark are hand-authored CSS/SVG geometry in
  the repository; no icon pack or brand asset is used.
- PWA icons are hand-authored from the gate-and-page mark.

### Generation prompt sheet

Subject: a blank invoice sheet visibly paused before a small approval gate.
World: handcrafted tabletop diorama for a careful small-business office.
Materials: layered cut paper, card stock, tiny brass fastener, subtle fibers.
Light/lens: warm raking morning light, long crisp shadows, slight isometric
macro view. Palette words: recycled cream, deep forest ink, vermilion coral,
muted sage, warm brass. Composition: central gate, clear negative space, no
people. Negative list: text, letters, numbers, logos, watermark, currency
symbols, hands, photorealistic electronics, gradients, glossy 3D plastic,
clutter, torn edges.

Assets: `public/assets/send-gate-diorama-640.webp` and
`public/assets/send-gate-diorama-1280.webp`, with the PNG source in
`assets/src/`. The responsive image renders at its intrinsic 3:2 proportion;
it is never stretched or center-cropped.
Prompt: “Handcrafted paper-cut diorama, a clean blank invoice sheet paused at
a small deep forest-green checkpoint gate before an outgoing paper tray, coral
approval tab, layered recycled cream cardstock, tiny brass fastener, warm
raking morning studio light with crisp dimensional shadows, slight isometric
macro lens, restrained editorial composition, generous negative space,
meticulous paper fibers, no people, no text, no letters, no numbers, no logos,
no watermark, no currency symbols, no hands, no screens, no glossy plastic.”

Generated with the Factory Azure OpenAI image deployment (`factory-image`) on
2026-08-28. Original asset made for Send Gate; no third-party artwork.
