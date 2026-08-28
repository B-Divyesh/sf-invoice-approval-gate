import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function fillLinkGate(page: import('@playwright/test').Page, title = 'Workshop fit-out') {
  await page.getByLabel('Gate name').fill(title);
  await page.getByText('Copied share link', { exact: true }).click();
  await page.getByLabel('Secure share link').fill('https://example.com/quote/123');
  await page.getByLabel('Client name').fill('Northstar Studio');
  await page.getByLabel('Client email').fill('accounts@example.com');
  await page.getByLabel('Amount').fill('2400');
  await page.getByLabel('Reviewer name').fill('Morgan');
}

test('empty desk is accessible and creates an approval through send handoff', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Nothing leaves without a second look.');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(await new AxeBuilder({ page }).analyze()).toMatchObject({ violations: [] });

  await page.getByRole('button', { name: /Create your first gate/ }).click();
  await page.getByLabel('Type').selectOption('quote');
  await fillLinkGate(page);
  await page.getByRole('button', { name: /Create draft gate/ }).click();

  await expect(page.getByRole('heading', { name: 'Workshop fit-out' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole('button', { name: /Submit for approval/ }).click();
  await expect(page.getByRole('heading', { name: 'Review for Morgan' })).toBeVisible();
  await page.getByRole('button', { name: 'Return for changes' }).click();
  await expect(page.getByText('Add a comment explaining what needs to change.')).toBeVisible();
  await page.getByLabel('Decision comment').fill('Update the amount before sending.');
  await page.getByRole('button', { name: 'Return for changes' }).click();
  await expect(page.getByRole('heading', { name: 'Update the amount before sending.' })).toBeVisible();
  await page.getByRole('button', { name: 'Edit details' }).click();
  await page.getByLabel('Amount').fill('2500');
  await page.getByRole('button', { name: /Save gate/ }).click();
  await page.getByRole('button', { name: /Submit for approval/ }).click();
  await page.getByLabel('Decision comment').fill('Client, value, and scope checked.');
  await page.getByRole('button', { name: 'Approve to send' }).click();
  await expect(page.getByRole('heading', { name: 'The send handoff is released.' })).toBeVisible();
  const draft = page.getByRole('link', { name: /Open email draft/ });
  await expect(draft).toHaveAttribute('href', /^mailto:/);
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: /Mark handoff as sent/ }).click();
  await expect(page.getByRole('heading', { name: /Marked sent/ })).toBeVisible();
  await expect(page.getByText('no second send button', { exact: false })).toBeVisible();
});

test('PDFs are encrypted in storage and can be released after approval', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'Covered once in Chromium; mobile exercises the link workflow.');
  await page.goto('/');
  await page.getByRole('button', { name: /Create your first gate/ }).click();
  await page.getByLabel('Gate name').fill('Encrypted PDF gate');
  await page.getByLabel('PDF file').setInputFiles({
    name: 'invoice.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4\n% local test document\n%%EOF'),
  });
  await page.getByLabel('Client name').fill('PDF Client');
  await page.getByLabel('Client email').fill('pdf@example.com');
  await page.getByLabel('Amount').fill('125');
  await page.getByLabel('Reviewer name').fill('Avery');
  await page.getByRole('button', { name: /Create draft gate/ }).click();
  await expect(page.getByRole('heading', { name: 'Encrypted PDF gate' })).toBeVisible();
  const storage = await page.evaluate(async () => {
    const request = indexedDB.open('send-gate-local');
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const transaction = db.transaction('gates', 'readonly');
    const records = await new Promise<any[]>((resolve, reject) => {
      const query = transaction.objectStore('gates').getAll();
      query.onsuccess = () => resolve(query.result);
      query.onerror = () => reject(query.error);
    });
    return { hasCipher: records[0].document.cipher instanceof ArrayBuffer, hasKey: Boolean(localStorage.getItem('sendgate:document-key')) };
  });
  expect(storage).toEqual({ hasCipher: true, hasKey: true });
  await page.getByRole('button', { name: /Submit for approval/ }).click();
  await page.getByLabel('Decision comment').fill('PDF reviewed against the job sheet.');
  await page.getByRole('button', { name: 'Approve to send' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download approved PDF' }).click();
  expect((await downloadPromise).suggestedFilename()).toBe('invoice.pdf');
});

