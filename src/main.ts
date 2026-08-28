import './styles.css';
import type { Gate, GateKind, GateStatus, SourceType } from './types';
import {
  deleteGate,
  decryptDocument,
  encryptDocument,
  encryptionSupported,
  getGates,
  MAX_FILE_BYTES,
  makeExport,
  putGate,
  readExport,
  replaceAllGates,
} from './secure-store';
import {
  checkoutUrl,
  hasLicense,
  isProFromCache,
  PRICE_LABEL,
  removeLicense,
  saveLicense,
  storeReturnedLicense,
  verifyLicense,
} from './billing';
import { emailDraftUrl, escapeHtml as e, formatDate, formatMoney, newAudit, safeHttpUrl, sendNote, statusCopy } from './utils';

type AppView = 'desk' | 'new' | 'settings';

const FREE_ACTIVE_LIMIT = 5;
class SendGateApp {
  private readonly root: HTMLElement;
  private gates: Gate[] = [];
  private selectedId: string | null = null;
  private view: AppView = 'desk';
  private editing = false;
  private pro = isProFromCache();
  private storageError = '';
  private notice = '';
  private updateWorker: ServiceWorker | null = null;

  constructor(root: HTMLElement) {
    this.root = root;
    this.root.addEventListener('click', (event) => void this.onClick(event));
    this.root.addEventListener('change', (event) => void this.onChange(event));
    this.root.addEventListener('input', (event) => this.onInput(event));
    this.root.addEventListener('submit', (event) => void this.onSubmit(event));
    document.querySelector<HTMLAnchorElement>('.skip-link')?.addEventListener('click', (event) => this.skipToMain(event));
    window.addEventListener('popstate', () => this.routeFromUrl());
    window.addEventListener('online', () => this.render());
    window.addEventListener('offline', () => this.render());
  }

  async init(): Promise<void> {
    const returned = storeReturnedLicense();
    this.routeFromUrl(false);
    try {
      this.gates = await getGates();
      this.selectedId = this.selectedId ?? this.gates[0]?.id ?? null;
    } catch (error) {
      this.storageError = error instanceof Error ? error.message : 'Private local storage could not be opened.';
    }
    if (returned) this.notice = 'License received. Checking your unlock…';
    this.render();
    if (hasLicense()) {
      const result = await verifyLicense(returned);
      const wasPro = this.pro;
      this.pro = result.valid;
      if (returned && result.valid) this.notice = 'Pro unlocked on this device.';
      if (returned && !result.valid) {
        this.notice = result.offline
          ? 'License saved, but it could not be checked offline. Connect and restore it from Settings.'
          : 'That license is not active for Send Gate. Free features and purchase options remain available.';
      } else if (wasPro && !result.valid && !result.offline) {
        this.notice = 'License no longer active. Free features remain available.';
      }
      this.render();
    }
    await this.registerServiceWorker();
  }

  private routeFromUrl(render = true): void {
    const params = new URLSearchParams(location.search);
    this.view = params.get('view') === 'settings' ? 'settings' : params.get('new') === '1' ? 'new' : 'desk';
    const requested = params.get('gate');
    if (requested) this.selectedId = requested;
    this.editing = params.get('edit') === '1';
    if (render) this.render();
  }

  private go(url: string): void {
    history.pushState({}, '', url);
    this.routeFromUrl();
    window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }

  private get selected(): Gate | undefined {
    return this.gates.find((gate) => gate.id === this.selectedId);
  }

  private render(): void {
    const path = location.pathname.replace(/\/$/, '') || '/';
    if (path === '/privacy' || path === '/terms') {
      this.root.innerHTML = this.legalPage(path.slice(1) as 'privacy' | 'terms');
      document.title = `${path === '/privacy' ? 'Privacy' : 'Terms'} — Send Gate`;
      return;
    }
    document.title = 'Send Gate — Invoice approval checkpoint';
    const offline = !navigator.onLine;
    this.root.innerHTML = `
      <header class="site-header">
        <a class="brand" href="/" data-route="/" aria-label="Send Gate home">
          <span class="brand-mark" aria-hidden="true"><span></span></span>
          <span>Send Gate</span>
        </a>
        <nav aria-label="Primary navigation">
          <a href="/" data-route="/" ${this.view === 'desk' || this.view === 'new' ? 'aria-current="page"' : ''}>Approval desk</a>
          <a href="/?view=settings" data-route="/?view=settings" ${this.view === 'settings' ? 'aria-current="page"' : ''}>Settings</a>
        </nav>
        <span class="local-pill"><span aria-hidden="true">${offline ? '○' : '●'}</span> ${offline ? 'Offline' : 'On this device'}</span>
      </header>
      ${offline ? `<div class="offline-strip" role="status"><strong>Offline.</strong> Saved gates still work; email, source links, and license checks need a connection.</div>` : ''}
      ${this.notice ? `<div class="notice-strip" role="status"><span>${e(this.notice)}</span><button class="text-button" data-action="dismiss-notice">Dismiss</button></div>` : ''}
      ${this.storageError ? this.storageFailure() : this.view === 'settings' ? this.settingsPage() : this.view === 'new' ? this.gateForm() : this.deskPage()}
      <footer class="site-footer">
        <p><span class="mini-mark" aria-hidden="true">▰</span> Private by default. No account, analytics, or remote document upload.</p>
        <nav aria-label="Legal"><a href="/privacy" data-route="/privacy">Privacy</a><a href="/terms" data-route="/terms">Terms</a></nav>
        <p class="art-note">Original AI-assisted paper artwork, made for Send Gate.</p>
      </footer>
      <div class="toast-region" aria-live="polite" aria-atomic="true">
        ${this.updateWorker ? `<div class="toast"><span>A fresh version is ready.</span><button data-action="update-app">Update now</button></div>` : ''}
      </div>`;
  }

