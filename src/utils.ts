import type { Gate, GateStatus } from './types';

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function safeHttpUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export const statusCopy: Record<GateStatus, { label: string; symbol: string; detail: string }> = {
  draft: { label: 'Draft', symbol: '○', detail: 'Ready to prepare' },
  awaiting: { label: 'Awaiting review', symbol: '◷', detail: 'Send is locked' },
  approved: { label: 'Approved', symbol: '✓', detail: 'Send handoff released' },
  rejected: { label: 'Returned', symbol: '↩', detail: 'Changes requested' },
  sent: { label: 'Marked sent', symbol: '◆', detail: 'Handoff recorded' },
};

export function sendNote(gate: Gate): string {
  return `Hi ${gate.recipientName},\n\nPlease find our ${gate.kind} “${gate.title}” for ${formatMoney(gate.amount, gate.currency)}.${gate.shareLink ? `\n\nView it here: ${gate.shareLink}` : '\n\nThe approved PDF is attached.'}\n\nBest,`;
}

export function emailDraftUrl(gate: Gate): string {
  const params = new URLSearchParams({
    subject: `${gate.kind === 'invoice' ? 'Invoice' : 'Quote'}: ${gate.title}`,
    body: sendNote(gate),
  });
  return `mailto:${encodeURIComponent(gate.recipientEmail)}?${params.toString()}`;
}

export function newAudit(action: Gate['history'][number]['action'], actor: string, detail: string): Gate['history'][number] {
  return { id: crypto.randomUUID(), at: new Date().toISOString(), action, actor, detail };
}
