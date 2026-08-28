import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import type { Gate } from '../src/types';
import { emailDraftUrl, escapeHtml, formatMoney, safeHttpUrl, sendNote, statusCopy } from '../src/utils';

const gate: Gate = {
  id: 'gate-1', title: 'August retainer', kind: 'invoice', sourceType: 'link',
  shareLink: 'https://example.com/invoice', recipientName: 'Acme & Co', recipientEmail: 'billing@example.com',
  amount: 1250, currency: 'USD', approver: 'Sam', status: 'approved', createdAt: '2026-08-28T00:00:00.000Z',
  updatedAt: '2026-08-28T00:00:00.000Z', history: [],
};

describe('document handoff helpers', () => {
  it('creates a recipient-specific, user-controlled email draft', () => {
    expect(sendNote(gate)).toContain('Acme & Co');
    expect(sendNote(gate)).toContain('https://example.com/invoice');
    expect(emailDraftUrl(gate)).toMatch(/^mailto:billing%40example.com\?/);
  });

  it('formats money and provides words for every status', () => {
    expect(formatMoney(1250, 'USD')).toMatch(/1,250/);
    expect(Object.keys(statusCopy)).toEqual(['draft', 'awaiting', 'approved', 'rejected', 'sent']);
  });

  it('rejects unsafe links and escapes user content', () => {
    expect(safeHttpUrl('javascript:alert(1)')).toBeNull();
    expect(safeHttpUrl('https://example.com')).toBe('https://example.com/');
    expect(escapeHtml('<img onerror="bad">')).toBe('&lt;img onerror=&quot;bad&quot;&gt;');
  });
});

describe('static release policy', () => {
  it('ships security, manifest MIME, update, and immutable asset headers', async () => {
    const config = JSON.parse(await readFile('public/staticwebapp.config.json', 'utf8')) as {
      globalHeaders: Record<string, string>;
      mimeTypes: Record<string, string>;
      routes: Array<{ route: string; headers: Record<string, string> }>;
    };
    expect(config.globalHeaders['Content-Security-Policy']).toContain("frame-ancestors 'none'");
    expect(config.globalHeaders['Permissions-Policy']).toContain('camera=()');
    expect(config.globalHeaders['Cross-Origin-Opener-Policy']).toBe('same-origin');
    expect(config.globalHeaders['Strict-Transport-Security']).toContain('max-age=63072000');
    expect(config.routes.find(({ route }) => route === '/assets/*')?.headers['Cache-Control']).toContain('immutable');
    expect(config.mimeTypes['.webmanifest']).toBe('application/manifest+json');
    expect(config.routes.find(({ route }) => route === '/sw.js')?.headers['Cache-Control']).toContain('no-store');
  });
});