  private storageFailure(): string {
    return `<main id="main" class="error-page" tabindex="-1">
      <p class="eyebrow">Local storage unavailable</p>
      <h1>The approval desk could not open.</h1>
      <p>${e(this.storageError)}</p>
      <p>Use a current browser outside private-browsing restrictions, or check that storage is allowed for this site.</p>
      <button class="primary" data-action="retry-storage">Try again</button>
    </main>`;
  }

  private deskPage(): string {
    if (!this.gates.length) return this.emptyDesk();
    const selected = this.selected ?? this.gates[0];
    if (!this.selectedId) this.selectedId = selected.id;
    return `<main id="main" class="desk-main" tabindex="-1">
      <div class="page-heading">
        <div><p class="eyebrow">Approval desk · ${this.gates.length} ${this.gates.length === 1 ? 'gate' : 'gates'}</p><h1>What is waiting at the gate?</h1></div>
        <button class="primary paper-button" data-action="new-gate"><span aria-hidden="true">＋</span> New approval gate</button>
      </div>
      <div class="desk-layout">
        ${this.gateRail(selected.id)}
        ${this.gateDetail(selected)}
      </div>
    </main>`;
  }

  private emptyDesk(): string {
    return `<main id="main" class="empty-main" tabindex="-1">
      <section class="hero-copy">
        <p class="eyebrow">A second pair of eyes, before send</p>
        <h1>Nothing leaves without a second look.</h1>
        <p class="lede">Put a quote or invoice at a simple approval checkpoint. The final email handoff stays locked until your reviewer says it is ready.</p>
        <div class="hero-actions">
          <button class="primary paper-button" data-action="new-gate">Create your first gate <span aria-hidden="true">→</span></button>
          <span>No account · works offline · PDFs encrypted locally</span>
        </div>
        <ol class="how-strip" aria-label="How Send Gate works" tabindex="0">
          <li><span>1</span><strong>Place</strong><small>Add a PDF or link</small></li>
          <li><span>2</span><strong>Check</strong><small>Approve or return</small></li>
          <li><span>3</span><strong>Release</strong><small>Open the email draft</small></li>
        </ol>
      </section>
      <figure class="hero-art">
        <picture>
          <source media="(max-width: 760px)" srcset="/assets/send-gate-diorama-640.webp" />
          <img src="/assets/send-gate-diorama-1280.webp" width="1280" height="853" alt="A miniature blank paper sheet paused at a forest-green approval gate before an outgoing tray" decoding="async" fetchpriority="high" />
        </picture>
        <figcaption>One small checkpoint between “finished” and “sent.”</figcaption>
      </figure>
    </main>`;
  }

  private gateRail(selectedId: string): string {
    return `<aside class="gate-rail" aria-label="Approval gates">
      <div class="rail-head"><strong>Gate stack</strong><span>${this.pro ? 'Pro · unlimited' : `${this.activeCount()}/${FREE_ACTIVE_LIMIT} active`}</span></div>
      <ol class="gate-list">
        ${this.gates.map((gate) => {
          const status = statusCopy[gate.status];
          return `<li><button class="gate-tab ${gate.id === selectedId ? 'is-active' : ''}" data-action="select-gate" data-id="${e(gate.id)}" ${gate.id === selectedId ? 'aria-current="true"' : ''}>
            <span class="status-dot status-${gate.status}" aria-hidden="true">${status.symbol}</span>
            <span><strong>${e(gate.title)}</strong><small>${e(gate.recipientName)} · ${e(formatMoney(gate.amount, gate.currency))}</small></span>
            <span class="gate-state">${status.label}</span>
          </button></li>`;
        }).join('')}
      </ol>
    </aside>`;
  }

  private gateDetail(gate: Gate): string {
    const status = statusCopy[gate.status];
    return `<article class="document-sheet sheet-${gate.status}">
      <div class="sheet-tab status-${gate.status}">${status.symbol} ${status.label}</div>
      <header class="document-head">
        <div><p class="overline">${e(gate.kind)} · ${e(gate.sourceType === 'pdf' ? 'encrypted PDF' : 'share link')}</p><h2>${e(gate.title)}</h2></div>
        <strong class="amount">${e(formatMoney(gate.amount, gate.currency))}</strong>
      </header>
      ${this.progress(gate.status)}
      <dl class="document-meta">
        <div><dt>Client</dt><dd>${e(gate.recipientName)}<small>${e(gate.recipientEmail)}</small></dd></div>
        <div><dt>Reviewer</dt><dd>${e(gate.approver)}</dd></div>
        <div><dt>Source</dt><dd>${gate.document ? `${e(gate.document.name)}<small>${this.fileSize(gate.document.size)} · encrypted here</small>` : `<a href="${e(safeHttpUrl(gate.shareLink ?? '') ?? '#')}" target="_blank" rel="noopener">Open source link <span aria-hidden="true">↗</span></a>`}</dd></div>
        <div><dt>Last change</dt><dd>${e(formatDate(gate.updatedAt))}</dd></div>
      </dl>
      ${this.statusAction(gate)}
      ${this.auditHistory(gate)}
      <div class="secondary-actions">
        ${gate.status !== 'sent' && gate.status !== 'awaiting' ? `<button class="text-button" data-action="edit-gate">Edit details</button>` : ''}
        <button class="text-button danger-text" data-action="delete-gate">Delete gate</button>
      </div>
    </article>`;
  }

