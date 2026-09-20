/**
 * IndexedDB persistence for the last used watermark logo.
 *
 * All functions reject with descriptive errors; callers must treat storage as
 * best-effort so a failing/quota-limited IDB never blocks the current session.
 */

import type { WatermarkLogoRecord } from '@/types/watermark';

const DB_NAME = 'proconverter-watermark';
const DB_VERSION = 1;
const STORE_NAME = 'logo';
const RECORD_KEY = 'current';

export function isIndexedDBAvailable(): boolean {
  try {
    return typeof indexedDB !== 'undefined' && indexedDB !== null;
  } catch {
    return false;
  }
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise<IDBDatabase>((resolve, reject) => {
    if (!isIndexedDBAvailable()) {
      reject(new Error('IndexedDB is not supported in this browser.'));
      return;
    }

    let request: IDBOpenDBRequest;
    try {
      request = indexedDB.open(DB_NAME, DB_VERSION);
    } catch (error) {
      reject(error instanceof Error ? error : new Error('Failed to open IndexedDB.'));
      return;
    }

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB.'));
    request.onblocked = () => {
      // Another tab holds an older version open; surface it instead of hanging.
      reject(new Error('IndexedDB is blocked by another tab. Close it and try again.'));
    };
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const database = await openDatabase();
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, mode);
      const store = transaction.objectStore(STORE_NAME);
      let request: IDBRequest<T>;
      try {
        request = operation(store);
      } catch (error) {
        reject(error instanceof Error ? error : new Error('IndexedDB operation failed.'));
        return;
      }
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('IndexedDB operation failed.'));
      transaction.onabort = () =>
        reject(transaction.error ?? new Error('IndexedDB transaction was aborted.'));
    });
  } finally {
    database.close();
  }
}

export async function saveLogo(record: WatermarkLogoRecord): Promise<void> {
  await withStore<IDBValidKey>('readwrite', (store) => store.put(record, RECORD_KEY));
}

export async function loadLogo(): Promise<WatermarkLogoRecord | null> {
  const result = await withStore<WatermarkLogoRecord | undefined>('readonly', (store) =>
    store.get(RECORD_KEY)
  );
  if (!result) return null;
  // Guard against stale/corrupted records from older versions.
  if (!(result.blob instanceof Blob)) return null;
  return result;
}

export async function deleteLogo(): Promise<void> {
  await withStore<undefined>('readwrite', (store) => store.delete(RECORD_KEY) as IDBRequest<undefined>);
}