test('installed app shell and saved gate work offline', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await page.getByRole('button', { name: /Create your first gate/ }).click();
  await page.getByLabel('Gate name').fill('Offline invoice');
  await page.getByText('Copied share link', { exact: true }).click();
  await page.getByLabel('Secure share link').fill('https://example.com/offline');
  await page.getByLabel('Client name').fill('Field Client');
  await page.getByLabel('Client email').fill('field@example.com');
  await page.getByLabel('Amount').fill('88');
  await page.getByLabel('Reviewer name').fill('Riley');
  await page.getByRole('button', { name: /Create draft gate/ }).click();
  await expect(page.getByRole('heading', { name: 'Offline invoice' })).toBeVisible();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText('Offline.', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Offline invoice' })).toBeVisible();
  await page.getByRole('button', { name: /Submit for approval/ }).click();
  await expect(page.getByRole('heading', { name: 'Review for Riley' })).toBeVisible();
});

test('privacy and terms render as direct routes with one h1', async ({ page }) => {
  for (const route of ['/privacy/', '/terms/']) {
    await page.goto(route);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('main')).toHaveCount(1);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  }
});

test('material edits withdraw approval and lock the changed handoff until reapproval', async ({ page }) => {
  await page.goto('/?new=1');
  await fillLinkGate(page, 'Approved original');
  await page.getByRole('button', { name: /Create draft gate/ }).click();
  await page.getByRole('button', { name: /Submit for approval/ }).click();
  await page.getByLabel('Decision comment').fill('Recipient, amount, and source checked.');
  await page.getByRole('button', { name: 'Approve to send' }).click();
  await expect(page.getByRole('link', { name: /Open email draft/ })).toBeVisible();

  await page.getByRole('button', { name: 'Edit details' }).click();
  await page.getByLabel('Client email').fill('changed@example.com');
  await page.getByLabel('Amount').fill('3200');
  await page.getByLabel('Secure share link').fill('https://example.com/quote/changed');
  await page.getByRole('button', { name: /Save gate/ }).click();

  await expect(page.getByText('Changes saved. The send handoff is locked until a new approval.')).toBeVisible();
  await expect(page.getByRole('button', { name: /Submit for approval/ })).toBeVisible();
  await expect(page.locator('[data-email-draft]')).toHaveCount(0);
  const state = await page.evaluate(async () => {
    const request = indexedDB.open('send-gate-local');
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const query = db.transaction('gates', 'readonly').objectStore('gates').getAll();
    const gates = await new Promise<any[]>((resolve, reject) => {
      query.onsuccess = () => resolve(query.result);
      query.onerror = () => reject(query.error);
    });
    db.close();
    return { status: gates[0].status, comment: gates[0].decisionComment, detail: gates[0].history.at(-1).detail };
  });
  expect(state).toEqual({
    status: 'draft',
    comment: undefined,
    detail: 'Material details changed; the prior approval was withdrawn and a new review is required.',
  });
});