  private progress(status: GateStatus): string {
    const position = status === 'draft' || status === 'rejected' ? 0 : status === 'awaiting' ? 1 : status === 'approved' ? 2 : 3;
    const labels = ['Prepared', 'Reviewed', 'Released', 'Recorded'];
    return `<ol class="progress" aria-label="Approval progress">${labels.map((label, index) => `<li class="${index <= position ? 'done' : ''}" ${index === position ? 'aria-current="step"' : ''}><span aria-hidden="true">${index < position ? '✓' : index + 1}</span><small>${label}</small></li>`).join('')}</ol>`;
  }

  private statusAction(gate: Gate): string {
    if (gate.status === 'draft' || gate.status === 'rejected') {
      return `<section class="action-block ${gate.status === 'rejected' ? 'returned-block' : ''}" aria-labelledby="action-heading">
        <p class="action-kicker">${gate.status === 'rejected' ? '↩ Changes requested' : 'Ready for a second look?'}</p>
        <h3 id="action-heading">${gate.status === 'rejected' ? e(gate.decisionComment || 'The reviewer returned this gate.') : `Hand this to ${e(gate.approver)}.`}</h3>
        <p>${gate.status === 'rejected' ? 'Edit the source or details, then put it back into review.' : 'Submitting locks the send handoff until a decision is recorded.'}</p>
        <button class="primary" data-action="submit-review">Submit for approval <span aria-hidden="true">→</span></button>
      </section>`;
    }
    if (gate.status === 'awaiting') {
      return `<section class="action-block review-block" aria-labelledby="action-heading">
        <p class="action-kicker">◷ Send locked</p>
        <h3 id="action-heading">Review for ${e(gate.approver)}</h3>
        <p>Check the document and client details above. Then record one clear decision comment.</p>
        <div class="document-actions">
          <button class="secondary" data-action="open-source">${gate.document ? 'Open PDF' : 'Open source link'} <span aria-hidden="true">↗</span></button>
        </div>
        <label for="review-comment">Decision comment <span class="required-note">(required)</span></label>
        <textarea id="review-comment" rows="3" maxlength="500" required aria-describedby="review-error" placeholder="What did you check, or what needs changing?"></textarea>
        <div class="decision-actions">
          <button class="approve-button" data-action="decide" data-decision="approved"><span aria-hidden="true">✓</span> Approve to send</button>
          <button class="return-button" data-action="decide" data-decision="rejected"><span aria-hidden="true">↩</span> Return for changes</button>
        </div>
        <p id="review-error" class="field-error" role="alert"></p>
        <button class="text-button" data-action="recall-review">Move back to draft</button>
      </section>`;
    }
    if (gate.status === 'approved') {
      return `<section class="action-block release-block" aria-labelledby="action-heading">
        <p class="action-kicker">✓ Approved by ${e(gate.approver)}</p>
        <h3 id="action-heading">The send handoff is released.</h3>
        ${gate.decisionComment ? `<blockquote>“${e(gate.decisionComment)}”</blockquote>` : ''}
        <p>Send Gate does not send for you. Open a prefilled email, attach the approved PDF if needed, then return to mark the handoff sent.</p>
        <div class="release-actions">
          ${gate.document ? `<button class="secondary" data-action="download-document">Download approved PDF</button>` : ''}
          <button class="secondary" data-action="copy-note">Copy send note</button>
          <a class="primary link-button" href="${e(emailDraftUrl(gate))}" data-email-draft>Open email draft <span aria-hidden="true">↗</span></a>
        </div>
        <button class="seal-button" data-action="mark-sent"><span aria-hidden="true">◆</span> Mark handoff as sent</button>
      </section>`;
    }
    return `<section class="action-block sent-block" aria-labelledby="action-heading">
      <p class="action-kicker">◆ Handoff recorded</p>
      <h3 id="action-heading">Marked sent — no second send button.</h3>
      <p>The original gate is sealed to reduce duplicate sends. If the client needs a revision, create a new gate from these details.</p>
      <button class="secondary" data-action="reopen-copy">Create revised gate</button>
    </section>`;
  }

  private auditHistory(gate: Gate): string {
    return `<details class="audit"><summary>Approval record <span>${gate.history.length} ${gate.history.length === 1 ? 'event' : 'events'}</span></summary>
      <ol>${[...gate.history].reverse().map((item) => `<li><span class="audit-mark" aria-hidden="true"></span><div><strong>${e(this.auditLabel(item.action))}</strong><p>${e(item.detail)}</p><small>${e(item.actor)} · ${e(formatDate(item.at))}</small></div></li>`).join('')}</ol>
    </details>`;
  }

  private auditLabel(action: Gate['history'][number]['action']): string {
    return ({ created: 'Gate created', edited: 'Details edited', submitted: 'Submitted for review', approved: 'Approved', rejected: 'Returned for changes', returned: 'Moved back to draft', sent: 'Marked sent', reopened: 'Revision started' })[action];
  }

