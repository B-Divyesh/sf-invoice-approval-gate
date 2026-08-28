import { describe, expect, it } from 'vitest';
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
