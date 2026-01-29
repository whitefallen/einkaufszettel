/**
 * Tests for state management module
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { StateManager } from '../src/state';

describe('StateManager', () => {
  let stateManager: StateManager;

  beforeEach(() => {
    stateManager = new StateManager();
  });

  it('should add items to the list', () => {
    const id = stateManager.addItem('Milk');
    const items = stateManager.getItems();
    
    expect(items.length).toBe(1);
    expect(items[0].id).toBe(id);
    expect(items[0].text).toBe('Milk');
    expect(items[0].completed).toBe(false);
  });

  it('should toggle item completion', () => {
    const id = stateManager.addItem('Bread');
    stateManager.toggleItem(id);
    
    const items = stateManager.getItems();
    expect(items[0].completed).toBe(true);
    
    stateManager.toggleItem(id);
    const items2 = stateManager.getItems();
    expect(items2[0].completed).toBe(false);
  });

  it('should delete items', () => {
    const id = stateManager.addItem('Eggs');
    expect(stateManager.getItems().length).toBe(1);
    
    stateManager.deleteItem(id);
    expect(stateManager.getItems().length).toBe(0);
  });

  it('should clear completed items', () => {
    const id1 = stateManager.addItem('Item 1');
    const id2 = stateManager.addItem('Item 2');
    const id3 = stateManager.addItem('Item 3');
    
    stateManager.toggleItem(id1);
    stateManager.toggleItem(id3);
    
    stateManager.clearCompleted();
    const items = stateManager.getItems();
    
    expect(items.length).toBe(1);
    expect(items[0].id).toBe(id2);
  });

  it('should notify listeners on state change', () => {
    let notified = false;
    stateManager.subscribe(() => {
      notified = true;
    });
    
    stateManager.addItem('Test');
    expect(notified).toBe(true);
  });

  it('should allow unsubscribing listeners', () => {
    let count = 0;
    const unsubscribe = stateManager.subscribe(() => {
      count++;
    });
    
    stateManager.addItem('Test 1');
    expect(count).toBe(1);
    
    unsubscribe();
    stateManager.addItem('Test 2');
    expect(count).toBe(1); // Should not increment
  });
});