  private gateForm(): string {
    const gate = this.editing ? this.selected : undefined;
    const activeLimitReached = !this.pro && !gate && this.activeCount() >= FREE_ACTIVE_LIMIT;
    return `<main id="main" class="form-main" tabindex="-1">
      <div class="form-intro">
        <button class="back-button" data-action="back-desk"><span aria-hidden="true">←</span> Approval desk</button>
        <p class="eyebrow">${gate ? 'Edit the checkpoint' : 'New approval gate'}</p>
        <h1>${gate ? 'Adjust the sheet before review.' : 'Place a document at the gate.'}</h1>
        <p>${gate ? 'Edits are added to the local approval record.' : 'Add the final draft, who it is for, and the person who must check it.'}</p>
      </div>
      ${activeLimitReached ? `<section class="limit-sheet" aria-labelledby="limit-heading"><p class="eyebrow">Free desk full</p><h2 id="limit-heading">All five active slots are in use.</h2><p>Finish or delete a gate to keep using the free desk, or unlock unlimited active gates for ${PRICE_LABEL}.</p><button class="primary" data-action="open-settings">See the one-time unlock</button></section>` : this.gateFormFields(gate)}
    </main>`;
  }

  private gateFormFields(gate?: Gate): string {
    const source = gate?.sourceType ?? 'pdf';
    return `<form id="gate-form" class="gate-form" novalidate>
      <div class="form-section">
        <div class="section-number" aria-hidden="true">01</div>
        <div class="section-fields">
          <h2>The document</h2>
          <div class="field-grid two">
            <label>Type<select name="kind" required><option value="invoice" ${gate?.kind === 'invoice' ? 'selected' : ''}>Invoice</option><option value="quote" ${gate?.kind === 'quote' ? 'selected' : ''}>Quote</option></select></label>
            <label>Gate name<input name="title" required data-trim-required maxlength="80" value="${e(gate?.title ?? '')}" autocomplete="off" placeholder="e.g. Acme — August retainer" /></label>
          </div>
          <fieldset class="source-choice"><legend>Where is the document?</legend>
            <label><input type="radio" name="sourceType" value="pdf" ${source === 'pdf' ? 'checked' : ''} /><span><strong>PDF on this device</strong><small>Encrypted before local storage</small></span></label>
            <label><input type="radio" name="sourceType" value="link" ${source === 'link' ? 'checked' : ''} /><span><strong>Copied share link</strong><small>Only the link is stored here</small></span></label>
          </fieldset>
          <div id="pdf-field" ${source !== 'pdf' ? 'hidden' : ''}>
            <label for="document-file">${gate?.document ? 'Replace PDF (optional)' : 'PDF file'}<input id="document-file" name="document" type="file" accept="application/pdf,.pdf" ${!gate?.document && source === 'pdf' ? 'required' : ''} aria-describedby="file-help" /></label>
            <p id="file-help" class="field-help">Up to 15 MB. ${encryptionSupported() ? 'AES-GCM encryption is available.' : 'File encryption is unavailable; use a link.'}${gate?.document ? ` Current: ${e(gate.document.name)}` : ''}</p>
          </div>
          <div id="link-field" ${source !== 'link' ? 'hidden' : ''}>
            <label for="share-link">Secure share link<input id="share-link" name="shareLink" type="url" inputmode="url" placeholder="https://…" value="${e(gate?.shareLink ?? '')}" ${source === 'link' ? 'required' : ''} /></label>
          </div>
        </div>
      </div>
      <div class="form-section">
        <div class="section-number" aria-hidden="true">02</div>
        <div class="section-fields">
          <h2>Client handoff</h2>
          <div class="field-grid two">
            <label>Client name<input name="recipientName" required data-trim-required maxlength="100" autocomplete="organization" value="${e(gate?.recipientName ?? '')}" /></label>
            <label>Client email<input name="recipientEmail" type="email" required maxlength="160" autocomplete="email" value="${e(gate?.recipientEmail ?? '')}" /></label>
            <label>Amount<input name="amount" type="number" required min="0" step="0.01" inputmode="decimal" value="${gate ? e(gate.amount) : ''}" /></label>
            <label>Currency<select name="currency" required>${['USD', 'GBP', 'EUR', 'INR', 'CAD', 'AUD'].map((currency) => `<option ${gate?.currency === currency ? 'selected' : ''}>${currency}</option>`).join('')}</select></label>
          </div>
        </div>
      </div>
      <div class="form-section">
        <div class="section-number" aria-hidden="true">03</div>
        <div class="section-fields">
          <h2>The second pair of eyes</h2>
          <label>Reviewer name<input name="approver" required data-trim-required maxlength="100" autocomplete="name" value="${e(gate?.approver ?? '')}" aria-describedby="approver-help" /></label>
          <p id="approver-help" class="field-help">Send Gate records the name you enter; it does not verify identity or provide legal approval.</p>
        </div>
      </div>
      <div id="form-error" class="form-error" role="alert"></div>
      <div class="form-submit"><button type="button" class="secondary" data-action="back-desk">Cancel</button><button class="primary paper-button" type="submit">${gate ? 'Save gate' : 'Create draft gate'} <span aria-hidden="true">→</span></button></div>
    </form>`;
  }

