import type { Gate } from './types';

export function isDemoRoute(): boolean {
  const path = location.pathname.replace(/\/$/, '') || '/';
  return path === '/demo' || new URLSearchParams(location.search).get('demo') === '1';
}

const SAMPLE_GATES: Gate[] = [
  {
    id: 'demo-harbour-house',
    title: 'Harbour House — kitchen quote',
    kind: 'quote',
    sourceType: 'link',
    shareLink: 'https://example.com/harbour-house-kitchen-quote',
    recipientName: 'Harbour House',
    recipientEmail: 'accounts@harbour-house.example',
    amount: 4850,
    currency: 'GBP',
    approver: 'Avery Chen',
    status: 'awaiting',
    createdAt: '2026-08-30T08:45:00.000Z',
    updatedAt: '2026-08-30T09:05:00.000Z',
    history: [
      { id: 'demo-harbour-created', at: '2026-08-30T08:45:00.000Z', action: 'created', actor: 'Document owner', detail: 'Harbour House — kitchen quote was placed at the gate.' },
      { id: 'demo-harbour-submitted', at: '2026-08-30T09:05:00.000Z', action: 'submitted', actor: 'Document owner', detail: 'Sent to Avery Chen for a second look.' },
    ],
  },
  {
    id: 'demo-mason-alder',
    title: 'Mason & Alder — July invoice',
    kind: 'invoice',
    sourceType: 'link',
    shareLink: 'https://example.com/mason-alder-july-invoice',
    recipientName: 'Mason & Alder',
    recipientEmail: 'billing@mason-alder.example',
    amount: 2190,
    currency: 'USD',
    approver: 'Riley Morgan',
    status: 'draft',
    createdAt: '2026-08-30T07:30:00.000Z',
    updatedAt: '2026-08-30T07:30:00.000Z',
    history: [
      { id: 'demo-mason-created', at: '2026-08-30T07:30:00.000Z', action: 'created', actor: 'Document owner', detail: 'Mason & Alder — July invoice was placed at the gate.' },
    ],
  },
  {
    id: 'demo-cedar-lane',
    title: 'Cedar Lane — repair quote',
    kind: 'quote',
    sourceType: 'link',
    shareLink: 'https://example.com/cedar-lane-repair-quote',
    recipientName: 'Cedar Lane',
    recipientEmail: 'office@cedar-lane.example',
    amount: 1250,
    currency: 'USD',
    approver: 'Avery Chen',
    status: 'approved',
    decisionComment: 'Scope, amount, and client email checked against the final quote.',
    createdAt: '2026-08-29T15:00:00.000Z',
    updatedAt: '2026-08-29T15:30:00.000Z',
    history: [
      { id: 'demo-cedar-created', at: '2026-08-29T15:00:00.000Z', action: 'created', actor: 'Document owner', detail: 'Cedar Lane — repair quote was placed at the gate.' },
      { id: 'demo-cedar-submitted', at: '2026-08-29T15:15:00.000Z', action: 'submitted', actor: 'Document owner', detail: 'Sent to Avery Chen for a second look.' },
      { id: 'demo-cedar-approved', at: '2026-08-29T15:30:00.000Z', action: 'approved', actor: 'Avery Chen', detail: 'Scope, amount, and client email checked against the final quote.' },
    ],
  },
];

export function sampleGates(): Gate[] {
  return SAMPLE_GATES.map((gate) => ({ ...gate, history: gate.history.map((event) => ({ ...event })) }));
}
