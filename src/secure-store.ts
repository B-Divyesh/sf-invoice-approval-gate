import type { EncryptedDocument, Gate, PortableDocument, PortableGate, SendGateExport } from './types';

const DB_NAME = 'send-gate-local';
const DB_VERSION = 1;
const GATE_STORE = 'gates';
const KEY_STORAGE = 'sendgate:document-key';
export const MAX_FILE_BYTES = 15 * 1024 * 1024;

const GATE_STATUSES = ['draft', 'awaiting', 'approved', 'rejected', 'sent'] as const;
const GATE_KINDS = ['invoice', 'quote'] as const;
const SOURCE_TYPES = ['pdf', 'link'] as const;
const AUDIT_ACTIONS = ['created', 'edited', 'submitted', 'approved', 'rejected', 'returned', 'sent', 'reopened'] as const;
const CURRENCIES = ['USD', 'GBP', 'EUR', 'INR', 'CAD', 'AUD'] as const;

function requestValue<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('The local database could not be read.'));
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('The local database could not be updated.'));
    transaction.onabort = () => reject(transaction.error ?? new Error('The local database update was cancelled.'));
  });
}

export function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(GATE_STORE)) {
        const store = db.createObjectStore(GATE_STORE, { keyPath: 'id' });
        store.createIndex('updatedAt', 'updatedAt');
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Private local storage is unavailable.'));
    request.onblocked = () => reject(new Error('Close other Send Gate tabs, then try again.'));
  });
}

export async function getGates(): Promise<Gate[]> {
  const db = await openDatabase();
  try {
    const transaction = db.transaction(GATE_STORE, 'readonly');
    const records = await requestValue(transaction.objectStore(GATE_STORE).getAll() as IDBRequest<Gate[]>);
    return records.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } finally {
    db.close();
  }
}

export async function putGate(gate: Gate): Promise<void> {
  const db = await openDatabase();
  try {
    const transaction = db.transaction(GATE_STORE, 'readwrite');
    transaction.objectStore(GATE_STORE).put(gate);
    await transactionDone(transaction);
  } finally {
    db.close();
  }
}

export async function deleteGate(id: string): Promise<void> {
  const db = await openDatabase();
  try {
    const transaction = db.transaction(GATE_STORE, 'readwrite');
    transaction.objectStore(GATE_STORE).delete(id);
    await transactionDone(transaction);
  } finally {
    db.close();
  }
}

export async function replaceAllGates(gates: Gate[]): Promise<void> {
  const db = await openDatabase();
  try {
    const transaction = db.transaction(GATE_STORE, 'readwrite');
    const store = transaction.objectStore(GATE_STORE);
    store.clear();
    for (const gate of gates) store.put(gate);
    await transactionDone(transaction);
  } finally {
    db.close();
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  let output = '';
  const size = 0x8000;
  for (let index = 0; index < bytes.length; index += size) {
    output += String.fromCharCode(...bytes.subarray(index, index + size));
  }
  return btoa(output);
}

function base64ToBytes(value: string): Uint8Array {
  if (!value || value.length % 4 !== 0 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) {
    throw new Error('A PDF in the backup has invalid document data.');
  }
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

async function deviceKey(): Promise<CryptoKey> {
  let encoded = localStorage.getItem(KEY_STORAGE);
  if (!encoded) {
    const raw = crypto.getRandomValues(new Uint8Array(32));
    encoded = bytesToBase64(raw);
    localStorage.setItem(KEY_STORAGE, encoded);
  }
  const raw = base64ToBytes(encoded);
  return crypto.subtle.importKey('raw', raw as BufferSource, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

export function encryptionSupported(): boolean {
  return Boolean(globalThis.crypto?.subtle && globalThis.indexedDB);
}

function hasPdfHeader(bytes: Uint8Array): boolean {
  const prefix = new TextDecoder('latin1').decode(bytes.subarray(0, Math.min(bytes.length, 1024)));
  return prefix.includes('%PDF-');
}

export async function validatePdfFile(file: File): Promise<void> {
  if (!file.size) throw new Error('Choose a PDF file that is not empty, or use a secure share link.');
  if (file.size > MAX_FILE_BYTES) throw new Error('That PDF is larger than 15 MB. Use a smaller PDF or a secure share link.');
  const hasPdfIdentity = file.type === 'application/pdf' || (!file.type && file.name.toLowerCase().endsWith('.pdf'));
  if (!hasPdfIdentity || !hasPdfHeader(new Uint8Array(await file.slice(0, 1024).arrayBuffer()))) {
    throw new Error('That file is not a valid PDF. Choose a PDF document or use a secure share link.');
  }
}

export async function encryptDocument(file: File): Promise<EncryptedDocument> {
  if (!encryptionSupported()) throw new Error('This browser cannot encrypt local files. Use a current browser or add a share link instead.');
  await validatePdfFile(file);
  const key = await deviceKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plain = await file.arrayBuffer();
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plain);
  return { name: file.name, mime: 'application/pdf', size: file.size, iv: [...iv], cipher };
}

export async function decryptDocument(document: EncryptedDocument): Promise<Blob> {
  const key = await deviceKey();
  try {
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(document.iv) },
      key,
      document.cipher,
    );
    return new Blob([plain], { type: document.mime });
  } catch {
    throw new Error('This file could not be decrypted on this device. Restore a data export or replace the file.');
  }
}

async function portableDocument(document: EncryptedDocument): Promise<PortableDocument> {
  const blob = await decryptDocument(document);
  return {
    name: document.name,
    mime: document.mime,
    size: document.size,
    dataBase64: bytesToBase64(new Uint8Array(await blob.arrayBuffer())),
  };
}

export async function makeExport(gates: Gate[]): Promise<SendGateExport> {
  const portable: PortableGate[] = [];
  for (const gate of gates) {
    portable.push({
      ...gate,
      document: gate.document ? await portableDocument(gate.document) : undefined,
    });
  }
  return {
    product: 'invoice-approval-gate',
    version: 1,
    exportedAt: new Date().toISOString(),
    warning: 'This portable backup contains readable document data. Store it somewhere private.',
    gates: portable,
  };
}

export async function readExport(file: File): Promise<Gate[]> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    throw new Error('That file is not valid JSON. Choose a Send Gate backup.');
  }
  const bundle = parsed as Partial<SendGateExport>;
  if (
    bundle.product !== 'invoice-approval-gate' || bundle.version !== 1 || !Array.isArray(bundle.gates) ||
    !isIsoDate(bundle.exportedAt) || typeof bundle.warning !== 'string'
  ) {
    throw new Error('That is not a supported Send Gate backup.');
  }
  const portableGates = bundle.gates as unknown[];
  const ids = new Set<string>();
  const validated = portableGates.map((value) => validatePortableGate(value, ids));
  const restored: Gate[] = [];
  for (const portable of validated) {
    const document = portable.document;
    let encrypted: EncryptedDocument | undefined;
    if (document) {
      const bytes = base64ToBytes(document.dataBase64);
      const copy = new Uint8Array(bytes.byteLength);
      copy.set(bytes);
      encrypted = await encryptDocument(new File([copy.buffer], document.name, { type: document.mime }));
    }
    const { document: _portableDocument, ...gate } = portable;
    void _portableDocument;
    restored.push({ ...gate, document: encrypted } as Gate);
  }
  return restored;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: unknown, maxLength: number, allowEmpty = false): value is string {
  return typeof value === 'string' && value.length <= maxLength && (allowEmpty || value.trim().length > 0);
}