  private settingsPage(): string {
    const licensePresent = hasLicense();
    return `<main id="main" class="settings-main" tabindex="-1">
      <div class="settings-heading"><p class="eyebrow">Local controls</p><h1>Your desk, your data.</h1><p>Everything below is explicit. Send Gate does not sync in the background or upload your documents.</p></div>
      <div class="settings-grid">
        <section class="settings-section" aria-labelledby="data-heading">
          <div class="settings-icon" aria-hidden="true">⇩</div><div><h2 id="data-heading">Take your data with you</h2><p>Export gates and documents as a readable JSON backup. Because it is portable, the backup itself is not encrypted—store it privately.</p>
          <div class="button-row"><button class="secondary" data-action="export-data" ${this.gates.length ? '' : 'disabled'}>Export ${this.gates.length || ''} ${this.gates.length === 1 ? 'gate' : 'gates'}</button><label class="file-button">Import backup<input id="import-file" type="file" accept="application/json,.json" /></label></div></div>
        </section>
        <section class="settings-section pro-sheet" aria-labelledby="pro-heading">
          <div class="pro-ribbon">One-time</div><div class="settings-icon" aria-hidden="true">∞</div><div><p class="eyebrow">Send Gate Pro</p><h2 id="pro-heading">A bigger desk, not a subscription.</h2><p>Unlock unlimited active gates for growing teams. The complete five-gate workflow, encryption, decisions, deletion, and all data tools stay free.</p>
          <p class="price">${PRICE_LABEL}<small>One-time purchase · for this product</small></p>
          ${this.pro ? `<div class="license-good" role="status">✓ Pro is active on this device.</div><button class="text-button" data-action="remove-license">Remove license from this device</button>` : `
            ${licensePresent ? `<p class="license-quiet">License no longer active or could not be verified. Free features are unchanged.</p>` : ''}
            <a class="primary link-button" href="${e(checkoutUrl())}">Buy Pro securely <span aria-hidden="true">↗</span></a>
            <details class="restore"><summary>Have a license? Restore purchase</summary><form id="license-form"><label for="license-token">License token<input id="license-token" name="license" required autocomplete="off" spellcheck="false" /></label><button class="secondary" type="submit">Verify and unlock</button><p id="license-error" class="field-error" role="alert"></p></form></details>`}
          <p class="merchant-note">Checkout and refunds are handled by Sociobot/Dodo, the merchant of record. A refunded license is automatically revoked. <a href="/terms" data-route="/terms">Purchase terms</a></p></div>
        </section>
        <section class="settings-section danger-zone" aria-labelledby="privacy-heading">
          <div class="settings-icon" aria-hidden="true">×</div><div><h2 id="privacy-heading">Delete deliberately</h2><p>Delete individual gates from the approval desk. Each confirmation names the record; deletion removes its encrypted PDF and approval history from this browser.</p><p><a href="/privacy" data-route="/privacy">Read the plain-language privacy note</a></p></div>
        </section>
      </div>
    </main>`;
  }

  private legalPage(page: 'privacy' | 'terms'): string {
    const privacy = page === 'privacy';
    return `<header class="site-header legal-header"><a class="brand" href="/" data-route="/"><span class="brand-mark" aria-hidden="true"><span></span></span><span>Send Gate</span></a><a href="/" data-route="/">Return to approval desk</a></header>
      <main id="main" class="legal-main" tabindex="-1">
        <p class="eyebrow">Last updated 28 August 2026</p>
        <h1>${privacy ? 'Privacy, without fine print.' : 'Terms of use.'}</h1>
        ${privacy ? `
          <p class="lede">Your approval gates belong to you. Send Gate is designed so the product operator does not receive them.</p>
          <h2>What stays on your device</h2><p>Gate details, recipients, amounts, comments, history, and PDFs are stored in your browser’s IndexedDB. PDFs are encrypted with AES-GCM before storage when the browser supports Web Crypto. The encryption key stays in this site’s browser storage on the same device.</p>
          <h2>What leaves your device</h2><p>Nothing during normal free use. Opening a source link or email draft contacts the service you choose. If you buy or verify Pro, your license token is sent to Sociobot’s billing API; documents and gate details are not sent with it. We do not include analytics, advertising trackers, remote fonts, or third-party scripts.</p>
          <h2>Backups and deletion</h2><p>Portable JSON exports contain readable document data so they can move between devices; protect those files yourself. Deleting a gate removes its record and encrypted PDF from this browser. Clearing site data removes all gates and the local encryption key and cannot be undone without a backup.</p>
          <h2>Questions</h2><p>For privacy questions about the hosted product, contact <a href="mailto:privacy@sociobot.in">privacy@sociobot.in</a>.</p>` : `
          <p class="lede">Send Gate is a practical handoff record, not an accounting, legal, or identity-verification service.</p>
          <h2>Using the product</h2><p>You are responsible for checking document accuracy, choosing the real reviewer, attaching the intended file, sending the final message, and complying with rules that apply to your business. An “approved” state records the decision entered on this device; it is not a legal signature or a compliance certification.</p>
          <h2>Local storage and availability</h2><p>The product is provided “as is.” Browser storage can be cleared or become unavailable. Keep your own business records and make exports when appropriate. We do not promise uninterrupted access, recovery, or suitability for regulated records.</p>
          <h2>Pro purchase</h2><p>Send Gate Pro is ${PRICE_LABEL} and unlocks unlimited active gates. It is not a subscription. Sociobot/Dodo is the merchant of record and handles checkout and refunds. A refund revokes the related license. Core export, deletion, safety, and accessibility features are not paid features.</p>
          <h2>Acceptable use</h2><p>Do not use Send Gate to distribute unlawful, deceptive, infringing, or malicious material. You retain responsibility for your documents and communications.</p>
          <h2>Warranty and liability</h2><p>To the maximum extent allowed by law, the software is provided without warranties. The operator is not liable for lost browser data, missed approvals, incorrect documents, or messages sent through external email or link services.</p>`}
      </main>
      <footer class="site-footer"><p>Send Gate · a local-first document checkpoint</p><nav aria-label="Legal"><a href="/privacy" data-route="/privacy">Privacy</a><a href="/terms" data-route="/terms">Terms</a></nav></footer>`;
  }

