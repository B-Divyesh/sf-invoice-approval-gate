import type { EncryptedDocument, Gate, PortableDocument, PortableGate, SendGateExport } from './types';

const DB_NAME = 'send-gate-local';
const DB_VERSION = 1;
const GATE_STORE = 'gates';
const KEY_STORAGE = 'sendgate:document-key';

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

export async function encryptDocument(file: File): Promise<EncryptedDocument> {
  if (!encryptionSupported()) throw new Error('This browser cannot encrypt local files. Use a current browser or add a share link instead.');
  const key = await deviceKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plain = await file.arrayBuffer();
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plain);
  return { name: file.name, mime: file.type || 'application/pdf', size: file.size, iv: [...iv], cipher };
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
  if (bundle.product !== 'invoice-approval-gate' || bundle.version !== 1 || !Array.isArray(bundle.gates)) {
    throw new Error('That is not a supported Send Gate backup.');
  }
  const restored: Gate[] = [];
  for (const portable of bundle.gates) {
    const validStatus = ['draft', 'awaiting', 'approved', 'rejected', 'sent'].includes(portable.status);
    const validKind = ['invoice', 'quote'].includes(portable.kind);
    const validSource = ['pdf', 'link'].includes(portable.sourceType);
    const validAmount = typeof portable.amount === 'number' && Number.isFinite(portable.amount) && portable.amount >= 0;
    if (
      !portable.id || !portable.title || !portable.recipientName || !portable.recipientEmail || !portable.approver ||
      !portable.currency || !portable.createdAt || !portable.updatedAt || !Array.isArray(portable.history) ||
      !validStatus || !validKind || !validSource || !validAmount
    ) throw new Error('The backup contains an incomplete or invalid gate.');
    if (portable.sourceType === 'pdf' && !portable.document) throw new Error('A PDF gate in the backup is missing its document.');
    if (portable.sourceType === 'link') {
      try {
        const url = new URL(portable.shareLink ?? '');
        if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
      } catch {
        throw new Error('A share-link gate in the backup has an invalid URL.');
      }
    }
    const document = portable.document;
    let encrypted: EncryptedDocument | undefined;
    if (document) {
      const bytes = base64ToBytes(document.dataBase64);
      encrypted = await encryptDocument(new File([new Uint8Array(bytes).buffer as ArrayBuffer], document.name, { type: document.mime }));
    }
    const { document: _portableDocument, ...gate } = portable;
    void _portableDocument;
    restored.push({ ...gate, document: encrypted } as Gate);
  }
  return restored;
}
