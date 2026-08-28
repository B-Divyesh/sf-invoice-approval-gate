export type GateStatus = 'draft' | 'awaiting' | 'approved' | 'rejected' | 'sent';
export type GateKind = 'invoice' | 'quote';
export type SourceType = 'pdf' | 'link';

export interface EncryptedDocument {
  name: string;
  mime: string;
  size: number;
  iv: number[];
  cipher: ArrayBuffer;
}

export interface AuditEvent {
  id: string;
  at: string;
  action: 'created' | 'edited' | 'submitted' | 'approved' | 'rejected' | 'returned' | 'sent' | 'reopened';
  actor: string;
  detail: string;
}

export interface Gate {
  id: string;
  title: string;
  kind: GateKind;
  sourceType: SourceType;
  document?: EncryptedDocument;
  shareLink?: string;
  recipientName: string;
  recipientEmail: string;
  amount: number;
  currency: string;
  approver: string;
  status: GateStatus;
  decisionComment?: string;
  createdAt: string;
  updatedAt: string;
  history: AuditEvent[];
}

export interface PortableDocument {
  name: string;
  mime: string;
  size: number;
  dataBase64: string;
}

export interface PortableGate extends Omit<Gate, 'document'> {
  document?: PortableDocument;
}

export interface SendGateExport {
  product: 'invoice-approval-gate';
  version: 1;
  exportedAt: string;
  warning: string;
  gates: PortableGate[];
}
