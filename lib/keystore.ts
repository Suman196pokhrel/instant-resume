import { activeModelSchema, type ActiveModel } from "./schemas/settings";
import type { ProviderId } from "./llm/providers";

// API keys stay in this browser (SPEC §8.2): each is AES-GCM encrypted with a non-extractable key kept in
// IndexedDB, decrypted only right before a call, never sent to the app's server and never in a backup.

const DB = "instant-resume-keystore";
const KEYS = "keys"; // the one CryptoKey
const CONNECTIONS = "connections";

export type Sealed = { iv: Uint8Array; ciphertext: ArrayBuffer };
/** `available`: the listed models this key can use, from its key test; absent on connections saved before that. */
export type Connection = { provider: ProviderId; masked: string; model: string; addedAt: number; available?: string[] };

/** Fired on window after any connection or active-model change, so every picker and Settings stay in step. */
export const LLM_CHANGED = "instant-resume-llm-changed";
const changed = () => window.dispatchEvent(new Event(LLM_CHANGED));

export const newCryptoKey = () => crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);

export async function encrypt(key: CryptoKey, text: string): Promise<Sealed> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  return { iv, ciphertext: await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(text)) };
}

export async function decrypt(key: CryptoKey, { iv, ciphertext }: Sealed): Promise<string> {
  return new TextDecoder().decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv as Uint8Array<ArrayBuffer> }, key, ciphertext));
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(KEYS);
      req.result.createObjectStore(CONNECTIONS, { keyPath: "provider" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Runs one request in a transaction and resolves with its result once the transaction commits. */
async function run<T>(store: string, mode: IDBTransactionMode, op: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, mode);
    const req = op(tx.objectStore(store));
    tx.oncomplete = () => (db.close(), resolve(req.result));
    tx.onerror = () => (db.close(), reject(tx.error));
  });
}

/** The device's CryptoKey, created on first use. */
async function cryptoKey(): Promise<CryptoKey> {
  const existing = await run<CryptoKey | undefined>(KEYS, "readonly", (s) => s.get("aes"));
  if (existing) return existing;
  const key = await newCryptoKey();
  await run(KEYS, "readwrite", (s) => s.put(key, "aes"));
  return key;
}

type Row = Connection & Sealed;

export async function listConnections(): Promise<Connection[]> {
  const rows = await run<Row[]>(CONNECTIONS, "readonly", (s) => s.getAll());
  return rows.map(({ provider, masked, model, addedAt, available }) => ({ provider, masked, model, addedAt, available }));
}

export async function saveConnection(provider: ProviderId, apiKey: string, masked: string, model: string, available: string[]): Promise<void> {
  const sealed = await encrypt(await cryptoKey(), apiKey.trim());
  await run(CONNECTIONS, "readwrite", (s) => s.put({ provider, masked, model, addedAt: Date.now(), available, ...sealed } satisfies Row));
  changed();
}

export async function setConnectionModel(provider: ProviderId, model: string): Promise<void> {
  const row = await run<Row | undefined>(CONNECTIONS, "readonly", (s) => s.get(provider));
  if (row) await run(CONNECTIONS, "readwrite", (s) => s.put({ ...row, model }));
  changed();
}

export async function removeConnection(provider: ProviderId): Promise<void> {
  await run(CONNECTIONS, "readwrite", (s) => s.delete(provider));
  changed();
}

/** The decrypted key, for the call about to be made (TASK-10), or null when there is none. */
export async function readKey(provider: ProviderId): Promise<string | null> {
  const row = await run<Row | undefined>(CONNECTIONS, "readonly", (s) => s.get(provider));
  return row ? decrypt(await cryptoKey(), row) : null;
}

// The active model is not secret: localStorage (SPEC §8.2).
const ACTIVE = "instant-resume-active-model";
let inMemory: ActiveModel | null = null; // used when storage is blocked: the choice lasts until reload
export function getActiveModel(): ActiveModel | null {
  try {
    return activeModelSchema.parse(JSON.parse(localStorage.getItem(ACTIVE) ?? "null"));
  } catch {
    return inMemory;
  }
}
export function setActiveModel(active: ActiveModel | null) {
  inMemory = active;
  try {
    if (active) localStorage.setItem(ACTIVE, JSON.stringify(active));
    else localStorage.removeItem(ACTIVE);
  } catch {
    // storage blocked: getActiveModel falls back to inMemory
  }
  changed();
}
