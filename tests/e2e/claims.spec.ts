import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

async function fillLinkGate(page: import('@playwright/test').Page, title: string): Promise<void> {
  await page.getByLabel('Gate name').fill(title);
  await page.getByText('Copied share link', { exact: true }).click();
  await page.getByLabel('Secure share link').fill(`https://example.com/${title.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')}`);
  await page.getByLabel('Client name').fill('Northstar Studio');
  await page.getByLabel('Client email').fill('accounts@example.com');
  await page.getByLabel('Amount').fill('2400');
  await page.getByLabel('Reviewer name').fill('Morgan');
}

async function gateCount(page: import('@playwright/test').Page, databaseName: string): Promise<number> {
  return page.evaluate(async (name) => {
    const request = indexedDB.open(name);
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      const query = db.transaction('gates', 'readonly').objectStore('gates').count();
      return await new Promise<number>((resolve, reject) => {
        query.onsuccess = () => resolve(query.result);
        query.onerror = () => reject(query.error);
      });
    } finally {
      db.close();
    }
  }, databaseName);
}

async function readCommittedDemoGate(page: import('@playwright/test').Page, title: string): Promise<{
  cipher: boolean;
  encryptedSize: number;
  plainTextPresent: boolean;
} | null> {
  return page.evaluate(async (gateTitle) => {
    const request = indexedDB.open('demo:send-gate-local');
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      const transaction = db.transaction('gates', 'readonly');
      const complete = new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
      });
      const query = transaction.objectStore('gates').getAll();
      const gates = await new Promise<any[]>((resolve, reject) => {
        query.onsuccess = () => resolve(query.result);
        query.onerror = () => reject(query.error);
      });
      await complete;
      const gate = gates.find((item) => item.title === gateTitle);
      if (!gate?.document) return null;
      return {
        cipher: gate.document.cipher instanceof ArrayBuffer,
        encryptedSize: gate.document.cipher.byteLength,
        plainTextPresent: JSON.stringify(gate).includes('%PDF-1.7'),
      };
    } finally {
      db.close();
    }
  }, title);
}

test('@claim:checkout-fail-soft handles the documented checkout 404 and a 500 without leaving the free desk', async ({ page }) => {
  let attempt = 0;
  await page.route('https://api.sociobot.in/api/v1/products/invoice-approval-gate/checkout', async (route) => {
    attempt += 1;
    await route.fulfill({
      status: attempt === 1 ? 404 : 500,
      contentType: 'application/json',
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'checkout unavailable' }),
    });
  });
  await page.goto('/demo?view=settings');
  const buy = page.getByRole('button', { name: /Buy Pro securely/ });
  await buy.click();
  await expect(page).toHaveURL(/\/demo\?view=settings/);
  await expect(page.locator('#checkout-error')).toHaveText('Checkout is temporarily unavailable. Your free desk is unchanged. Please try again later or restore a purchase.');
  await buy.click();
  await expect(page).toHaveURL(/\/demo\?view=settings/);
  expect(attempt).toBe(2);
});

test('@claim:demo-sandbox loads three isolated sample gates from the landing action and can reset or leave the demo', async ({ page }) => {
  await page.goto('/');
  const realGateCountBefore = await gateCount(page, 'send-gate-local');
  expect(realGateCountBefore).toBe(0);
  await page.evaluate(() => { (window as Window & { demoSentinel?: boolean }).demoSentinel = true; });
  await page.getByRole('link', { name: 'Try it with sample data' }).click();
  await expect(page).toHaveURL(/\/demo$/);
  await expect(page.getByLabel('Demo controls')).toContainText('Demo — sample data, nothing is saved.');
  await expect(page.getByRole('heading', { name: 'Harbour House — kitchen quote' })).toBeVisible();
  expect(await page.evaluate(() => (window as Window & { demoSentinel?: boolean }).demoSentinel)).toBe(true);
  const names = await page.evaluate(async () => (await indexedDB.databases()).map((entry) => entry.name));
  expect(names).toContain('demo:send-gate-local');
  await page.getByRole('button', { name: 'Reset demo' }).click();
  await expect(page.getByText('Demo reset to three sample gates.')).toBeVisible();
  await page.getByRole('button', { name: 'Start for real' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: 'Approve quotes and invoices before they go out.' })).toBeVisible();
  expect(await gateCount(page, 'send-gate-local')).toBe(realGateCountBefore);
});

test('@claim:approval-handoff releases the client email draft only after a recorded approval', async ({ page }) => {
  await page.goto('/demo');
  await page.getByRole('button', { name: /Harbour House — kitchen quote/ }).click();
  await expect(page.locator('[data-email-draft]')).toHaveCount(0);
  await page.getByLabel('Decision comment').fill('Client, scope, and amount checked.');
  await page.getByRole('button', { name: 'Approve to send' }).click();
  await expect(page.getByRole('link', { name: /Open email draft/ })).toHaveAttribute('href', /^mailto:/);
});