test('invalid audit timestamp rejects backup atomically and preserves the desk', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto('/?new=1');
  await fillLinkGate(page, 'Existing local gate');
  await page.getByRole('button', { name: /Create draft gate/ }).click();
  await page.getByRole('link', { name: 'Settings' }).click();
  const now = new Date().toISOString();
  const backup = {
    product: 'invoice-approval-gate', version: 1, exportedAt: now,
    warning: 'This portable backup contains readable document data. Store it somewhere private.',
    gates: [{
      id: 'imported-gate', title: 'Invalid imported gate', kind: 'invoice', sourceType: 'link',
      shareLink: 'https://example.com/imported', recipientName: 'Imported Client',
      recipientEmail: 'imported@example.com', amount: 12, currency: 'USD', approver: 'Reviewer',
      status: 'draft', createdAt: now, updatedAt: now,
      history: [{ id: 'bad-event', at: 'not-a-date', action: 'created', actor: 'Owner', detail: 'Created.' }],
    }],
  };
  await page.locator('#import-file').setInputFiles({
    name: 'invalid-audit.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)),
  });
  await expect(page.getByText('The backup contains an invalid approval-history event.')).toBeVisible();
  await page.getByRole('link', { name: 'Approval desk' }).click();
  await expect(page.getByRole('heading', { name: 'Existing local gate' })).toBeVisible();
  await expect(page.getByText('Invalid imported gate')).toHaveCount(0);
  expect(pageErrors).toEqual([]);
});

test('valid portable PDF backup restores readable bytes and is re-encrypted locally', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'Portable PDF crypto is covered once in Chromium.');
  await page.goto('/?view=settings');
  const now = new Date().toISOString();
  const pdf = Buffer.from('%PDF-1.4\n% portable document\n%%EOF');
  const backup = {
    product: 'invoice-approval-gate', version: 1, exportedAt: now,
    warning: 'This portable backup contains readable document data. Store it somewhere private.',
    gates: [{
      id: 'portable-pdf', title: 'Restored PDF', kind: 'invoice', sourceType: 'pdf',
      document: { name: 'restored.pdf', mime: 'application/pdf', size: pdf.byteLength, dataBase64: pdf.toString('base64') },
      recipientName: 'Restore Client', recipientEmail: 'restore@example.com', amount: 44,
      currency: 'USD', approver: 'Jordan', status: 'draft', createdAt: now, updatedAt: now,
      history: [{ id: 'created-event', at: now, action: 'created', actor: 'Document owner', detail: 'Restored PDF was placed at the gate.' }],
    }],
  };
  page.once('dialog', (dialog) => dialog.accept());
  await page.locator('#import-file').setInputFiles({
    name: 'valid-pdf.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)),
  });
  await expect(page.getByText('1 gate restored and documents re-encrypted on this device.')).toBeVisible();
  await page.getByRole('link', { name: 'Approval desk' }).click();
  await expect(page.getByRole('heading', { name: 'Restored PDF' })).toBeVisible();
  const encrypted = await page.evaluate(async () => {
    const request = indexedDB.open('send-gate-local');
    const db = await new Promise<IDBDatabase>((resolve) => { request.onsuccess = () => resolve(request.result); });
    const query = db.transaction('gates', 'readonly').objectStore('gates').get('portable-pdf');
    const gate = await new Promise<any>((resolve) => { query.onsuccess = () => resolve(query.result); });
    db.close();
    return { hasCipher: gate.document.cipher instanceof ArrayBuffer, cipherSize: gate.document.cipher.byteLength };
  });
  expect(encrypted.hasCipher).toBe(true);
  expect(encrypted.cipherSize).toBeGreaterThan(pdf.byteLength);
});

test('trimmed identity fields and both approval decisions require meaningful comments', async ({ page }) => {
  await page.goto('/?new=1');
  await fillLinkGate(page, '   ');
  await page.getByRole('button', { name: /Create draft gate/ }).click();
  await expect(page.getByText('Gate name, client name, and reviewer name cannot be blank.')).toBeVisible();
  await expect(page.getByLabel('Gate name')).toBeFocused();
  await page.getByLabel('Gate name').fill('Trimmed gate');
  await page.getByLabel('Client name').fill('   ');
  await page.getByRole('button', { name: /Create draft gate/ }).click();
  await expect(page.getByLabel('Client name')).toBeFocused();
  await page.getByLabel('Client name').fill('Northstar Studio');
  await page.getByLabel('Reviewer name').fill('   ');
  await page.getByRole('button', { name: /Create draft gate/ }).click();
  await expect(page.getByLabel('Reviewer name')).toBeFocused();
  await page.getByLabel('Reviewer name').fill('Morgan');
  await page.getByRole('button', { name: /Create draft gate/ }).click();
  await page.getByRole('button', { name: /Submit for approval/ }).click();
  await page.getByRole('button', { name: 'Approve to send' }).click();
  await expect(page.getByText('Add a comment describing what you checked before approving.')).toBeVisible();
  await expect(page.getByLabel('Decision comment')).toBeFocused();
  await expect(page.locator('[data-email-draft]')).toHaveCount(0);
});