  private async onClick(event: Event): Promise<void> {
    const target = event.target as HTMLElement;
    const route = target.closest<HTMLElement>('[data-route]');
    if (route) {
      event.preventDefault();
      this.go(route.getAttribute('data-route') || '/');
      return;
    }
    const actionTarget = target.closest<HTMLElement>('[data-action]');
    if (!actionTarget) return;
    const action = actionTarget.dataset.action;
    event.preventDefault();
    if (action === 'new-gate') return this.go('/?new=1');
    if (action === 'back-desk') return this.go(this.selectedId ? `/?gate=${encodeURIComponent(this.selectedId)}` : '/');
    if (action === 'open-settings') return this.go('/?view=settings');
    if (action === 'dismiss-notice') { this.notice = ''; return this.render(); }
    if (action === 'retry-storage') return void this.retryStorage();
    if (action === 'select-gate') {
      this.selectedId = actionTarget.dataset.id ?? null;
      return this.go(`/?gate=${encodeURIComponent(this.selectedId ?? '')}`);
    }
    if (action === 'edit-gate' && this.selected) return this.go(`/?new=1&gate=${encodeURIComponent(this.selected.id)}&edit=1`);
    if (action === 'submit-review') return void this.changeStatus('awaiting');
    if (action === 'recall-review') return void this.changeStatus('draft');
    if (action === 'decide') return void this.recordDecision(actionTarget.dataset.decision as 'approved' | 'rejected');
    if (action === 'open-source') return void this.openSource();
    if (action === 'download-document') return void this.downloadDocument();
    if (action === 'copy-note' && this.selected) return void this.copyText(sendNote(this.selected), 'Send note copied.');
    if (action === 'mark-sent') return void this.markSent();
    if (action === 'reopen-copy') return void this.reopenCopy();
    if (action === 'delete-gate') return void this.removeSelected();
    if (action === 'export-data') return void this.exportData();
    if (action === 'remove-license') {
      if (confirm('Remove the Pro license from this device? You can restore it again with the token.')) {
        removeLicense(); this.pro = false; this.notice = 'License removed from this device.'; this.render();
      }
    }
    if (action === 'update-app' && this.updateWorker) this.updateWorker.postMessage({ type: 'SKIP_WAITING' });
  }

  private async onChange(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (input.name === 'sourceType') {
      const isPdf = input.value === 'pdf';
      const pdf = document.querySelector<HTMLElement>('#pdf-field');
      const link = document.querySelector<HTMLElement>('#link-field');
      const fileInput = document.querySelector<HTMLInputElement>('#document-file');
      const linkInput = document.querySelector<HTMLInputElement>('#share-link');
      if (pdf && link) { pdf.hidden = !isPdf; link.hidden = isPdf; }
      if (fileInput) fileInput.required = isPdf && !this.selected?.document;
      if (linkInput) linkInput.required = !isPdf;
      const error = document.querySelector<HTMLElement>('#form-error');
      if (error) error.textContent = '';
    }
    if (input.id === 'import-file' && input.files?.[0]) await this.importData(input.files[0]);
  }

