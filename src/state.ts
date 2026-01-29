/**
 * CRDT-based state management using Yjs
 * The CRDT document is the single source of truth for all application state
 */
import * as Y from 'yjs';
import { encodeStateAsUpdate, applyUpdate } from 'yjs';
import { storeUpdate, getAllUpdates } from './storage';

export interface ShoppingItem {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
  updatedAt: number;
}

/**
 * State manager wrapping the Yjs CRDT document
 */
export class StateManager {
  private doc: Y.Doc;
  private items: Y.Map<ShoppingItem>;
  private listeners: Set<() => void> = new Set();
  
  constructor() {
    this.doc = new Y.Doc();
    this.items = this.doc.getMap('items');
    
    // Persist updates to IndexedDB
    this.doc.on('update', (update: Uint8Array) => {
      storeUpdate(update).catch(console.error);
    });
  }
  
  /**
   * Initialize state from stored updates
   */
  async restore(): Promise<void> {
    const updates = await getAllUpdates();
    for (const update of updates) {
      applyUpdate(this.doc, update);
    }
  }
  
  /**
   * Add a new shopping item
   */
  addItem(text: string): string {
    const id = `item-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const item: ShoppingItem = {
      id,
      text,
      completed: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    this.items.set(id, item);
    this.notifyListeners();
    return id;
  }
  
  /**
   * Toggle item completion status
   */
  toggleItem(id: string): void {
    const item = this.items.get(id);
    if (item) {
      this.items.set(id, {
        ...item,
        completed: !item.completed,
        updatedAt: Date.now()
      });
      this.notifyListeners();
    }
  }
  
  /**
   * Delete an item
   */
  deleteItem(id: string): void {
    this.items.delete(id);
    this.notifyListeners();
  }
  
  /**
   * Clear all completed items
   */
  clearCompleted(): void {
    const toDelete: string[] = [];
    this.items.forEach((item, id) => {
      if (item.completed) {
        toDelete.push(id);
      }
    });
    
    toDelete.forEach(id => this.items.delete(id));
    this.notifyListeners();
  }
  
  /**
   * Get all items as an array
   */
  getItems(): ShoppingItem[] {
    const items: ShoppingItem[] = [];
    this.items.forEach(item => items.push(item));
    return items.sort((a, b) => b.createdAt - a.createdAt);
  }
  
  /**
   * Get the current document state as an update
   */
  getStateUpdate(): Uint8Array {
    return encodeStateAsUpdate(this.doc);
  }
  
  /**
   * Apply an update from another peer
   */
  applyUpdate(update: Uint8Array): void {
    applyUpdate(this.doc, update);
    this.notifyListeners();
  }
  
  /**
   * Subscribe to state changes
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  
  /**
   * Notify all listeners of state change
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }
  
  /**
   * Get the underlying Yjs document
   */
  getDoc(): Y.Doc {
    return this.doc;
  }
}

// Global state manager instance
let stateManager: StateManager | null = null;

/**
 * Get or create the global state manager
 */
export function getStateManager(): StateManager {
  if (!stateManager) {
    stateManager = new StateManager();
  }
  return stateManager;
}