test('oversized PDF can recover by switching to a link and fake PDFs are rejected', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'Large file boundary is covered once; link recovery is viewport-independent.');
  await page.goto('/?new=1');
  await page.getByLabel('Gate name').fill('File recovery');
  await page.getByLabel('Client name').fill('File Client');
  await page.getByLabel('Client email').fill('file@example.com');
  await page.getByLabel('Amount').fill('15');
  await page.getByLabel('Reviewer name').fill('Taylor');
  await page.getByLabel('PDF file').setInputFiles({
    name: 'too-large.pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(15 * 1024 * 1024 + 1, 1),
  });
  await page.getByRole('button', { name: /Create draft gate/ }).click();
  await expect(page.getByText('That PDF is larger than 15 MB. Use a smaller PDF or a secure share link.')).toBeVisible();
  await page.getByText('Copied share link', { exact: true }).click();
  await page.getByLabel('Secure share link').fill('https://example.com/recovered');
  await page.getByRole('button', { name: /Create draft gate/ }).click();
  await expect(page.getByRole('heading', { name: 'File recovery' })).toBeVisible();

  await page.getByRole('button', { name: /New approval gate/ }).click();
  await page.getByLabel('Gate name').fill('Fake PDF');
  await page.getByLabel('PDF file').setInputFiles({ name: 'not-a-pdf.pdf', mimeType: 'text/plain', buffer: Buffer.from('plain text') });
  await page.getByLabel('Client name').fill('Fake Client');
  await page.getByLabel('Client email').fill('fake@example.com');
  await page.getByLabel('Amount').fill('20');
  await page.getByLabel('Reviewer name').fill('Taylor');
  await page.getByRole('button', { name: /Create draft gate/ }).click();
  await expect(page.getByText('That file is not a valid PDF. Choose a PDF document or use a secure share link.')).toBeVisible();
});

test('hero keeps its intrinsic ratio and skip link moves focus to a full-size target', async ({ page }, testInfo) => {
  await page.goto('/');
  const geometry = await page.locator('.hero-art img').evaluate((image: HTMLImageElement) => {
    return { width: image.clientWidth, height: image.clientHeight, naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight };
  });
  expect(Math.abs(geometry.width / geometry.height - geometry.naturalWidth / geometry.naturalHeight)).toBeLessThan(0.02);
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
  if (testInfo.project.name === 'mobile') {
    const targets = await page.locator('.brand, .site-footer nav a').evaluateAll((elements) => elements.map((element) => {
      const box = element.getBoundingClientRect();
      return { width: box.width, height: box.height };
    }));
    for (const target of targets) {
      expect(target.height).toBeGreaterThanOrEqual(44);
      expect(target.width).toBeGreaterThanOrEqual(44);
    }
  }
});

test('invalid returned license resolves checking feedback and restores purchase controls', async ({ page }) => {
  await page.route('https://api.sociobot.in/api/v1/products/invoice-approval-gate/verify?*', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ valid: false, reason: 'invalid' }) });
  });
  await page.goto('/?view=settings&license=qa-verification-invalid-token');
  await expect(page).not.toHaveURL(/license=/);
  await expect(page.getByText('That license is not active for Send Gate. Free features and purchase options remain available.')).toBeVisible();
  await expect(page.getByRole('link', { name: /Buy Pro securely/ })).toBeVisible();
  await expect(page.getByText('Have a license? Restore purchase')).toBeVisible();
  await expect(page.getByText(/Checking your unlock/)).toHaveCount(0);
});
