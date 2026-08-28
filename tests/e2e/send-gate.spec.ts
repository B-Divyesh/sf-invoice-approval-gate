import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('empty desk is accessible and creates an approval through send handoff', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Nothing leaves without a second look.');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(await new AxeBuilder({ page }).analyze()).toMatchObject({ violations: [] });

  await page.getByRole('button', { name: /Create your first gate/ }).click();
  await page.getByLabel('Type').selectOption('quote');
  await page.getByLabel('Gate name').fill('Workshop fit-out');
  await page.getByText('Copied share link', { exact: true }).click();
  await page.getByLabel('Secure share link').fill('https://example.com/quote/123');
  await page.getByLabel('Client name').fill('Northstar Studio');
  await page.getByLabel('Client email').fill('accounts@example.com');
  await page.getByLabel('Amount').fill('2400');
  await page.getByLabel('Reviewer name').fill('Morgan');
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