test('@claim:sealed-handoff removes the second-send control after a handoff is recorded', async ({ page }) => {
  await page.goto('/demo');
  await page.getByRole('button', { name: /Cedar Lane — repair quote/ }).click();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: /Mark handoff as sent/ }).click();
  await expect(page.getByRole('heading', { name: 'Marked sent — no second send button.' })).toBeVisible();
  await expect(page.locator('[data-email-draft]')).toHaveCount(0);
});

test('@claim:local-encryption encrypts a demo PDF before IndexedDB storage', async ({ page }) => {
  const title = 'Demo encrypted PDF';
  await page.goto('/demo?new=1');
  await page.getByLabel('Gate name').fill(title);
  await page.getByLabel('PDF file').setInputFiles({
    name: 'demo.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.7\n% demo PDF\n%%EOF'),
  });
  await page.getByLabel('Client name').fill('Demo Client');
  await page.getByLabel('Client email').fill('demo-client@example.com');
  await page.getByLabel('Amount').fill('20');
  await page.getByLabel('Reviewer name').fill('Morgan');
  await page.getByRole('button', { name: /Create draft gate/ }).click();
  await expect(page.getByRole('heading', { name: title })).toBeVisible();
  await expect.poll(() => readCommittedDemoGate(page, title), {
    message: 'The rendered encrypted PDF gate should be committed before another IndexedDB connection reads it.',
    timeout: 5_000,
  }).not.toBeNull();
  const stored = await readCommittedDemoGate(page, title);
  expect(stored).not.toBeNull();
  if (!stored) throw new Error('The encrypted PDF gate was not committed.');
  expect(stored.cipher).toBe(true);
  expect(stored.encryptedSize).toBeGreaterThan(Buffer.byteLength('%PDF-1.7\n% demo PDF\n%%EOF'));
  expect(stored.plainTextPresent).toBe(false);
});

test('@claim:pdf-size-limit accepts a 15 MiB PDF and rejects a PDF one byte larger', async ({ page }) => {
  const exactLimit = 15 * 1024 * 1024;
  const validPdf = Buffer.alloc(exactLimit);
  validPdf.write('%PDF-1.7\n');
  await page.goto('/demo?new=1');
  await page.getByLabel('Gate name').fill('Exact size PDF');
  await page.getByLabel('PDF file').setInputFiles({ name: 'exact-limit.pdf', mimeType: 'application/pdf', buffer: validPdf });
  await page.getByLabel('Client name').fill('Demo Client');
  await page.getByLabel('Client email').fill('demo-client@example.com');
  await page.getByLabel('Amount').fill('20');
  await page.getByLabel('Reviewer name').fill('Morgan');
  await page.getByRole('button', { name: /Create draft gate/ }).click();
  await expect(page.getByRole('heading', { name: 'Exact size PDF' })).toBeVisible();

  await page.getByRole('button', { name: /New approval gate/ }).click();
  const overLimit = Buffer.alloc(exactLimit + 1);
  overLimit.write('%PDF-1.7\n');
  await page.getByLabel('Gate name').fill('Over limit PDF');
  await page.getByLabel('PDF file').setInputFiles({ name: 'over-limit.pdf', mimeType: 'application/pdf', buffer: overLimit });
  await page.getByLabel('Client name').fill('Demo Client');
  await page.getByLabel('Client email').fill('demo-client@example.com');
  await page.getByLabel('Amount').fill('20');
  await page.getByLabel('Reviewer name').fill('Morgan');
  await page.getByRole('button', { name: /Create draft gate/ }).click();
  await expect(page.getByText('That PDF is larger than 15 MiB. Use a smaller PDF or a secure share link.')).toBeVisible();
});

test('@claim:private-free-workflow makes only same-origin requests while reviewing demo data', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  await page.goto('/demo');
  await page.getByRole('button', { name: /Harbour House — kitchen quote/ }).click();
  await page.getByLabel('Decision comment').fill('Review completed locally.');
  await page.getByRole('button', { name: 'Approve to send' }).click();
  const origins = [...new Set(requests.filter((url) => url.startsWith('http')).map((url) => new URL(url).origin))];
  expect(origins).toEqual(['http://127.0.0.1:4173']);
});

test('@claim:offline-reload keeps the demo approval desk usable after its first visit', async ({ browser }) => {
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:4173/demo');
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
    await context.setOffline(true);
    await page.reload();
    await expect(page.getByRole('heading', { name: /Harbour House — kitchen quote|Cedar Lane — repair quote/ })).toBeVisible();
    await page.getByRole('button', { name: /Harbour House — kitchen quote/ }).click();
    await page.getByLabel('Decision comment').fill('Reviewed while offline.');
    await page.getByRole('button', { name: 'Approve to send' }).click();
    await expect(page.getByRole('link', { name: /Open email draft/ })).toBeVisible();
  } finally {
    await context.close();
  }
});

