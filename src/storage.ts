/**
 * IndexedDB storage layer for offline-first persistence
 * Stores encrypted CRDT updates and local state
 */
import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface ShoppingListDB extends DBSchema {
  updates: {
    key: number;
    value: {
      id: number;
      timestamp: number;
      update: Uint8Array;
      encrypted: boolean;
    };
  };
  metadata: {
    key: string;
    value: {
      key: string;
      value: string;
    };
  };
}

let db: IDBPDatabase<ShoppingListDB> | null = null;

/**
 * Initialize the IndexedDB database
 */
export async function initDB(): Promise<IDBPDatabase<ShoppingListDB>> {
  if (db) return db;
  
  db = await openDB<ShoppingListDB>('shopping-list-db', 1, {
    upgrade(database) {
      // Store for CRDT updates
      if (!database.objectStoreNames.contains('updates')) {
        const updateStore = database.createObjectStore('updates', {
          keyPath: 'id',
          autoIncrement: true
        });
        updateStore.createIndex('timestamp', 'timestamp');
      }
      
      // Store for metadata (keys, settings, etc.)
      if (!database.objectStoreNames.contains('metadata')) {
        database.createObjectStore('metadata', {
          keyPath: 'key'
        });
      }
    }
  });
  
  return db;
}

/**
 * Store a CRDT update
 */
export async function storeUpdate(update: Uint8Array, encrypted = true): Promise<void> {
  const database = await initDB();
  await database.add('updates', {
    id: Date.now(),
    timestamp: Date.now(),
    update,
    encrypted
  });
}

/**
 * Get all updates since a timestamp
 */
export async function getUpdatesSince(timestamp: number): Promise<Uint8Array[]> {
  const database = await initDB();
  const tx = database.transaction('updates', 'readonly');
  const index = tx.store.index('timestamp');
  const range = IDBKeyRange.lowerBound(timestamp, true);
  const updates = await index.getAll(range);
  
  return updates.map(u => u.update);
}

/**
 * Get all stored updates
 */
export async function getAllUpdates(): Promise<Uint8Array[]> {
  const database = await initDB();
  const updates = await database.getAll('updates');
  return updates.map(u => u.update);
}

/**
 * Clear all updates (for fresh sync)
 */
export async function clearUpdates(): Promise<void> {
  const database = await initDB();
  await database.clear('updates');
}

/**
 * Store metadata (e.g., encryption keys, sync tokens)
 */
export async function setMetadata(key: string, value: string): Promise<void> {
  const database = await initDB();
  await database.put('metadata', { key, value });
}

/**
 * Get metadata by key
 */
export async function getMetadata(key: string): Promise<string | undefined> {
  const database = await initDB();
  const item = await database.get('metadata', key);
  return item?.value;
}

/**
 * Delete metadata by key
 */
export async function deleteMetadata(key: string): Promise<void> {
  const database = await initDB();
  await database.delete('metadata', key);
}

/**
 * Check if database is initialized
 */
export function isDBInitialized(): boolean {
  return db !== null;
}