function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const time = Date.parse(value);
  return Number.isFinite(time) && new Date(time).toISOString() === value;
}

function isOneOf<T extends readonly string[]>(value: unknown, values: T): value is T[number] {
  return typeof value === 'string' && values.includes(value as T[number]);
}

function isHttpUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

function validEmail(value: unknown): value is string {
  return isString(value, 160) && /^[^\s@]+@[^\s@]+$/.test(value);
}

function validatePortableGate(value: unknown, ids: Set<string>): PortableGate {
  if (!isRecord(value)) throw new Error('The backup contains an incomplete or invalid gate.');
  const gate = value as Record<string, unknown>;
  if (
    !isString(gate.id, 100) || ids.has(gate.id) || !isString(gate.title, 80) ||
    !isOneOf(gate.kind, GATE_KINDS) || !isOneOf(gate.sourceType, SOURCE_TYPES) ||
    !isString(gate.recipientName, 100) || !validEmail(gate.recipientEmail) ||
    typeof gate.amount !== 'number' || !Number.isFinite(gate.amount) || gate.amount < 0 ||
    !isOneOf(gate.currency, CURRENCIES) || !isString(gate.approver, 100) ||
    !isOneOf(gate.status, GATE_STATUSES) || !isIsoDate(gate.createdAt) || !isIsoDate(gate.updatedAt) ||
    !Array.isArray(gate.history) || gate.history.length === 0 ||
    (gate.decisionComment !== undefined && !isString(gate.decisionComment, 500, true))
  ) throw new Error('The backup contains an incomplete or invalid gate.');
  if (Date.parse(gate.updatedAt) < Date.parse(gate.createdAt)) throw new Error('The backup contains an invalid gate date.');

  for (const event of gate.history) {
    if (
      !isRecord(event) || !isString(event.id, 100) || !isIsoDate(event.at) ||
      !isOneOf(event.action, AUDIT_ACTIONS) || !isString(event.actor, 100) || !isString(event.detail, 1000)
    ) throw new Error('The backup contains an invalid approval-history event.');
  }

  let portableDocument: PortableDocument | undefined;
  if (gate.sourceType === 'pdf') {
    if (gate.shareLink !== undefined) throw new Error('A PDF gate in the backup has invalid source metadata.');
    if (!isRecord(gate.document)) throw new Error('A PDF gate in the backup is missing its document.');
    const document = gate.document;
    if (
      !isString(document.name, 255) ||
      document.mime !== 'application/pdf' || typeof document.size !== 'number' ||
      !Number.isInteger(document.size) || document.size <= 0 || document.size > MAX_FILE_BYTES ||
      typeof document.dataBase64 !== 'string'
    ) throw new Error('A PDF gate in the backup has invalid document metadata.');
    const maximumEncodedSize = Math.ceil(document.size / 3) * 4;
    if (document.dataBase64.length !== maximumEncodedSize) {
      throw new Error('A PDF in the backup has invalid document data.');
    }
    const bytes = base64ToBytes(document.dataBase64);
    if (bytes.byteLength !== document.size || !hasPdfHeader(bytes)) {
      throw new Error('A PDF in the backup has invalid document data.');
    }
    portableDocument = document as unknown as PortableDocument;
  } else {
    if (!isHttpUrl(gate.shareLink) || gate.document !== undefined) {
      throw new Error('A share-link gate in the backup has an invalid URL or document.');
    }
  }

  ids.add(gate.id);
  return { ...gate, document: portableDocument } as unknown as PortableGate;
}