test('@claim:portable-export downloads the three sample approval records as JSON', async ({ page }, testInfo) => {
  await page.goto('/demo');
  await page.getByRole('link', { name: 'Settings' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /Export 3 gates/ }).click();
  const download = await downloadPromise;
  const path = testInfo.outputPath('send-gate-demo-backup.json');
  await download.saveAs(path);
  const backup = JSON.parse(await readFile(path, 'utf8')) as { product: string; gates: unknown[]; warning: string };
  expect(backup.product).toBe('invoice-approval-gate');
  expect(backup.gates).toHaveLength(3);
  expect(backup.warning).toContain('readable document data');
});

test('@claim:portable-import restores a valid portable JSON backup in the isolated demo desk', async ({ page }) => {
  await page.goto('/demo?view=settings');
  const now = new Date().toISOString();
  const backup = {
    product: 'invoice-approval-gate', version: 1, exportedAt: now,
    warning: 'This portable backup contains readable document data. Store it somewhere private.',
    gates: [{
      id: 'demo-imported-gate', title: 'Imported demo quote', kind: 'quote', sourceType: 'link',
      shareLink: 'https://example.com/imported-demo-quote', recipientName: 'Imported Client',
      recipientEmail: 'imported@example.com', amount: 75, currency: 'USD', approver: 'Morgan',
      status: 'draft', createdAt: now, updatedAt: now,
      history: [{ id: 'demo-import-created', at: now, action: 'created', actor: 'Document owner', detail: 'Imported demo quote was placed at the gate.' }],
    }],
  };
  page.once('dialog', (dialog) => dialog.accept());
  await page.locator('#import-file').setInputFiles({
    name: 'demo-backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)),
  });
  await expect(page.getByText('1 gate restored and documents re-encrypted on this device.')).toBeVisible();
  await page.getByRole('link', { name: 'Approval desk' }).click();
  await expect(page.getByRole('heading', { name: 'Imported demo quote' })).toBeVisible();
});

test('@claim:deletion removes a named demo gate from the local approval desk', async ({ page }) => {
  await page.goto('/demo');
  await page.getByRole('button', { name: /Mason & Alder — July invoice/ }).click();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Delete gate' }).click();
  await expect(page.getByRole('button', { name: /Mason & Alder — July invoice/ })).toHaveCount(0);
  const removed = await page.evaluate(async () => {
    const request = indexedDB.open('demo:send-gate-local');
    const db = await new Promise<IDBDatabase>((resolve) => { request.onsuccess = () => resolve(request.result); });
    const query = db.transaction('gates', 'readonly').objectStore('gates').get('demo-mason-alder');
    const result = await new Promise<unknown>((resolve) => { query.onsuccess = () => resolve(query.result); });
    db.close();
    return result;
  });
  expect(removed).toBeUndefined();
});

test('@claim:free-active-limit allows five active gates before offering Pro', async ({ page }) => {
  await page.goto('/demo');
  for (const title of ['Demo fourth gate', 'Demo fifth gate']) {
    await page.getByRole('button', { name: /New approval gate/ }).click();
    await fillLinkGate(page, title);
    await page.getByRole('button', { name: /Create draft gate/ }).click();
  }
  await page.getByRole('button', { name: /New approval gate/ }).click();
  await expect(page.getByRole('heading', { name: 'All five active slots are in use.' })).toBeVisible();
  await page.getByRole('button', { name: 'See the one-time unlock' }).click();
  await expect(page.getByText('$29 once')).toBeVisible();
  await expect(page.getByText('Unlock unlimited active gates for growing teams.')).toBeVisible();
});

test('@claim:license-restore unlocks Pro after a valid deterministic verification response', async ({ page }) => {
  await page.route('https://api.sociobot.in/api/v1/products/invoice-approval-gate/verify?*', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ valid: true, reason: 'ok' }) });
  });
  await page.goto('/demo?view=settings');
  await page.getByText('Have a license? Restore purchase').click();
  await page.getByLabel('License token').fill('recorded-demo-license');
  await page.getByRole('button', { name: 'Verify and unlock' }).click();
  await expect(page.getByText('Pro is active on this device.')).toBeVisible();
});

test('@claim:license-revocation keeps the free desk available when a license is inactive', async ({ page }) => {
  await page.route('https://api.sociobot.in/api/v1/products/invoice-approval-gate/verify?*', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ valid: false, reason: 'revoked' }) });
  });
  await page.goto('/demo?view=settings&license=recorded-revoked-license');
  await expect(page).not.toHaveURL(/license=/);
  await expect(page.getByText('That license is not active for Send Gate. Free features and purchase options remain available.')).toBeVisible();
  await expect(page.getByRole('button', { name: /Buy Pro securely/ })).toBeVisible();
  await page.getByRole('link', { name: 'Approval desk' }).click();
  await expect(page.getByRole('heading', { name: 'Harbour House — kitchen quote' })).toBeVisible();
});

test('@claim:pwa-shell provides an installable manifest and service-worker-controlled demo', async ({ page }) => {
  await page.goto('/demo');
  const manifest = await page.evaluate(async () => (await fetch('/manifest.webmanifest')).json() as Promise<{ display: string; icons: unknown[] }>);
  expect(manifest.display).toBe('standalone');
  expect(manifest.icons).toHaveLength(3);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  expect(await page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
});
