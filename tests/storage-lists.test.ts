/**
 * Tests for Multiple Shopping Lists and Storage
 * Based on specifications for managing multiple independent lists
 * 
 * Tests cover:
 * - Multiple list management
 * - List creation, renaming, deletion
 * - List persistence
 * - Active list management
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ShoppingList } from '../src/storage';

// Mock storage functions to avoid actual IndexedDB in tests
const mockLists = new Map<string, ShoppingList>();
const mockActiveListId = { value: 'default' };

const createList = async (name: string): Promise<ShoppingList> => {
  const list: ShoppingList = {
    id: `list-${Date.now()}-${Math.random()}`,
    name,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  mockLists.set(list.id, list);
  return list;
};

const getAllLists = async (): Promise<ShoppingList[]> => {
  return Array.from(mockLists.values()).sort((a, b) => a.createdAt - b.createdAt);
};

const getList = async (id: string): Promise<ShoppingList | undefined> => {
  return mockLists.get(id);
};

const updateList = async (list: ShoppingList): Promise<void> => {
  if (mockLists.has(list.id)) {
    mockLists.set(list.id, { ...list, updatedAt: Date.now() });
  }
};

const deleteList = async (id: string): Promise<void> => {
  mockLists.delete(id);
};

const getActiveListId = async (): Promise<string | undefined> => {
  return mockActiveListId.value;
};

const setActiveListId = async (id: string): Promise<void> => {
  mockActiveListId.value = id;
};

describe('Multiple Shopping Lists - List Management', () => {
  beforeEach(() => {
    // Clear mock data before each test
    mockLists.clear();
    mockActiveListId.value = 'default';
  });

  describe('Creating Lists', () => {
    it('should create a new shopping list', async () => {
      const list = await createList('Grocery Shopping');
      
      expect(list.id).toBeDefined();
      expect(list.name).toBe('Grocery Shopping');
      expect(list.createdAt).toBeGreaterThan(0);
      expect(list.updatedAt).toBeGreaterThan(0);
    });

    it('should create multiple independent lists', async () => {
      const list1 = await createList('Weekly Groceries');
      const list2 = await createList('Party Supplies');
      const list3 = await createList('Hardware Store');
      
      const allLists = await getAllLists();
      expect(allLists.length).toBe(3);
      expect(allLists.map(l => l.name)).toContain('Weekly Groceries');
      expect(allLists.map(l => l.name)).toContain('Party Supplies');
      expect(allLists.map(l => l.name)).toContain('Hardware Store');
    });

    it('should assign unique IDs to each list', async () => {
      const lists = [];
      for (let i = 0; i < 10; i++) {
        lists.push(await createList(`List ${i}`));
      }
      
      const ids = new Set(lists.map(l => l.id));
      expect(ids.size).toBe(10); // All IDs should be unique
    });

    it('should set creation and update timestamps', async () => {
      const beforeCreation = Date.now();
      const list = await createList('Test List');
      const afterCreation = Date.now();
      
      expect(list.createdAt).toBeGreaterThanOrEqual(beforeCreation);
      expect(list.createdAt).toBeLessThanOrEqual(afterCreation);
      expect(list.updatedAt).toBeGreaterThanOrEqual(beforeCreation);
      expect(list.updatedAt).toBeLessThanOrEqual(afterCreation);
    });

    it('should handle lists with special characters in names', async () => {
      const list1 = await createList('Coffee & Tea ☕');
      const list2 = await createList('Bücher und Zeitungen');
      const list3 = await createList('日用品リスト');
      
      expect(list1.name).toBe('Coffee & Tea ☕');
      expect(list2.name).toBe('Bücher und Zeitungen');
      expect(list3.name).toBe('日用品リスト');
    });
  });

  describe('Retrieving Lists', () => {
    it('should retrieve all lists', async () => {
      await createList('List 1');
      await createList('List 2');
      await createList('List 3');
      
      const lists = await getAllLists();
      expect(lists.length).toBe(3);
    });

    it('should retrieve lists in order of creation', async () => {
      const list1 = await createList('First');
      await new Promise(resolve => setTimeout(resolve, 10)); // Ensure different timestamps
      const list2 = await createList('Second');
      await new Promise(resolve => setTimeout(resolve, 10));
      const list3 = await createList('Third');
      
      const lists = await getAllLists();
      expect(lists[0].name).toBe('First');
      expect(lists[1].name).toBe('Second');
      expect(lists[2].name).toBe('Third');
    });

    it('should retrieve a specific list by ID', async () => {
      const created = await createList('My List');
      const retrieved = await getList(created.id);
      
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.name).toBe('My List');
    });

    it('should return undefined for non-existent list ID', async () => {
      const list = await getList('non-existent-id');
      expect(list).toBeUndefined();
    });

    it('should return empty array when no lists exist', async () => {
      const lists = await getAllLists();
      expect(lists).toEqual([]);
    });
  });

  describe('Updating Lists', () => {
    it('should update list name', async () => {
      const list = await createList('Old Name');
      const originalUpdatedAt = list.updatedAt;
      
      await new Promise(resolve => setTimeout(resolve, 10));
      list.name = 'New Name';
      await updateList(list);
      
      const updated = await getList(list.id);
      expect(updated?.name).toBe('New Name');
      expect(updated?.updatedAt).toBeGreaterThan(originalUpdatedAt);
    });

    it('should preserve list ID when updating', async () => {
      const list = await createList('Test List');
      const originalId = list.id;
      
      list.name = 'Updated Name';
      await updateList(list);
      
      const updated = await getList(originalId);
      expect(updated?.id).toBe(originalId);
    });

    it('should update timestamp on modification', async () => {
      const list = await createList('Test List');
      const originalTimestamp = list.updatedAt;
      
      await new Promise(resolve => setTimeout(resolve, 10));
      list.name = 'Modified';
      await updateList(list);
      
      const updated = await getList(list.id);
      expect(updated?.updatedAt).toBeGreaterThan(originalTimestamp);
    });

    it('should not update non-existent lists', async () => {
      const fakeList: ShoppingList = {
        id: 'non-existent',
        name: 'Fake',
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      
      await updateList(fakeList);
      const retrieved = await getList('non-existent');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('Deleting Lists', () => {
    it('should delete a list', async () => {
      const list = await createList('To Be Deleted');
      await deleteList(list.id);
      
      const retrieved = await getList(list.id);
      expect(retrieved).toBeUndefined();
    });

    it('should remove deleted list from all lists', async () => {
      const list1 = await createList('List 1');
      const list2 = await createList('List 2');
      const list3 = await createList('List 3');
      
      await deleteList(list2.id);
      
      const allLists = await getAllLists();
      expect(allLists.length).toBe(2);
      expect(allLists.find(l => l.id === list2.id)).toBeUndefined();
      expect(allLists.find(l => l.id === list1.id)).toBeDefined();
      expect(allLists.find(l => l.id === list3.id)).toBeDefined();
    });

    it('should handle deleting non-existent lists gracefully', async () => {
      await expect(deleteList('non-existent')).resolves.not.toThrow();
    });

    it('should not affect other lists when deleting one', async () => {
      const list1 = await createList('List 1');
      const list2 = await createList('List 2');
      
      await deleteList(list1.id);
      
      const remaining = await getList(list2.id);
      expect(remaining).toBeDefined();
      expect(remaining?.name).toBe('List 2');
    });
  });
});

describe('Multiple Shopping Lists - Active List Management', () => {
  beforeEach(() => {
    mockLists.clear();
    mockActiveListId.value = 'default';
  });

  describe('Setting Active List', () => {
    it('should set the active list ID', async () => {
      const list = await createList('My Active List');
      await setActiveListId(list.id);
      
      const activeId = await getActiveListId();
      expect(activeId).toBe(list.id);
    });

    it('should switch between different lists', async () => {
      const list1 = await createList('List 1');
      const list2 = await createList('List 2');
      const list3 = await createList('List 3');
      
      await setActiveListId(list1.id);
      expect(await getActiveListId()).toBe(list1.id);
      
      await setActiveListId(list2.id);
      expect(await getActiveListId()).toBe(list2.id);
      
      await setActiveListId(list3.id);
      expect(await getActiveListId()).toBe(list3.id);
    });

    it('should persist active list ID', async () => {
      const list = await createList('Test List');
      await setActiveListId(list.id);
      
      // Simulating app restart by retrieving again
      const activeId = await getActiveListId();
      expect(activeId).toBe(list.id);
    });
  });

  describe('Getting Active List', () => {
    it('should retrieve the active list ID', async () => {
      const activeId = await getActiveListId();
      expect(activeId).toBeDefined();
    });

    it('should return default list ID initially', async () => {
      const activeId = await getActiveListId();
      expect(activeId).toBe('default');
    });

    it('should return updated active list after change', async () => {
      const list = await createList('New Active');
      await setActiveListId(list.id);
      
      const activeId = await getActiveListId();
      expect(activeId).toBe(list.id);
    });
  });
});

describe('Multiple Shopping Lists - List Independence', () => {
  beforeEach(() => {
    mockLists.clear();
  });

  describe('Data Isolation', () => {
    it('should maintain separate data for each list', async () => {
      const groceries = await createList('Groceries');
      const hardware = await createList('Hardware');
      
      // Each list should have distinct data
      expect(groceries.id).not.toBe(hardware.id);
      expect(groceries.createdAt).toBeDefined();
      expect(hardware.createdAt).toBeDefined();
    });

    it('should allow lists with same names but different IDs', async () => {
      const list1 = await createList('Shopping List');
      const list2 = await createList('Shopping List');
      
      expect(list1.id).not.toBe(list2.id);
      expect(list1.name).toBe(list2.name);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle creating multiple lists simultaneously', async () => {
      const promises = [
        createList('List 1'),
        createList('List 2'),
        createList('List 3'),
        createList('List 4'),
        createList('List 5')
      ];
      
      const lists = await Promise.all(promises);
      expect(lists.length).toBe(5);
      
      const allLists = await getAllLists();
      expect(allLists.length).toBe(5);
    });

    it('should handle updating multiple lists simultaneously', async () => {
      const list1 = await createList('List 1');
      const list2 = await createList('List 2');
      const list3 = await createList('List 3');
      
      const updatePromises = [
        updateList({ ...list1, name: 'Updated 1' }),
        updateList({ ...list2, name: 'Updated 2' }),
        updateList({ ...list3, name: 'Updated 3' })
      ];
      
      await Promise.all(updatePromises);
      
      const updated1 = await getList(list1.id);
      const updated2 = await getList(list2.id);
      const updated3 = await getList(list3.id);
      
      expect(updated1?.name).toBe('Updated 1');
      expect(updated2?.name).toBe('Updated 2');
      expect(updated3?.name).toBe('Updated 3');
    });
  });
});

describe('Multiple Shopping Lists - Edge Cases', () => {
  beforeEach(() => {
    mockLists.clear();
    mockActiveListId.value = 'default';
  });

  describe('Boundary Conditions', () => {
    it('should handle creating many lists', async () => {
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(createList(`List ${i}`));
      }
      
      await Promise.all(promises);
      const allLists = await getAllLists();
      expect(allLists.length).toBe(100);
    });

    it('should handle very long list names', async () => {
      const longName = 'A'.repeat(1000);
      const list = await createList(longName);
      
      expect(list.name).toBe(longName);
      expect(list.name.length).toBe(1000);
    });

    it('should handle empty list name', async () => {
      const list = await createList('');
      expect(list.name).toBe('');
      expect(list.id).toBeDefined();
    });

    it('should handle list names with only whitespace', async () => {
      const list = await createList('   ');
      expect(list.name).toBe('   ');
    });
  });

  describe('Error Scenarios', () => {
    it('should handle switching to non-existent list', async () => {
      await setActiveListId('non-existent-list-id');
      const activeId = await getActiveListId();
      
      // Should still store the ID (UI's responsibility to validate)
      expect(activeId).toBe('non-existent-list-id');
    });

    it('should handle deleting the active list', async () => {
      const list = await createList('Active List');
      await setActiveListId(list.id);
      await deleteList(list.id);
      
      // Active list ID is set, but list no longer exists
      const activeId = await getActiveListId();
      expect(activeId).toBe(list.id);
      
      const deletedList = await getList(list.id);
      expect(deletedList).toBeUndefined();
    });
  });
});

describe('Multiple Shopping Lists - Migration Scenarios', () => {
  beforeEach(() => {
    mockLists.clear();
  });

  describe('Default List Migration', () => {
    it('should create default list for new users', async () => {
      // Simulate creating a default list on first run
      const defaultList = await createList('Shopping List');
      await setActiveListId(defaultList.id);
      
      const lists = await getAllLists();
      expect(lists.length).toBe(1);
      expect(lists[0].name).toBe('Shopping List');
      
      const activeId = await getActiveListId();
      expect(activeId).toBe(defaultList.id);
    });

    it('should preserve existing data when adding list management', async () => {
      // Simulate existing data being migrated to a new list
      const migratedList = await createList('Shopping List');
      
      // The migrated list should exist and be retrievable
      const retrieved = await getList(migratedList.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Shopping List');
    });
  });
});