  private onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.matches('[data-trim-required]')) {
      input.setCustomValidity('');
      input.removeAttribute('aria-invalid');
    }
  }

  private skipToMain(event: Event): void {
    event.preventDefault();
    const main = document.querySelector<HTMLElement>('#main');
    if (!main) return;
    history.replaceState({}, '', `${location.pathname}${location.search}#main`);
    main.focus({ preventScroll: true });
    main.scrollIntoView({ block: 'start' });
  }

  private async onSubmit(event: SubmitEvent): Promise<void> {
    const form = event.target as HTMLFormElement;
    if (form.id === 'gate-form') {
      event.preventDefault();
      await this.saveGate(form);
    }
    if (form.id === 'license-form') {
      event.preventDefault();
      const data = new FormData(form);
      const token = String(data.get('license') ?? '').trim();
      const error = form.querySelector<HTMLElement>('#license-error');
      if (!token) return;
      const button = form.querySelector<HTMLButtonElement>('button');
      if (button) { button.disabled = true; button.textContent = 'Checking…'; }
      saveLicense(token);
      const result = await verifyLicense(true);
      this.pro = result.valid;
      if (result.valid) { this.notice = 'Pro unlocked on this device.'; this.render(); }
      else if (error) {
        error.textContent = result.offline ? 'You are offline. Connect and try verification again.' : 'That license is not active for Send Gate. Check the token and try again.';
        if (button) { button.disabled = false; button.textContent = 'Verify and unlock'; }
      }
    }
  }

  private async saveGate(form: HTMLFormElement): Promise<void> {
    const errorNode = form.querySelector<HTMLElement>('#form-error');
    const trimmedFields = [...form.querySelectorAll<HTMLInputElement>('[data-trim-required]')];
    for (const field of trimmedFields) {
      field.setCustomValidity('');
      field.removeAttribute('aria-invalid');
    }
    const blankField = trimmedFields.find((field) => !field.value.trim());
    if (blankField) {
      blankField.setCustomValidity('Enter a value that is not only spaces.');
      blankField.setAttribute('aria-invalid', 'true');
      if (errorNode) errorNode.textContent = 'Gate name, client name, and reviewer name cannot be blank.';
      blankField.focus();
      blankField.reportValidity();
      return;
    }
    if (!form.checkValidity()) {
      form.reportValidity();
      if (errorNode) errorNode.textContent = 'Complete the highlighted fields before saving.';
      return;
    }
    const button = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    if (button) { button.disabled = true; button.textContent = 'Securing draft…'; }
    try {
      const data = new FormData(form);
      const existing = this.editing ? this.selected : undefined;
      const sourceType = String(data.get('sourceType')) as SourceType;
      const file = data.get('document');
      let encrypted = sourceType === 'pdf' ? existing?.document : undefined;
      const replacesDocument = sourceType === 'pdf' && file instanceof File && file.size > 0;
      if (replacesDocument) {
        if (file.size > MAX_FILE_BYTES) throw new Error('That PDF is larger than 15 MB. Use a smaller PDF or a secure share link.');
        encrypted = await encryptDocument(file);
      }
      if (sourceType === 'pdf' && !encrypted) throw new Error('Choose the PDF that needs approval.');
      const link = String(data.get('shareLink') ?? '').trim();
      if (sourceType === 'link' && !safeHttpUrl(link)) throw new Error('Enter a complete http:// or https:// share link.');
      const now = new Date().toISOString();
      const title = String(data.get('title')).trim();
      const actor = 'Document owner';
      const recipientName = String(data.get('recipientName')).trim();
      const recipientEmail = String(data.get('recipientEmail')).trim();
      const amount = Number(data.get('amount'));
      const currency = String(data.get('currency'));
      const approver = String(data.get('approver')).trim();
      const materialChange = Boolean(existing && (
        title !== existing.title || String(data.get('kind')) !== existing.kind || sourceType !== existing.sourceType ||
        replacesDocument || (sourceType === 'link' && link !== existing.shareLink) ||
        recipientName !== existing.recipientName || recipientEmail !== existing.recipientEmail ||
        amount !== existing.amount || currency !== existing.currency || approver !== existing.approver
      ));
      const approvalWithdrawn = existing?.status === 'approved' && materialChange;
      const gate: Gate = {
        id: existing?.id ?? crypto.randomUUID(),
        title,
        kind: String(data.get('kind')) as GateKind,
        sourceType,
        document: encrypted,
        shareLink: sourceType === 'link' ? link : undefined,
        recipientName,
        recipientEmail,
        amount,
        currency,
        approver,
        status: existing?.status === 'rejected' || approvalWithdrawn ? 'draft' : existing?.status ?? 'draft',
        decisionComment: existing?.status === 'rejected' || approvalWithdrawn ? undefined : existing?.decisionComment,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
        history: existing ? [...existing.history, newAudit('edited', actor, approvalWithdrawn ? 'Material details changed; the prior approval was withdrawn and a new review is required.' : 'Document details were updated.')] : [newAudit('created', actor, `${title} was placed at the gate.`)],
      };
      await putGate(gate);
      await this.reload(gate.id);
      this.notice = approvalWithdrawn ? 'Changes saved. The send handoff is locked until a new approval.' : existing ? 'Gate changes saved on this device.' : 'Draft gate created and encrypted on this device.';
      this.go(`/?gate=${encodeURIComponent(gate.id)}`);
    } catch (error) {
      if (errorNode) errorNode.textContent = error instanceof Error ? error.message : 'The gate could not be saved. Try again.';
      if (button) { button.disabled = false; button.textContent = this.editing ? 'Save gate →' : 'Create draft gate →'; }
    }
  }

  private async changeStatus(status: 'awaiting' | 'draft'): Promise<void> {
    const gate = this.selected;
    if (!gate) return;
    const now = new Date().toISOString();
    gate.status = status;
    gate.updatedAt = now;
    gate.decisionComment = status === 'awaiting' ? undefined : gate.decisionComment;
    gate.history.push(newAudit(status === 'awaiting' ? 'submitted' : 'returned', 'Document owner', status === 'awaiting' ? `Sent to ${gate.approver} for a second look.` : 'Review was recalled to draft.'));
    await putGate(gate);
    await this.reload(gate.id);
    this.notice = status === 'awaiting' ? `Send locked. ${gate.approver} can review now.` : 'Gate moved back to draft.';
    this.render();
  }

  private async recordDecision(decision: 'approved' | 'rejected'): Promise<void> {
    const gate = this.selected;
    if (!gate || gate.status !== 'awaiting') return;
    const textarea = document.querySelector<HTMLTextAreaElement>('#review-comment');
    const comment = textarea?.value.trim() ?? '';
    const error = document.querySelector<HTMLElement>('#review-error');
    if (!comment) {
      if (error) error.textContent = decision === 'approved' ? 'Add a comment describing what you checked before approving.' : 'Add a comment explaining what needs to change.';
      textarea?.focus();
      return;
    }
    gate.status = decision;
    gate.decisionComment = comment || undefined;
    gate.updatedAt = new Date().toISOString();
    gate.history.push(newAudit(decision, gate.approver, comment || 'Approved with no additional comment.'));
    await putGate(gate);
    await this.reload(gate.id);
    this.notice = decision === 'approved' ? 'Approved. The send handoff is now available.' : 'Returned for changes. The send handoff remains locked.';
    this.render();
  }

  private async openSource(): Promise<void> {
    const gate = this.selected;
    if (!gate) return;
    if (gate.document) {
      try {
        const blob = await decryptDocument(gate.document);
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank', 'noopener');
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      } catch (error) { this.notice = error instanceof Error ? error.message : 'The PDF could not be opened.'; this.render(); }
    } else {
      const url = safeHttpUrl(gate.shareLink ?? '');
      if (url) window.open(url, '_blank', 'noopener');
    }
  }

  private async downloadDocument(): Promise<void> {
    const gate = this.selected;
    if (!gate?.document) return;
    try {
      const blob = await decryptDocument(gate.document);
      this.downloadBlob(blob, gate.document.name);
      this.notice = 'Approved PDF downloaded. Attach that file to your email draft.';
      this.render();
    } catch (error) { this.notice = error instanceof Error ? error.message : 'The PDF could not be downloaded.'; this.render(); }
  }

  private async copyText(value: string, notice: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(value);
      this.notice = notice;
    } catch {
      this.notice = 'Clipboard access was blocked. Open the email draft instead.';
    }
    this.render();
  }

  private async markSent(): Promise<void> {
    const gate = this.selected;
    if (!gate || gate.status !== 'approved') return;
    if (!confirm(`Mark “${gate.title}” as sent? This records the handoff; it does not send an email.`)) return;
    gate.status = 'sent';
    gate.updatedAt = new Date().toISOString();
    gate.history.push(newAudit('sent', 'Document owner', `Final handoff marked sent to ${gate.recipientEmail}.`));
    await putGate(gate);
    await this.reload(gate.id);
    this.notice = 'Handoff marked sent. The original gate is sealed.';
    this.render();
  }

  private async reopenCopy(): Promise<void> {
    const source = this.selected;
    if (!source) return;
    if (!this.pro && this.activeCount() >= FREE_ACTIVE_LIMIT) { this.go('/?view=settings'); return; }
    const now = new Date().toISOString();
    const copy: Gate = {
      ...source,
      id: crypto.randomUUID(),
      title: `${source.title} — revision`,
      status: 'draft',
      decisionComment: undefined,
      createdAt: now,
      updatedAt: now,
      history: [newAudit('reopened', 'Document owner', `Revision created from sent gate “${source.title}”.`)],
    };
    await putGate(copy);
    await this.reload(copy.id);
    this.notice = 'Revision created as a new draft gate.';
    this.go(`/?gate=${encodeURIComponent(copy.id)}`);
  }

  private async removeSelected(): Promise<void> {
    const gate = this.selected;
    if (!gate) return;
    if (!confirm(`Permanently delete “${gate.title}” and its ${gate.document ? 'encrypted PDF, ' : ''}approval history from this device?`)) return;
    await deleteGate(gate.id);
    await this.reload();
    this.selectedId = this.gates[0]?.id ?? null;
    this.notice = `“${gate.title}” was deleted from this device.`;
    this.go(this.selectedId ? `/?gate=${encodeURIComponent(this.selectedId)}` : '/');
  }

  private async exportData(): Promise<void> {
    if (!this.gates.length) return;
    try {
      const bundle = await makeExport(this.gates);
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
      this.downloadBlob(blob, `send-gate-backup-${new Date().toISOString().slice(0, 10)}.json`);
      this.notice = 'Portable backup exported. Keep it private: its documents are readable.';
      this.render();
    } catch (error) { this.notice = error instanceof Error ? error.message : 'The backup could not be created.'; this.render(); }
  }

  private async importData(file: File): Promise<void> {
    try {
      const restored = await readExport(file);
      if (!confirm(`Replace this device’s ${this.gates.length} ${this.gates.length === 1 ? 'gate' : 'gates'} with ${restored.length} from “${file.name}”?`)) return;
      await replaceAllGates(restored);
      await this.reload(restored[0]?.id);
      this.notice = `${restored.length} ${restored.length === 1 ? 'gate' : 'gates'} restored and documents re-encrypted on this device.`;
      this.render();
    } catch (error) { this.notice = error instanceof Error ? error.message : 'The backup could not be imported.'; this.render(); }
  }

  private downloadBlob(blob: Blob, name: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = name; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1_000);
  }

  private async retryStorage(): Promise<void> {
    this.storageError = '';
    try { await this.reload(); } catch (error) { this.storageError = error instanceof Error ? error.message : 'Private local storage could not be opened.'; }
    this.render();
  }

  private async reload(selectedId?: string): Promise<void> {
    this.gates = await getGates();
    this.selectedId = selectedId ?? this.selectedId ?? this.gates[0]?.id ?? null;
  }

  private activeCount(): number {
    return this.gates.filter((gate) => gate.status !== 'sent').length;
  }

  private fileSize(size: number): string {
    return size < 1_000_000 ? `${Math.max(1, Math.round(size / 1_000))} KB` : `${(size / 1_000_000).toFixed(1)} MB`;
  }

  private async registerServiceWorker(): Promise<void> {
    if (!('serviceWorker' in navigator) || import.meta.env.DEV) return;
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      if (registration.waiting) { this.updateWorker = registration.waiting; this.render(); }
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        worker?.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) { this.updateWorker = worker; this.render(); }
        });
      });
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (this.updateWorker) location.reload();
      });
    } catch {
      // The local app remains usable when registration is unavailable.
    }
  }
}

const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('Send Gate could not find its application root.');
void new SendGateApp(root).init();
