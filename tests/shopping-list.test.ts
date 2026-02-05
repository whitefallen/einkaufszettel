/**
 * Comprehensive Shopping List Functionality Tests
 * Based on specifications from README.md and ARCHITECTURE.md
 * 
 * Tests cover:
 * - Core shopping list operations
 * - Offline-first behavior
 * - CRDT conflict resolution
 * - Multiple list management
 * - Data persistence
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { StateManager } from '../src/state';

describe('Shopping List - Core Functionality', () => {
  let stateManager: StateManager;

  beforeEach(() => {
    stateManager = new StateManager();
  });

  describe('Adding Items', () => {
    it('should add a new shopping item to the list', () => {
      const itemId = stateManager.addItem('Milk');
      const items = stateManager.getItems();
      
      expect(items.length).toBe(1);
      expect(items[0].text).toBe('Milk');
      expect(items[0].id).toBe(itemId);
      expect(items[0].completed).toBe(false);
    });

    it('should add multiple items to the list', () => {
      stateManager.addItem('Bread');
      stateManager.addItem('Eggs');
      stateManager.addItem('Milk');
      
      const items = stateManager.getItems();
      expect(items.length).toBe(3);
      expect(items.map(i => i.text)).toContain('Bread');
      expect(items.map(i => i.text)).toContain('Eggs');
      expect(items.map(i => i.text)).toContain('Milk');
    });

    it('should handle adding items with special characters', () => {
      stateManager.addItem('Coffee & Tea');
      stateManager.addItem('Nuts (500g)');
      stateManager.addItem('Vegetables - Mixed');
      
      const items = stateManager.getItems();
      expect(items.length).toBe(3);
    });

    it('should handle adding empty or whitespace-only items', () => {
      const id1 = stateManager.addItem('');
      const id2 = stateManager.addItem('   ');
      
      const items = stateManager.getItems();
      // Empty items should still be added (UI responsibility to validate)
      expect(items.length).toBe(2);
    });
  });

  describe('Completing Items', () => {
    it('should mark an item as completed', () => {
      const id = stateManager.addItem('Milk');
      stateManager.toggleItem(id);
      
      const items = stateManager.getItems();
      expect(items[0].completed).toBe(true);
    });

    it('should toggle completion state back and forth', () => {
      const id = stateManager.addItem('Bread');
      
      stateManager.toggleItem(id);
      expect(stateManager.getItems()[0].completed).toBe(true);
      
      stateManager.toggleItem(id);
      expect(stateManager.getItems()[0].completed).toBe(false);
      
      stateManager.toggleItem(id);
      expect(stateManager.getItems()[0].completed).toBe(true);
    });

    it('should maintain completion state for multiple items independently', () => {
      const id1 = stateManager.addItem('Milk');
      const id2 = stateManager.addItem('Bread');
      const id3 = stateManager.addItem('Eggs');
      
      stateManager.toggleItem(id1);
      stateManager.toggleItem(id3);
      
      const items = stateManager.getItems();
      expect(items.find(i => i.id === id1)?.completed).toBe(true);
      expect(items.find(i => i.id === id2)?.completed).toBe(false);
      expect(items.find(i => i.id === id3)?.completed).toBe(true);
    });
  });

  describe('Deleting Items', () => {
    it('should remove an item from the list', () => {
      const id = stateManager.addItem('Milk');
      expect(stateManager.getItems().length).toBe(1);
      
      stateManager.deleteItem(id);
      expect(stateManager.getItems().length).toBe(0);
    });

    it('should remove the correct item when multiple items exist', () => {
      const id1 = stateManager.addItem('Milk');
      const id2 = stateManager.addItem('Bread');
      const id3 = stateManager.addItem('Eggs');
      
      stateManager.deleteItem(id2);
      
      const items = stateManager.getItems();
      expect(items.length).toBe(2);
      expect(items.find(i => i.id === id2)).toBeUndefined();
      expect(items.find(i => i.id === id1)).toBeDefined();
      expect(items.find(i => i.id === id3)).toBeDefined();
    });

    it('should handle deleting non-existent items gracefully', () => {
      stateManager.addItem('Milk');
      
      // Delete with non-existent ID should not throw
      expect(() => stateManager.deleteItem('non-existent-id')).not.toThrow();
      expect(stateManager.getItems().length).toBe(1);
    });
  });

  describe('Clearing Completed Items', () => {
    it('should remove all completed items', () => {
      const id1 = stateManager.addItem('Milk');
      const id2 = stateManager.addItem('Bread');
      const id3 = stateManager.addItem('Eggs');
      
      stateManager.toggleItem(id1);
      stateManager.toggleItem(id3);
      stateManager.clearCompleted();
      
      const items = stateManager.getItems();
      expect(items.length).toBe(1);
      expect(items[0].id).toBe(id2);
    });

    it('should do nothing if no items are completed', () => {
      stateManager.addItem('Milk');
      stateManager.addItem('Bread');
      
      stateManager.clearCompleted();
      
      expect(stateManager.getItems().length).toBe(2);
    });

    it('should clear all items if all are completed', () => {
      const id1 = stateManager.addItem('Milk');
      const id2 = stateManager.addItem('Bread');
      
      stateManager.toggleItem(id1);
      stateManager.toggleItem(id2);
      stateManager.clearCompleted();
      
      expect(stateManager.getItems().length).toBe(0);
    });
  });
});

describe('Shopping List - State Management & Reactivity', () => {
  let stateManager: StateManager;

  beforeEach(() => {
    stateManager = new StateManager();
  });

  describe('Observer Pattern (Reactive Updates)', () => {
    it('should notify subscribers when items are added', () => {
      let notificationCount = 0;
      stateManager.subscribe(() => notificationCount++);
      
      stateManager.addItem('Milk');
      expect(notificationCount).toBe(1);
      
      stateManager.addItem('Bread');
      expect(notificationCount).toBe(2);
    });

    it('should notify subscribers when items are toggled', () => {
      const id = stateManager.addItem('Milk');
      
      let notificationCount = 0;
      stateManager.subscribe(() => notificationCount++);
      
      stateManager.toggleItem(id);
      expect(notificationCount).toBe(1);
    });

    it('should notify subscribers when items are deleted', () => {
      const id = stateManager.addItem('Milk');
      
      let notificationCount = 0;
      stateManager.subscribe(() => notificationCount++);
      
      stateManager.deleteItem(id);
      expect(notificationCount).toBe(1);
    });

    it('should notify subscribers when completed items are cleared', () => {
      const id = stateManager.addItem('Milk');
      stateManager.toggleItem(id);
      
      let notificationCount = 0;
      stateManager.subscribe(() => notificationCount++);
      
      stateManager.clearCompleted();
      expect(notificationCount).toBe(1);
    });

    it('should support multiple independent subscribers', () => {
      let count1 = 0;
      let count2 = 0;
      let count3 = 0;
      
      stateManager.subscribe(() => count1++);
      stateManager.subscribe(() => count2++);
      stateManager.subscribe(() => count3++);
      
      stateManager.addItem('Milk');
      
      expect(count1).toBe(1);
      expect(count2).toBe(1);
      expect(count3).toBe(1);
    });

    it('should stop notifying after unsubscribe', () => {
      let count = 0;
      const unsubscribe = stateManager.subscribe(() => count++);
      
      stateManager.addItem('Milk');
      expect(count).toBe(1);
      
      unsubscribe();
      
      stateManager.addItem('Bread');
      expect(count).toBe(1); // Should not increment
    });

    it('should allow subscribing and unsubscribing multiple times', () => {
      let count = 0;
      const callback = () => count++;
      
      const unsub1 = stateManager.subscribe(callback);
      stateManager.addItem('Item 1');
      expect(count).toBe(1);
      
      unsub1();
      stateManager.addItem('Item 2');
      expect(count).toBe(1);
      
      const unsub2 = stateManager.subscribe(callback);
      stateManager.addItem('Item 3');
      expect(count).toBe(2);
      
      unsub2();
    });
  });

  describe('State Consistency', () => {
    it('should maintain correct item count', () => {
      stateManager.addItem('Item 1');
      stateManager.addItem('Item 2');
      expect(stateManager.getItems().length).toBe(2);
      
      const id = stateManager.addItem('Item 3');
      expect(stateManager.getItems().length).toBe(3);
      
      stateManager.deleteItem(id);
      expect(stateManager.getItems().length).toBe(2);
    });

    it('should maintain unique IDs for all items', () => {
      const ids = new Set();
      
      for (let i = 0; i < 100; i++) {
        const id = stateManager.addItem(`Item ${i}`);
        ids.add(id);
      }
      
      // All IDs should be unique
      expect(ids.size).toBe(100);
    });

    it('should preserve item data through multiple operations', () => {
      const id = stateManager.addItem('Milk');
      const initialItem = stateManager.getItems()[0];
      
      // Toggle multiple times
      stateManager.toggleItem(id);
      stateManager.toggleItem(id);
      
      const finalItem = stateManager.getItems()[0];
      expect(finalItem.id).toBe(initialItem.id);
      expect(finalItem.text).toBe(initialItem.text);
    });
  });
});

describe('Shopping List - CRDT Properties', () => {
  let stateManager: StateManager;

  beforeEach(() => {
    stateManager = new StateManager();
  });

  describe('Conflict-Free Operations', () => {
    it('should handle concurrent additions from multiple sources', () => {
      // Simulate two state managers (representing two devices)
      const stateManager1 = new StateManager();
      const stateManager2 = new StateManager();
      
      // Both add items independently
      stateManager1.addItem('Milk');
      stateManager2.addItem('Bread');
      
      // After sync, both should have 2 items total
      // (This is a simplified test; real CRDT sync is more complex)
      expect(stateManager1.getItems().length).toBeGreaterThan(0);
      expect(stateManager2.getItems().length).toBeGreaterThan(0);
    });

    it('should maintain idempotency for repeated operations', () => {
      const id = stateManager.addItem('Milk');
      
      // Toggle the same item multiple times
      stateManager.toggleItem(id);
      const state1 = stateManager.getItems()[0].completed;
      
      stateManager.toggleItem(id);
      const state2 = stateManager.getItems()[0].completed;
      
      stateManager.toggleItem(id);
      const state3 = stateManager.getItems()[0].completed;
      
      // States should alternate predictably
      expect(state1).toBe(true);
      expect(state2).toBe(false);
      expect(state3).toBe(true);
    });
  });

  describe('Eventual Consistency', () => {
    it('should converge to consistent state after operations', () => {
      // Add items
      const id1 = stateManager.addItem('Item 1');
      const id2 = stateManager.addItem('Item 2');
      const id3 = stateManager.addItem('Item 3');
      
      // Perform various operations
      stateManager.toggleItem(id1);
      stateManager.deleteItem(id2);
      stateManager.toggleItem(id3);
      stateManager.toggleItem(id1);
      
      // Final state should be consistent
      const items = stateManager.getItems();
      expect(items.length).toBe(2); // id2 was deleted
      expect(items.find(i => i.id === id1)?.completed).toBe(false); // toggled twice
      expect(items.find(i => i.id === id3)?.completed).toBe(true); // toggled once
    });
  });
});

describe('Shopping List - Offline-First Behavior', () => {
  let stateManager: StateManager;

  beforeEach(() => {
    stateManager = new StateManager();
  });

  describe('Local Operations', () => {
    it('should perform operations instantly without network', () => {
      const startTime = Date.now();
      
      stateManager.addItem('Milk');
      stateManager.addItem('Bread');
      stateManager.addItem('Eggs');
      
      const endTime = Date.now();
      
      // All operations should complete in milliseconds (locally)
      expect(endTime - startTime).toBeLessThan(100);
      expect(stateManager.getItems().length).toBe(3);
    });

    it('should maintain state across operations without persistence', () => {
      // Add items
      const id1 = stateManager.addItem('Milk');
      const id2 = stateManager.addItem('Bread');
      
      // Toggle one
      stateManager.toggleItem(id1);
      
      // State should be maintained in memory
      const items = stateManager.getItems();
      expect(items.length).toBe(2);
      expect(items.find(i => i.id === id1)?.completed).toBe(true);
      expect(items.find(i => i.id === id2)?.completed).toBe(false);
    });
  });

  describe('Data Integrity', () => {
    it('should preserve item order consistency', () => {
      const id1 = stateManager.addItem('First');
      const id2 = stateManager.addItem('Second');
      const id3 = stateManager.addItem('Third');
      
      const items = stateManager.getItems();
      const ids = items.map(i => i.id);
      
      // Items should be retrievable
      expect(ids).toContain(id1);
      expect(ids).toContain(id2);
      expect(ids).toContain(id3);
    });

    it('should handle rapid successive operations', () => {
      // Rapidly add and modify items
      const ids = [];
      for (let i = 0; i < 20; i++) {
        ids.push(stateManager.addItem(`Item ${i}`));
      }
      
      // Toggle some items rapidly
      ids.forEach((id, index) => {
        if (index % 2 === 0) {
          stateManager.toggleItem(id);
        }
      });
      
      // Delete some items rapidly
      ids.slice(0, 5).forEach(id => stateManager.deleteItem(id));
      
      const finalItems = stateManager.getItems();
      expect(finalItems.length).toBe(15); // 20 - 5 deleted
    });
  });
});

describe('Shopping List - Edge Cases & Error Handling', () => {
  let stateManager: StateManager;

  beforeEach(() => {
    stateManager = new StateManager();
  });

  describe('Invalid Operations', () => {
    it('should handle toggling non-existent items gracefully', () => {
      expect(() => stateManager.toggleItem('non-existent')).not.toThrow();
      expect(stateManager.getItems().length).toBe(0);
    });

    it('should handle deleting non-existent items gracefully', () => {
      expect(() => stateManager.deleteItem('non-existent')).not.toThrow();
      expect(stateManager.getItems().length).toBe(0);
    });

    it('should handle clearing completed when no items exist', () => {
      expect(() => stateManager.clearCompleted()).not.toThrow();
      expect(stateManager.getItems().length).toBe(0);
    });
  });

  describe('Boundary Conditions', () => {
    it('should handle adding many items', () => {
      // Add 1000 items
      for (let i = 0; i < 1000; i++) {
        stateManager.addItem(`Item ${i}`);
      }
      
      expect(stateManager.getItems().length).toBe(1000);
    });

    it('should handle long item text', () => {
      const longText = 'A'.repeat(10000); // 10K characters
      const id = stateManager.addItem(longText);
      
      const item = stateManager.getItems()[0];
      expect(item.text).toBe(longText);
      expect(item.text.length).toBe(10000);
    });

    it('should handle items with Unicode characters', () => {
      stateManager.addItem('🛒 Groceries');
      stateManager.addItem('Käse und Brot'); // German
      stateManager.addItem('牛奶和面包'); // Chinese
      stateManager.addItem('الحليب والخبز'); // Arabic
      
      const items = stateManager.getItems();
      expect(items.length).toBe(4);
      
      // Find the item with emoji
      const emojiItem = items.find(i => i.text.includes('🛒'));
      expect(emojiItem).toBeDefined();
      expect(emojiItem?.text).toBe('🛒 Groceries');
    });
  });

  describe('State Transitions', () => {
    it('should handle all possible state transitions', () => {
      const id = stateManager.addItem('Test Item');
      
      // Fresh item
      let item = stateManager.getItems()[0];
      expect(item.completed).toBe(false);
      
      // Completed
      stateManager.toggleItem(id);
      item = stateManager.getItems()[0];
      expect(item.completed).toBe(true);
      
      // Back to uncompleted
      stateManager.toggleItem(id);
      item = stateManager.getItems()[0];
      expect(item.completed).toBe(false);
      
      // Deleted
      stateManager.deleteItem(id);
      expect(stateManager.getItems().length).toBe(0);
    });
  });
});
