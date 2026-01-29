/**
 * IndexedDB storage layer for offline-first persistence
 * Stores encrypted CRDT updates and local state
 */
import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface ShoppingList {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
}

interface ShoppingListDB extends DBSchema {
  lists: {
    key: string;
    value: ShoppingList;
    indexes: { createdAt: number };
  };
  updates: {
    key: number;
    value: {
      id: number;
      timestamp: number;
      update: Uint8Array;
      encrypted: boolean;
    };
    indexes: { timestamp: number };
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
  
  db = await openDB<ShoppingListDB>('shopping-list-db', 2, {
    upgrade(database, oldVersion, _newVersion, transaction) {
      // Store for shopping lists
      if (!database.objectStoreNames.contains('lists')) {
        const listStore = database.createObjectStore('lists', {
          keyPath: 'id'
        });
        listStore.createIndex('createdAt', 'createdAt');
      }
      
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
      
      // Migration: Create default list from existing data
      if (oldVersion < 2) {
        const defaultList: ShoppingList = {
          id: 'default',
          name: 'Shopping List',
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        
        // Use the transaction passed to the upgrade function
        const tx = transaction.objectStore('lists');
        tx.put(defaultList);
      }
    }
  });
  
  return db;
}

/**
 * Store a CRDT update
 */
export async function storeUpdate(update: Uint8Array, encrypted = true): Promise<void> {
  try {
    const database = await initDB();
    await database.add('updates', {
      timestamp: Date.now(),
      update,
      encrypted
    } as any); // id will be auto-generated
  } catch (error) {
    // Silently fail if IndexedDB is not available (e.g., in tests)
    console.warn('Failed to store update:', error);
  }
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

/**
 * List Management Functions
 */

/**
 * Create a new shopping list
 */
export async function createList(name: string): Promise<ShoppingList> {
  const database = await initDB();
  const list: ShoppingList = {
    id: `list-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  
  await database.add('lists', list);
  return list;
}

/**
 * Get all shopping lists
 */
export async function getAllLists(): Promise<ShoppingList[]> {
  const database = await initDB();
  const lists = await database.getAll('lists');
  return lists.sort((a, b) => a.createdAt - b.createdAt);
}

/**
 * Get a specific list by ID
 */
export async function getList(id: string): Promise<ShoppingList | undefined> {
  const database = await initDB();
  return await database.get('lists', id);
}

/**
 * Update a shopping list
 */
export async function updateList(list: ShoppingList): Promise<void> {
  const database = await initDB();
  await database.put('lists', { ...list, updatedAt: Date.now() });
}

/**
 * Delete a shopping list and its updates
 */
export async function deleteList(id: string): Promise<void> {
  const database = await initDB();
  await database.delete('lists', id);
  // Note: In a real implementation, we'd also delete list-specific updates
  // For now, we keep the updates store simple
}

/**
 * Get the active list ID from metadata
 */
export async function getActiveListId(): Promise<string | undefined> {
  return await getMetadata('activeListId');
}

/**
 * Set the active list ID
 */
export async function setActiveListId(id: string): Promise<void> {
  await setMetadata('activeListId', id);
}
